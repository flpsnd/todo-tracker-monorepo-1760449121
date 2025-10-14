import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { ConvexClientProvider } from "@/lib/convex-provider"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "Simple Notes App",
  description: "A minimalistic note-taking application",
  icons: {
    icon: "/notes.jpg",
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
      </body>
    </html>
  )
}
