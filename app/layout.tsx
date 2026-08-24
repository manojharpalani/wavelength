import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wavelength",
  description:
    'Wavelength: build a shareable "how I work" guide in five minutes, so teammates stop guessing and collaboration gets smoother.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Newsreader:wght@500;600&family=Work+Sans:wght@400;500;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
