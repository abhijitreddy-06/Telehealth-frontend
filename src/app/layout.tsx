import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-logo",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "TeleHealthx - Virtual Healthcare Solutions",
  description:
    "Modern healthcare, anytime. Book appointments and consult doctors online with secure video consultations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${plusJakarta.variable} ${spaceGrotesk.variable} font-sans antialiased`}
      >
        <div className="site-background" aria-hidden="true" />
        <div className="site-content">
          {children}
        </div>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
