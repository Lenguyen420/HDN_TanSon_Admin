import type { Metadata } from "next";
import AuthRefreshScheduler from "@/components/auth/AuthRefreshScheduler";
import ToastProvider from "@/components/shared/notifications/ToastProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Quản trị · Hội Doanh nghiệp Phường Tân Sơn",
    template: "%s · Hội Doanh nghiệp Tân Sơn",
  },
  description:
    "Cổng quản trị Hội Doanh nghiệp Phường Tân Sơn. Trách nhiệm - Sẵn sàng - Vươn mình.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthRefreshScheduler />
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
