import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Inter, Roboto_Mono } from "next/font/google";

const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WhosNext - Best Omegle Alternative | Free Random Video Chat",
  description: "The best Omegle alternative for random video chat. Connect instantly with strangers worldwide. No registration, completely free, safe and secure. Better than Omegle with HD video quality.",
  keywords: [
    "omegle alternative",
    "omegle",
    "random video chat",
    "free video chat",
    "stranger chat",
    "webcam chat",
    "video chat online",
    "chat with strangers",
    "random chat",
    "omegle like sites",
    "chatroulette alternative",
    "anonymous video chat",
    "instant video chat",
    "online video chat",
    "meet strangers online"
  ],
  authors: [{ name: "WhosNext Team" }],
  creator: "WhosNext",
  publisher: "WhosNext",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://whosnext.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "WhosNext - Best Omegle Alternative | Free Random Video Chat",
    description: "The best Omegle alternative for random video chat. Connect instantly with strangers worldwide. No registration, completely free, safe and secure.",
    url: 'https://whosnext.com',
    siteName: 'WhosNext',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'WhosNext - Best Omegle Alternative',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "WhosNext - Best Omegle Alternative | Free Random Video Chat",
    description: "The best Omegle alternative for random video chat. Connect instantly with strangers worldwide. No registration required.",
    images: ['/og-image.jpg'],
    creator: '@whosnext',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    yahoo: 'your-yahoo-verification-code',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover'
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="canonical" href="https://whosnext.com" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="WhosNext" />
        
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "WhosNext - Best Omegle Alternative",
              "description": "The best Omegle alternative for random video chat. Connect instantly with strangers worldwide.",
              "url": "https://whosnext.com",
              "applicationCategory": "SocialNetworkingApplication",
              "operatingSystem": "Any",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "featureList": [
                "Random video chat",
                "Free forever",
                "No registration required",
                "HD video quality",
                "Global reach",
                "Anonymous chatting"
              ]
            })
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
