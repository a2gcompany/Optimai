import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Optimai Dashboard',
  description: 'Centro de control personal - Tareas, Finanzas y Métricas',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {children}
      </body>
    </html>
  );
}
