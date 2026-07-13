const express = require("express");
const router = express.Router();
const db = require("../db");

// ==========================================
// 1. 本番用のAPI
// ==========================================

// GET /transactions (全データの取得)
router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM Transactions ORDER BY created_at DESC",
    );
    res.json(result.rows);
  } catch (error) {
    console.error("DB取得エラー:", error);
    res.status(500).json({ error: "データの取得に失敗しました" });
  }
});

// POST /transactions (登録)
router.post("/", async (req, res) => {
  const { user_id, amount, transaction_type, category } = req.body;
  try {
    const query = `
            INSERT INTO Transactions (user_id, amount, transaction_type, category, transaction_date)
            VALUES ($1, $2, $3, $4, CURRENT_DATE)
        `;
    const values = [user_id, amount, transaction_type, category];
    await db.query(query, values);
    res.json({ message: "本物のDBに収支データを登録しました！" });
  } catch (error) {
    console.error("DB登録エラー:", error);
    res.status(500).json({ error: "データの登録に失敗しました" });
  }
});

// ==========================================
// 2. 開発用の一時的なAPI（裏技URL）
// ==========================================

// 【一時的】テーブル作成
router.get("/init-db", async (req, res) => {
  try {
    await db.query(`
            CREATE TABLE IF NOT EXISTS Users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                username VARCHAR(50) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
    await db.query(`
            CREATE TABLE IF NOT EXISTS CreditCards (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
                card_name VARCHAR(100) NOT NULL,
                closing_day INT,
                payment_day INT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
    await db.query(`
            CREATE TABLE IF NOT EXISTS Subscriptions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
                card_id UUID REFERENCES CreditCards(id) ON DELETE SET NULL,
                service_name VARCHAR(100) NOT NULL,
                amount NUMERIC(10, 2) NOT NULL,
                billing_cycle VARCHAR(20) DEFAULT 'monthly',
                next_billing_date DATE NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
    await db.query(`
            CREATE TABLE IF NOT EXISTS Transactions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
                card_id UUID REFERENCES CreditCards(id) ON DELETE SET NULL,
                subscription_id UUID REFERENCES Subscriptions(id) ON DELETE SET NULL,
                amount NUMERIC(10, 2) NOT NULL,
                transaction_type VARCHAR(20) NOT NULL,
                category VARCHAR(50) NOT NULL,
                transaction_date DATE NOT NULL,
                description TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
    res.send(
      "すべてのテーブルの作成に大成功しました！これで準備万端です！🦖🎉",
    );
  } catch (error) {
    console.error("エラー:", error);
    res
      .status(500)
      .send("テーブル作成でエラーが発生しました: " + error.message);
  }
});

// 【一時的】テストユーザー作成
router.get("/setup-user", async (req, res) => {
  try {
    await db.query(`
            INSERT INTO Users (id, username, email, password_hash)
            VALUES ('123e4567-e89b-12d3-a456-426614174000', 'テストユーザー', 'test@example.com', 'dummy_hash')
            ON CONFLICT (id) DO NOTHING;
        `);
    res.send("テストユーザーの作成に大成功しました！🎉");
  } catch (error) {
    console.error("エラー:", error);
    res.status(500).send("エラーが発生しました: " + error.message);
  }
});

// ⚠️ ここが一番下にあることが必須条件です
module.exports = router;
