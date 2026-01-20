import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Optimai Core',
  description: 'Personal AI assistant - Telegram bot backend',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
