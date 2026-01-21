// Test Telegram Bot connection

const BOT_TOKEN = '8006419019:AAES5tgARSjF75gJpdD9Gz4v0Ur_YDXimO4';

async function getMe() {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
  const data = await res.json();
  console.log('Bot info:', data);
  return data;
}

async function getWebhookInfo() {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
  const data = await res.json();
  console.log('Webhook info:', data);
  return data;
}

async function setWebhook(url) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  console.log('Set webhook result:', data);
  return data;
}

async function main() {
  console.log('='.repeat(50));
  console.log('Telegram Bot Test');
  console.log('='.repeat(50));

  // Get bot info
  console.log('\n1. Getting bot info...');
  await getMe();

  // Get webhook info
  console.log('\n2. Getting webhook info...');
  await getWebhookInfo();

  // If you want to set webhook, uncomment:
  // const webhookUrl = 'https://your-domain.vercel.app/api/telegram/webhook';
  // console.log('\n3. Setting webhook...');
  // await setWebhook(webhookUrl);

  console.log('\n' + '='.repeat(50));
  console.log('Test complete!');
}

main().catch(console.error);
