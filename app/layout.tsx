import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

import SideNav from "@/components/SideNav";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "HealthMate",
  description: "A personalized medical system using AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} antialiased bg-gray-50`}>
        <div className="flex min-h-screen">
          <SideNav />
          <main className="flex-1 md:ml-64 pb-20 md:pb-0">
            {children}
          </main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
