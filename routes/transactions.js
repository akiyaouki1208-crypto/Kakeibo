const express = require("express");
const router = express.Router();
const db = require("../db");

// ==========================================
// 1. 本番用のAPI
// ==========================================

// GET /transactions (全データの取得)
// 変更前： router.get('/', async (req, res) => { ...
// 👇 変更後：
router.get("/", async (req, res) => {
  const userId = req.query.user_id; // フロントエンドから送られてきたIDを受け取る
  try {
    const result = await db.query(
      "SELECT * FROM Transactions WHERE user_id = $1 ORDER BY transaction_date DESC",
      [userId], // そのIDのデータだけを絞り込む
    );
    res.json(result.rows);
  } catch (error) {
    console.error("DB取得エラー:", error);
    res.status(500).json({ error: "データの取得に失敗しました" });
  }
});

// POST /transactions (通常の収支登録)
router.post("/", async (req, res) => {
  // 👇 受け取るデータに transaction_date を追加しました
  const { user_id, amount, transaction_type, category, transaction_date } =
    req.body;
  try {
    const query = `
            INSERT INTO Transactions (user_id, amount, transaction_type, category, transaction_date)
            VALUES ($1, $2, $3, $4, $5)
        `;
    // 👇 日付が送られてきたらそれを使い、無ければ今日の日付を入れる安全設計です
    const values = [
      user_id,
      amount,
      transaction_type,
      category,
      transaction_date || new Date(),
    ];
    await db.query(query, values);
    res.json({ message: "収支データを登録しました！" });
  } catch (error) {
    console.error("DB登録エラー:", error);
    res.status(500).json({ error: "データの登録に失敗しました" });
  }
});

// 👇 今回追加するサブスク登録用の窓口 👇
// POST /transactions/subscription (サブスク登録)
router.post("/subscription", async (req, res) => {
  const { user_id, service_name, amount, billing_day } = req.body;
  try {
    // 現在の日付から「次の引き落とし日(next_billing_date)」を自動計算するロジック
    const today = new Date();
    let nextDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      parseInt(billing_day),
    );

    // もし今月の引き落とし日がすでに過ぎていたら、来月に設定する
    if (nextDate <= today) {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }

    const query = `
            INSERT INTO Subscriptions (user_id, service_name, amount, billing_cycle, next_billing_date)
            VALUES ($1, $2, $3, 'monthly', $4)
        `;
    const values = [user_id, service_name, amount, nextDate];
    await db.query(query, values);

    res.json({ message: "サブスクの登録に成功しました！" });
  } catch (error) {
    console.error("サブスク登録エラー:", error);
    res.status(500).json({ error: "サブスクの登録に失敗しました" });
  }
});

// 変更前： router.get('/subscriptions', async (req, res) => { ...
// 👇 変更後：
router.get("/subscriptions", async (req, res) => {
  const userId = req.query.user_id; // フロントエンドから送られてきたIDを受け取る
  try {
    const result = await db.query(
      "SELECT * FROM Subscriptions WHERE user_id = $1 ORDER BY created_at DESC",
      [userId], // そのIDのデータだけを絞り込む
    );
    res.json(result.rows);
  } catch (error) {
    console.error("サブスク取得エラー:", error);
    res.status(500).json({ error: "サブスクデータの取得に失敗しました" });
  }
});

// ==========================================
// 2. 開発用の一時的なAPI
// ==========================================
router.get("/init-db", async (req, res) => {
  /* 省略（そのまま残してください） */
});
router.get("/setup-user", async (req, res) => {
  /* 省略（そのまま残してください） */
});

module.exports = router;
