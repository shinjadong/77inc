import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { ThemeProvider } from "@/lib/theme-provider";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChatSidebarProvider, ChatSidebar, ChatSidebarToggle } from "@/components/chat-sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "칠칠기업 법인카드 관리",
  description: "법인카드 청구명세서 자동 매칭 및 관리 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider defaultTheme="system">
          <Providers>
            <ChatSidebarProvider>
              <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
                <Sidebar />
                <main className="flex-1 overflow-auto md:ml-0">
                  {children}
                </main>
                <ChatSidebar />
                <ChatSidebarToggle />
              </div>
            </ChatSidebarProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
