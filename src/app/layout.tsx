import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/bricolage-grotesque/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Future You",
  description: "See how today’s money decisions could change your future."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
