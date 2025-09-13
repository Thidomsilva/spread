import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Calculadora de Arbitragem',
  description: 'Calcule o spread e oportunidades de arbitragem entre exchanges.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased flex items-center justify-center min-h-screen p-4">
        {children}
      </body>
    </html>
  );
}
