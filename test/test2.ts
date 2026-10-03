const port = process.env.PORT;
const host = process.env.HOST;
const databaseUrl = process.env.DATABASE_URL;

// デフォルト値あり
const nodeEnv = process.env.NODE_ENV || "development";

// 同じ環境変数を複数回使用
const portAgain = process.env.PORT;

// 条件式で使用
if (process.env.DEBUG === "true") {
  console.log("Debug mode");
}

// 関数内で使用
function connect() {
  const apiKey = process.env.API_KEY;
}
