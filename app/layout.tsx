import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Suspense } from "react"
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"
import LocationPreservationWrapper from "@/components/location-preservation-wrapper"
import PWAInstaller from "@/components/pwa-installer"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Protector.Ng - Executive Protection Services",
  description: "Professional executive protection services with real-time tracking and secure payments",
  generator: "Next.js",
  manifest: "/manifest.json",
  icons: {
    icon: "/images/PRADO/slideshow/logo.PNG",
    apple: "/images/PRADO/slideshow/logo.PNG",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Protector.Ng",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Protector.Ng",
    title: "Protector.Ng - Executive Protection Services",
    description: "Professional executive protection services with real-time tracking and secure payments",
  },
  twitter: {
    card: "summary",
    title: "Protector.Ng - Executive Protection Services",
    description: "Professional executive protection services with real-time tracking and secure payments",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1e40af",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans leading-7 ${inter.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <div className="text-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading PROTECTOR.NG...</p>
              </div>
            </div>
          }>
            <LocationPreservationWrapper>
              {children}
              <Toaster />
              <Sonner />
              <PWAInstaller />
            </LocationPreservationWrapper>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  )
}
