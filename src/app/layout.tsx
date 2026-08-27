import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--fy-font-bricolage-grotesque"
});

export const metadata: Metadata = {
  title: "Future You",
  description: "See how today’s money decisions could change your future."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en-GB" className={bricolageGrotesque.variable}>
      <body>{children}</body>
    </html>
  );
}
