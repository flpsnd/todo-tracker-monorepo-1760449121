import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { ConvexClientProvider } from "@/lib/convex-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Suspense } from "react"
import { Databuddy } from '@databuddy/sdk/react'
import "./globals.css"

export const metadata: Metadata = {
  title: "Caalm",
  description: "A suite of thoughtfully crafted productivity tools designed for focus, simplicity, and calm.",
  icons: {
    icon: "/caalml.jpg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={null}>
          <ConvexClientProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              {children}
            </ThemeProvider>
          </ConvexClientProvider>
        </Suspense>
        <Analytics />
        <Databuddy
          clientId="Ist1zm3jrC2tx2VDD8bRp"
          trackHashChanges={true}
          trackAttributes={true}
          trackInteractions={true}
          trackEngagement={true}
          trackScrollDepth={true}
          trackBounceRate={true}
          trackWebVitals={true}
          enableBatching={true}
        />
      </body>
    </html>
  )
}
