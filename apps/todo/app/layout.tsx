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
  title: "Simple Todo App",
  description: "A modern, drag-and-drop todo application",
  icons: {
    icon: "/minimaltodo.jpg",
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
