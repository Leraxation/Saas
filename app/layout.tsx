import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Outlook Dashboard",
  description: "Your personal Outlook productivity hub",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
