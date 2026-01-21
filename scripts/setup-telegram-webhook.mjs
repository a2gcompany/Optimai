#!/usr/bin/env node
// Script to set up Telegram webhook

const TELEGRAM_BOT_TOKEN = '8006419019:AAES5tgARSjF75gJpdD9Gz4v0Ur_YDXimO4';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'info';

  const baseUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

  switch (command) {
    case 'set': {
      const webhookUrl = args[1];
      if (!webhookUrl) {
        console.error('Usage: node setup-telegram-webhook.mjs set <webhook-url>');
        console.error('Example: node setup-telegram-webhook.mjs set https://your-app.vercel.app/api/telegram/webhook');
        process.exit(1);
      }

      console.log(`Setting webhook to: ${webhookUrl}`);

      const response = await fetch(`${baseUrl}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query'],
        }),
      });

      const data = await response.json();
      console.log('Response:', JSON.stringify(data, null, 2));
      break;
    }

    case 'delete': {
      console.log('Deleting webhook...');

      const response = await fetch(`${baseUrl}/deleteWebhook`, {
        method: 'POST',
      });

      const data = await response.json();
      console.log('Response:', JSON.stringify(data, null, 2));
      break;
    }

    case 'info':
    default: {
      console.log('Getting webhook info...');

      const response = await fetch(`${baseUrl}/getWebhookInfo`);
      const data = await response.json();

      console.log('\nWebhook Info:');
      console.log('=============');
      if (data.ok && data.result) {
        const info = data.result;
        console.log(`URL: ${info.url || '(not set)'}`);
        console.log(`Pending updates: ${info.pending_update_count}`);
        if (info.last_error_date) {
          console.log(`Last error: ${new Date(info.last_error_date * 1000).toISOString()}`);
          console.log(`Error message: ${info.last_error_message}`);
        }
        console.log(`Allowed updates: ${info.allowed_updates?.join(', ') || 'all'}`);
      } else {
        console.log('Error:', data);
      }

      // Get bot info
      const meResponse = await fetch(`${baseUrl}/getMe`);
      const meData = await meResponse.json();

      if (meData.ok && meData.result) {
        console.log('\nBot Info:');
        console.log('=========');
        console.log(`Username: @${meData.result.username}`);
        console.log(`Name: ${meData.result.first_name}`);
        console.log(`ID: ${meData.result.id}`);
        console.log(`Can join groups: ${meData.result.can_join_groups}`);
      }
      break;
    }
  }
}

main().catch(console.error);
