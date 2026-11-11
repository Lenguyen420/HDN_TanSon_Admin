import type { Metadata } from "next";
import AuthRefreshScheduler from "@/components/auth/AuthRefreshScheduler";
import "./globals.css";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Admin dashboard overview page",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthRefreshScheduler />
        {children}
      </body>
    </html>
  );
}
