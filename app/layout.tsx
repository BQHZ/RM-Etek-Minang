import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Providers from "@/components/providers"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "RM. Etek Minang - POS System",
  description: "Point of Sale system for Rumah Makan Etek Minang",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
