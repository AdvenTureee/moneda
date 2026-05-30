import type { Metadata, Viewport } from 'next';
import { DM_Sans, Epilogue } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const epilogue = Epilogue({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Moneda - Seu dinheiro, finalmente claro.',
  description: 'Controle seus gastos de forma simples e sem julgamentos.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8F9FB' },
    { media: '(prefers-color-scheme: dark)', color: '#10151C' },
  ],
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

const themeScript = `
(() => {
  try {
    const theme = window.localStorage.getItem('moneda-theme');
    document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
  } catch {
    document.documentElement.dataset.theme = 'light';
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${dmSans.variable} ${epilogue.variable}`}
      data-theme="light"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="apple-touch-icon" sizes="192x192" href="/moico-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/moico-512.png" />
      </head>
      <body className="bg-[#F8F9FB] min-h-full antialiased font-body">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
