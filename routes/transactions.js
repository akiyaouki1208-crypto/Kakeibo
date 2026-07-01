const express = require("express");
const router = express.Router();
const db = require("../db");
const { processSubscriptions } = require("../services/subscription");

// POST /transactions (新しい収支の登録)
router.post("/", async (req, res) => {
  const { user_id, amount, transaction_type, category } = req.body;
  // 本来はここにDBへINSERTする処理を書きます
  res.json({ message: "収支データを登録しました！" });
});

// GET /transactions/check-subs (サブスク処理を手動でテスト起動する用)
router.get("/check-subs", async (req, res) => {
  const result = await processSubscriptions();
  res.json(result);
});

module.exports = router;
