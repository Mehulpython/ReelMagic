import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ReelMagic — AI Video Ad Generator",
  description: "Turn ideas into viral video ads in seconds. AI-powered video generation for memes, political ads, product promos and more.",
  keywords: ["AI", "video", "ad generator", "video ads", "marketing", "AI video"],
  openGraph: {
    title: "ReelMagic — AI Video Ad Generator",
    description: "Turn ideas into viral video ads in seconds.",
    type: "website",
    url: "https://reelmagic.ai",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased noise-overlay`}>
        <div className="relative flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
