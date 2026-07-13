const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// JSONを受け取る設定
app.use(cors());
app.use(express.json());

app.use(express.static("public"));

// ルーティング（窓口の接続）
// ここが正しく設定されていないと Cannot GET になります
const transactionsRouter = require("./routes/transactions");
app.use("/transactions", transactionsRouter);

// サーバー起動
app.listen(port, () => {
  console.log(`サーバーが起動しました: http://localhost:${port}`);
});
