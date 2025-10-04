import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Suspense } from "react"
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"
import LocationPreservationWrapper from "@/components/location-preservation-wrapper"
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
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
          <LocationPreservationWrapper>
            <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
            <Toaster />
            <Sonner />
          </LocationPreservationWrapper>
        </ThemeProvider>
      </body>
    </html>
  )
}
