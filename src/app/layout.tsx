import type { Metadata, Viewport } from 'next';
import { DM_Sans, Epilogue } from 'next/font/google';
import PWARegistrar from '@/components/PWARegistrar';
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
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
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
      </head>
      <body className="bg-[#F8F9FB] min-h-full antialiased font-body">
        <ThemeProvider>
          <PWARegistrar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
