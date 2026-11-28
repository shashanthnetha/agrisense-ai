import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Newsreader, Geist_Mono } from "next/font/google";
import "./globals.css";

const ui = Instrument_Sans({ variable: "--font-ui", subsets: ["latin"], weight: ["400", "500"] });
const display = Newsreader({ variable: "--font-display", subsets: ["latin"], weight: ["400", "500"], style: ["normal"] });
const meta = Geist_Mono({ variable: "--font-meta", subsets: ["latin"], weight: ["400"] });

export const metadata: Metadata = {
  title: "AgriSense AI | Crop disease check from a photo",
  description: "Photograph a crop leaf and get an AI-assisted field report with the likely disease, visible findings and prevention. Treatment is referred to a local agriculture officer for confirmation.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f2e9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${ui.variable} ${display.variable} ${meta.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
