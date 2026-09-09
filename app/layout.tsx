import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthProvider";

const title = "Wavelength";
const description =
  "Wavelength: build your team's shared working agreement together. Every teammate starts with a few honest answers about how they work — better trust, better collaboration, better relationships.";

export const metadata: Metadata = {
  metadataBase: new URL("https://wavelength-iota-two.vercel.app"),
  title,
  description,
  openGraph: { title, description, type: "website" },
  twitter: { card: "summary_large_image", title, description },
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
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
