import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/auth-provider'
import { UserNav } from '@/components/user-nav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Intuitive Web Trip Planner',
  description: 'Plan your trips with ease using our intuitive web-based trip planner.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-40 w-full border-b bg-background">
              <div className="container mx-auto px-4">
                <div className="flex h-16 items-center justify-between">
                  <div className="flex gap-6 md:gap-10">
                    <a href="/" className="flex items-center space-x-2">
                      <span className="inline-block font-bold">
                        Intuitive Web Trip Planner
                      </span>
                    </a>
                  </div>
                  <UserNav />
                </div>
              </div>
            </header>
            <main className="container mx-auto py-6 px-4 min-h-[calc(100vh-8rem)]">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </main>
            <footer className="border-t h-16">
              <div className="container mx-auto px-4 h-full">
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">
                    Built with love for intuitive trip planning.
                  </p>
                </div>
              </div>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}

