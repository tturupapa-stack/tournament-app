import type { Metadata } from "next"
import { Geist, Geist_Mono, Montserrat } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "e스포츠 토너먼트",
  description: "e스포츠 토너먼트 참가 신청 및 관리 시스템",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} antialiased min-h-screen bg-background`}
      >
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
