import { Inter } from "next/font/google"
import { getServerSession } from "next-auth"
import AuthProvider from "@/components/providers/session-provider"
import { UIProvider } from "@/components/providers/ui-provider"
import { Header } from "@/components/layout/header"
import Sidebar from "@/components/layout/sidebar"
import "./globals.css"
import { FolderOpen, HomeIcon, MonitorIcon, MapIcon } from "lucide-react"

const inter = Inter({ subsets: ["latin"] })

const navigationItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: <HomeIcon className="h-4 w-4" />,
  },
  {
    title: "Trip Planner",
    href: "/trip-planner",
    icon: <MapIcon className="h-4 w-4" />,
  },
  {
    title: "Trip Monitor",
    href: "/trip-monitor",
    icon: <MonitorIcon className="h-4 w-4" />,
  },
  {
    title: "Categories",
    href: "/categories",
    icon: <FolderOpen className="h-4 w-4" />,
  },
];

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
          <UIProvider>
            <div className="relative min-h-screen">
              <Header />
              <div className="flex h-[calc(100vh-3.5rem)]">
                <Sidebar />
                <main className="flex-1 overflow-y-auto md:pl-64 bg-slate-100">
                  <div className="container mx-auto p-4 md:p-6">
                    {children}
                  </div>
                </main>
              </div>
            </div>
          </UIProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

