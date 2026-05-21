import type { Metadata, Viewport } from 'next';
import { DM_Sans, Epilogue } from 'next/font/google';
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
  title: 'Grana — Seu dinheiro, finalmente claro.',
  description: 'Controle seus gastos de forma simples e sem julgamentos.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#F8F9FB',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${dmSans.variable} ${epilogue.variable}`}>
      <body className="bg-[#F8F9FB] min-h-full antialiased font-body">
        {children}
      </body>
    </html>
  );
}
