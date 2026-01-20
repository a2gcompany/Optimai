export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Optimai Core</h1>
      <p>Telegram bot backend running.</p>
      <ul>
        <li><code>POST /api/telegram/webhook</code> - Telegram webhook endpoint</li>
        <li><code>GET /api/agent/cron</code> - Scheduled tasks runner</li>
      </ul>
    </main>
  );
}
