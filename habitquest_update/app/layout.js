import { Rajdhani, Noto_Sans_JP, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const rajdhani = Rajdhani({
  variable: '--font-rajdhani',
  weight: ['500', '600', '700'],
  subsets: ['latin'],
});

const notoSansJp = Noto_Sans_JP({
  variable: '--font-noto-sans-jp',
  weight: ['400', '500', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  weight: ['400', '500'],
  subsets: ['latin'],
});

export const metadata = {
  title: 'HabitQuest',
  description: '習慣を続けると、キャラが育つ。',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja" className={`${rajdhani.variable} ${notoSansJp.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-slate-950">{children}</body>
    </html>
  );
}

