import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Optimai Finance',
  description: 'Personal finance tracker with AI categorization',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
