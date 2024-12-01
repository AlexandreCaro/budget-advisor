import { Inter } from "next/font/google"
import { getServerSession } from "next-auth"
import AuthProvider from "@/components/providers/session-provider"
import Sidebar from "@/components/layout/sidebar"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider session={session}>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 md:pl-64">
              <div className="container mx-auto p-6">
                {children}
              </div>
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}

