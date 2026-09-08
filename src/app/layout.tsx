import type { Metadata } from "next";
import { Montserrat, Geist_Mono } from "next/font/google";
import "./globals.css";

// MOX (mox-studio.ru) верстают на 'Monts' — геометрическом гротеске,
// близком к Montserrat. Своего 'Monts' у нас нет (проприетарный шрифт их
// билдера), поэтому берём ближайший открытый аналог с тем же характером.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Бюро переселения привидений",
  description: "Тестовое задание AI-first Developer, MOX",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${montserrat.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
