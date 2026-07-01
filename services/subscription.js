const db = require("../db");

// サブスクの引き落とし処理ロジック
const processSubscriptions = async () => {
  try {
    console.log("サブスクの自動引き落としチェックを開始します...");
    // ここにDBから「今日が支払日のサブスク」を取得して
    // Transactionsにマイナス処理を入れるSQLロジックを書いていきます

    return { success: true, message: "チェック完了" };
  } catch (error) {
    console.error("エラー発生:", error);
    throw error;
  }
};

module.exports = {
  processSubscriptions,
};
