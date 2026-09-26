import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Auth0Provider } from "@auth0/nextjs-auth0";
import "./globals.css";

// Atkinson Hyperlegible — designed by the Braille Institute for low-vision
// readability. Not a stylistic pick: this is an accessibility product, so
// the body/UI typeface should actually be built for accessibility.
import { Atkinson_Hyperlegible_Next } from "next/font/google";

const bodyFont = Atkinson_Hyperlegible_Next({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const monoFont = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Ottawa Voice",
  description:
    "Speak naturally about your situation and a real form fills in for you — modeled on the City of Ottawa's Hand in Hand recreation fee support program.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${monoFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Auth0Provider>{children}</Auth0Provider>
      </body>
    </html>
  );
}
