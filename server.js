const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./db");
const bcrypt = require("bcryptjs");

const app = express();
const port = process.env.PORT || 3000;

// JSONを受け取る設定
app.use(cors());
app.use(express.json());

app.use(express.static("public"));

// ルーティング（窓口の接続）
const transactionsRouter = require("./routes/transactions");
app.use("/transactions", transactionsRouter);

// ==========================================
// 認証用API
// ==========================================

// 1. データベースにログイン用の枠（カラム）を追加する準備
app.get("/init-auth", async (req, res) => {
  try {
    // まずは確実に必要な username と password を追加
    await db.query(
      `ALTER TABLE Users ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE;`,
    );
    await db.query(
      `ALTER TABLE Users ADD COLUMN IF NOT EXISTS password VARCHAR(255);`,
    );

    // 👇 emailのルール解除（エラーが出ても無視して進む安全設計）
    try {
      await db.query(`ALTER TABLE Users ALTER COLUMN email DROP NOT NULL;`);
    } catch (err) {
      console.log("ℹ️ email列の変更をスキップしました（影響ありません）");
    }

    // 👇 nameのルール解除（エラーが出ても無視して進む安全設計）
    try {
      await db.query(`ALTER TABLE Users ALTER COLUMN name DROP NOT NULL;`);
    } catch (err) {
      console.log("ℹ️ name列の変更をスキップしました（影響ありません）");
    }

    res.send("認証用テーブルの準備完了！🎉");
  } catch (error) {
    console.error("DB準備エラー:", error);
    // 画面に具体的なエラー原因を表示するように改良
    res.status(500).send("エラーが発生しました: " + error.message);
  }
});

// 2. 新規登録
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    // パスワードを暗号化（ハッシュ化）して保存
    const hashedPassword = await bcrypt.hash(password, 10);

    // 👇 password_hash という箱に入れるように修正！
    const result = await db.query(
      "INSERT INTO Users (username, password_hash) VALUES ($1, $2) RETURNING id",
      [username, hashedPassword],
    );
    res.json({ message: "登録成功", user_id: result.rows[0].id });
  } catch (error) {
    console.error("登録エラー:", error);
    res
      .status(500)
      .json({ error: "そのユーザー名はすでに使われている可能性があります" });
  }
});

// 3. ログイン
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    // ユーザー名で検索
    const result = await db.query("SELECT * FROM Users WHERE username = $1", [
      username,
    ]);
    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ error: "ユーザー名かパスワードが違います" });
    }

    // パスワードの答え合わせ
    const user = result.rows[0];

    // 👇 データベースから取り出すときも password_hash を使うように修正！
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res
        .status(401)
        .json({ error: "ユーザー名かパスワードが違います" });
    }

    // 成功したらその人のユーザーIDを返す
    res.json({ message: "ログイン成功", user_id: user.id });
  } catch (error) {
    console.error("ログインエラー:", error);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

// ==========================================
// 目標トラッカー用API
// ==========================================

// 👇 サーバー起動時に自動でテーブルを確認・作成する安全設計を追加！
db.query(
  `
  CREATE TABLE IF NOT EXISTS Goals (
    user_id UUID PRIMARY KEY,
    goal_name VARCHAR(255),
    target_amount INTEGER
  );
`,
)
  .then(() => console.log("🎯 目標(Goals)テーブルの準備完了！"))
  .catch((err) => console.error("目標テーブル準備エラー:", err));

// 1. 目標の取得
app.get("/goal", async (req, res) => {
  const userId = req.query.user_id;
  try {
    const result = await db.query("SELECT * FROM Goals WHERE user_id = $1", [
      userId,
    ]);
    res.json(result.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: "目標の取得に失敗しました" });
  }
});

// 2. 目標の保存・更新
app.post("/goal", async (req, res) => {
  const { user_id, goal_name, target_amount } = req.body;
  try {
    const query = `
      INSERT INTO Goals (user_id, goal_name, target_amount)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) DO UPDATE 
      SET goal_name = EXCLUDED.goal_name, target_amount = EXCLUDED.target_amount;
    `;
    await db.query(query, [user_id, goal_name, target_amount]);
    res.json({ message: "目標を保存しました！" });
  } catch (error) {
    // 👇 もしエラーが起きたら、ターミナルに詳細を出すように改良
    console.error("🎯 目標保存エラー:", error);
    res.status(500).json({ error: "目標の保存に失敗しました" });
  }
});

// サーバー起動
app.listen(port, () => {
  console.log(`サーバーが起動しました: http://localhost:${port}`);
});
