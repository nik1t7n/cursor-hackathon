// Mosquito Tycoon — Telegram bot (long-polling)
// Sends a web_app button, sets the menu button, handles /start and /top
import { readFileSync } from "fs";

try {
  const env = readFileSync(".env", "utf8");
  for (const line of env.split("\n")) {
    const [k, ...v] = line.split("=");
    if (k && v.length && !process.env[k.trim()]) {
      process.env[k.trim()] = v.join("=").trim();
    }
  }
} catch {}

const TOKEN = process.env.BOT_KEY;
if (!TOKEN) { console.error("BOT_KEY missing in .env"); process.exit(1); }

const API = `https://api.telegram.org/bot${TOKEN}`;
const APP_URL = "https://dev-mt.mrz.sh";

async function call(method, body = {}) {
  const r = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

// Set persistent menu button for ALL chats
async function setup() {
  const me = await call("getMe");
  console.log(`🤖 Bot: @${me.result?.username}`);

  await call("setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: "Play 🦟",
      web_app: { url: APP_URL },
    },
  });
  console.log("✅ Menu button set → " + APP_URL);
}

async function handleUpdate(update) {
  const msg = update.message;
  if (!msg) return;
  const chatId = msg.chat.id;
  const text = msg.text || "";

  if (text.startsWith("/start")) {
    await call("sendMessage", {
      chat_id: chatId,
      text: "🦟 *Mosquito Tycoon*\n\nYou are a mosquito. Your mission: ruin everyone's summer.\n\nTap the button below to start biting!",
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[
          { text: "Play 🦟 Bite Now", web_app: { url: APP_URL } },
        ]],
      },
    });
  }

  if (text.startsWith("/top")) {
    try {
      const r = await fetch("http://localhost:8080/api/leaderboard");
      const top = await r.json();
      if (!top.length) {
        await call("sendMessage", { chat_id: chatId, text: "No scores yet — be the first mosquito!" });
        return;
      }
      const lines = top.map((e, i) => `${i + 1}. ${e.name} — ${e.score.toLocaleString()} 🩸`).join("\n");
      await call("sendMessage", { chat_id: chatId, text: `🏆 Top Mosquitoes:\n\n${lines}` });
    } catch {
      await call("sendMessage", { chat_id: chatId, text: "Server offline, try later." });
    }
  }
}

// Long-polling loop
async function poll() {
  let offset = 0;
  console.log("🟢 Polling for updates...");
  while (true) {
    try {
      const data = await call("getUpdates", { offset, timeout: 30, allowed_updates: ["message"] });
      if (!data.ok) {
        // 409 Conflict = another instance running; wait and retry
        console.error("API error:", data.error_code, data.description);
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      if (data.result?.length) {
        for (const upd of data.result) {
          offset = upd.update_id + 1;
          handleUpdate(upd).catch(console.error);
        }
      }
    } catch (e) {
      console.error("Poll error:", e.message);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

setup().then(poll).catch(console.error);
