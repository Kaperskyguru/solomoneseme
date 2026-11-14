import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const TITLE = "Solomon Eseme";
const DESCRIPTION = "Founder of things on the internet. Software developer. Lagos, Nigeria.";

export const metadata: Metadata = {
  metadataBase: new URL("https://solomoneseme.com"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { type: "website", url: "/", siteName: TITLE, title: TITLE, description: DESCRIPTION, images: [{ url: "/img/headshot@2x.png", alt: TITLE }] },
  alternates: { canonical: "/" },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION, images: ["/img/headshot@2x.png"] },
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/img/icons/favicon.ico" },
      { url: "/img/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/img/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/img/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

const GA_ID = "G-SZJV1XR97S";

// Reference §16: Geist, weights 400 / 500 / 600 only.
const geist = Geist({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-geist-sans" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body>
        {children}
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="ga-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
        </Script>
      </body>
    </html>
  );
}
