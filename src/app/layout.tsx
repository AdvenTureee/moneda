import type { Metadata, Viewport } from 'next';
import { Inter, Sora } from 'next/font/google';
import ModalScrollLock from '@/components/ModalScrollLock';
import PWARegistrar from '@/components/PWARegistrar';
import SpeedInsightsClient from '@/components/SpeedInsightsClient';
import { ThemeProvider } from '@/components/ThemeProvider';
import TopLoaderClient from '@/components/TopLoaderClient';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Moneda - Seu dinheiro finalmente claro.',
  description: 'Controle seus gastos de forma simples e sem julgamentos.',
  manifest: '/manifest.json',
  applicationName: 'Moneda',
  appleWebApp: {
    capable: true,
    title: 'Moneda',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/moico-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/moico-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8F9FB' },
    { media: '(prefers-color-scheme: dark)', color: '#10151C' },
  ],
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
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
      className={`${inter.variable} ${sora.variable}`}
      data-theme="light"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-[var(--color-bg)] antialiased font-body">
        <TopLoaderClient />
        <ModalScrollLock />
        <ThemeProvider>
          <PWARegistrar />
          {children}
        </ThemeProvider>
        <SpeedInsightsClient />
      </body>
    </html>
  );
}
