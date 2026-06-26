import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { AppNav } from "@/components/app-nav";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Vowdise | Budget-first wedding planning",
  description:
    "A premium wedding planning MVP that helps couples discover vendors, plan budgets, and stay on track.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${cormorant.variable} bg-ivory font-sans text-charcoal antialiased`}>
        <AppNav />
        {children}
      </body>
    </html>
  );
}
