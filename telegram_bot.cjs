const https = require('https');

const token = '8604013743:AAH0VzPKvpBQ0em5wjQcT7LLzbaXY7vbQdg';
const webappUrl = process.argv[2];

if (!webappUrl) {
  console.error('\x1b[31mError: Please provide your secure HTTPS WebApp URL!\x1b[0m');
  console.log('Example: node telegram_bot.js https://abc-def.loca.lt');
  process.exit(1);
}

// Format URL correctly
const formattedUrl = webappUrl.startsWith('http') ? webappUrl : `https://${webappUrl}`;

console.log('\x1b[36m🦟 MOSQUITO TYCOON TELEGRAM BOT ACTIVE 🩸\x1b[0m');
console.log(`Bot: t.me/mosquito_tycoon_game_bot`);
console.log(`WebApp target URL: ${formattedUrl}`);
console.log('Listening for player events...');

let offset = 0;

function apiRequest(method, payload) {
  const data = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${token}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function handleUpdate(update) {
  if (!update.message || !update.message.text) return;
  
  const chatId = update.message.chat.id;
  const username = update.message.from.first_name || 'Ankle-Slacker';
  const text = update.message.text.trim();
  
  if (text.startsWith('/start')) {
    console.log(`[Interaction] User ${username} started the bot.`);
    
    const welcomeText = 
      `🦟 *MOSQUITO TYCOON* 🩸\n\n` +
      `Hey ${username}! Welcome to the ultimate summer slacking simulator!\n\n` +
      `Your mission is simple: bite Finn from Adventure Time, harvest Blood Coins, recruit your passive mosquito swarm, and trigger rare tropical tourist events!\n\n` +
      `Press the button below to launch the game inside Telegram, complete with *native haptic vibration feedback*!`;
      
    await apiRequest('sendMessage', {
      chat_id: chatId,
      text: welcomeText,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🦟 PLAY MOSQUITO TYCOON 🩸',
              web_app: { url: formattedUrl }
            }
          ]
        ]
      }
    });
  }
}

async function pollUpdates() {
  try {
    const res = await apiRequest('getUpdates', { offset, timeout: 30 });
    if (res.ok && res.result.length > 0) {
      for (const update of res.result) {
        offset = update.update_id + 1;
        await handleUpdate(update);
      }
    }
  } catch (e) {
    console.error('Polling error:', e.message);
  }
  
  // Continue polling
  setTimeout(pollUpdates, 500);
}

// Automatically configure the bot's Menu Button globally so it works persistent
apiRequest('setChatMenuButton', {
  menu_button: {
    type: 'web_app',
    text: 'Play Mosquito 🦟',
    web_app: { url: formattedUrl }
  }
}).then(res => {
  if (res.ok) {
    console.log('\x1b[32m[TMA Config] Persistent chat menu button installed!\x1b[0m');
  }
}).catch(e => console.error('Menu configuration failed:', e));

pollUpdates();
