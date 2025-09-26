import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';
import 'maplibre-gl/dist/maplibre-gl.css';

const dmSans = DM_Sans({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Atlas Studio',
  description: 'Create immersive, high-performance map experiences with ease.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${dmSans.className} min-h-screen antialiased`}>{children}</body>
    </html>
  );
}