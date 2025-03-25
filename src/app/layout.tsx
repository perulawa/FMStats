import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Music Listening History Analyzer',
  description: 'Analyze your music listening history from CSV files',
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