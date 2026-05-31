// Mosquito Tycoon game server — score storage + leaderboard
// Run: node server.js   (reads BOT_KEY from env for initData validation)
import express from "express";
import crypto from "crypto";
import { readFileSync } from "fs";

const app = express();
app.use(express.json());

// Load BOT_KEY from .env manually (no dotenv dep)
try {
  const env = readFileSync(".env", "utf8");
  for (const line of env.split("\n")) {
    const [k, ...v] = line.split("=");
    if (k && v.length && !process.env[k.trim()]) {
      process.env[k.trim()] = v.join("=").trim();
    }
  }
} catch {}

const BOT_TOKEN = process.env.BOT_KEY || "";

// Validate Telegram WebApp initData via HMAC-SHA256
function validateInitData(initData) {
  if (!BOT_TOKEN || !initData) return null;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;
    params.delete("hash");
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");
    const secretKey = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
    const expectedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
    if (expectedHash !== hash) return null;
    const user = params.get("user");
    return user ? JSON.parse(user) : { id: "anonymous" };
  } catch {
    return null;
  }
}

// In-memory leaderboard: userId -> {name, score}
const leaderboard = new Map();

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/score", (req, res) => {
  const { initData, score, name } = req.body || {};
  const user = validateInitData(initData);
  const userId = user?.id ?? "anon";
  const displayName = name || user?.first_name || "Mosquito";
  const current = leaderboard.get(userId);
  if (!current || score > current.score) {
    leaderboard.set(userId, { name: displayName, score: Number(score) || 0 });
  }
  res.json({ ok: true, best: leaderboard.get(userId).score });
});

app.get("/api/leaderboard", (_req, res) => {
  const top = [...leaderboard.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  res.json(top);
});

// Serve production build — all non-API routes → index.html
import { fileURLToPath } from "url";
import { dirname, join } from "path";
const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(express.static(join(__dirname, "dist")));
app.get("/{*path}", (_req, res) => res.sendFile(join(__dirname, "dist", "index.html")));

const PORT = 8080;
app.listen(PORT, () => console.log(`🦟 Game server → http://localhost:${PORT}`));
