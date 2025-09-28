import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import { Navigation } from "@/components/navigation";
import "./globals.css";

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const mono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Адаптивный дизайнер тестов",
  description:
    "Прототип фронтенда для оркестрации генерации тест-кейсов при помощи ИИ.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${sans.variable} ${mono.variable} antialiased bg-slate-50 text-slate-800`}
      >
        <Navigation />
        <main className="mx-auto min-h-[calc(100vh-96px)] w-full max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
