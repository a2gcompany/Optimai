export default function Home() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Optimai Finance</h1>
      <p>Personal finance tracker with AI categorization</p>
      <ul>
        <li>POST /api/upload - Upload CSV file for parsing</li>
        <li>GET /api/transactions - List transactions</li>
        <li>POST /api/transactions/categorize - AI categorization</li>
      </ul>
    </main>
  );
}
