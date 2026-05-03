import "./globals.css";
import type { Metadata } from "next";
import { JetBrains_Mono, Major_Mono_Display } from "next/font/google";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "700"],
});

const display = Major_Mono_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "VSMC // Visual Satellite Mission Control",
  description: "Live orbital telemetry for a curated set of Earth-observation, navigation, and communications satellites.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${mono.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
