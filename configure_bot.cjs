const https = require('https');

const token = '8604013743:AAH0VzPKvpBQ0em5wjQcT7LLzbaXY7vbQdg';
const webappUrl = process.argv[2];

if (!webappUrl) {
  console.error('\x1b[31mError: Please provide your secure HTTPS WebApp URL!\x1b[0m');
  console.log('Example: node configure_bot.js https://abc-def.loca.lt');
  process.exit(1);
}

const data = JSON.stringify({
  menu_button: {
    type: 'web_app',
    text: 'Play Mosquito 🦟',
    web_app: {
      url: webappUrl
    }
  }
});

const options = {
  hostname: 'api.telegram.org',
  port: 443,
  path: `/bot${token}/setChatMenuButton`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log(`Configuring bot t.me/mosquito_tycoon_game_bot Menu Button with URL: ${webappUrl}...`);

const req = https.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    const response = JSON.parse(responseData);
    if (response.ok) {
      console.log('\x1b[32mSUCCESS: Telegram Menu Button set up successfully!\x1b[0m');
      console.log('Open your Telegram app, search for @mosquito_tycoon_game_bot, and you will see the "Play Mosquito 🦟" button at the bottom left!');
    } else {
      console.error('\x1b[31mFailed to configure menu button:\x1b[0m', response.description);
    }
  });
});

req.on('error', (error) => {
  console.error('Request Error:', error);
});

req.write(data);
req.end();
