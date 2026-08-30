import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NexusDesk AI — Intelligent Remote Support & Diagnostics Platform",
  description:
    "Next-generation remote desktop platform with ultra low-latency WebRTC streaming and autonomous AI diagnostics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-[#06090e] text-slate-100 flex flex-col">
        {children}
      </body>
    </html>
  );
}
