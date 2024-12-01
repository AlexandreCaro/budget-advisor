"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Clock, 
  CreditCard, 
  Folder, 
  LayoutDashboard,
  Menu,
  Settings, 
  HelpCircle,
  Tags,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const routes = [
    {
      label: 'Overview',
      icon: LayoutDashboard,
      href: '/dashboard',
    },
    {
      label: 'Transactions',
      icon: CreditCard,
      href: '/transactions',
    },
    {
      label: 'Budgets',
      icon: Folder,
      href: '/budgets',
    },
    {
      label: 'Categories',
      icon: Tags,
      href: '/categories',
    },
  ]

  const bottomRoutes = [
    {
      label: 'Support',
      icon: HelpCircle,
      href: '/support',
    },
    {
      label: 'Settings',
      icon: Settings,
      href: '/settings',
    },
  ]

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 md:hidden"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 z-40 h-full w-64 flex-col bg-card shadow-lg transition-transform duration-200 ease-in-out md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-14 items-center border-b px-3">
            <Link href="/" className="flex items-center gap-2">
              <Clock className="h-6 w-6" />
              <span className="font-semibold">Pitaka</span>
            </Link>
          </div>

          {/* Main Navigation */}
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="space-y-1 px-2">
              {routes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    pathname === route.href 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-muted"
                  )}
                >
                  <route.icon className="h-4 w-4" />
                  {route.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Bottom Navigation */}
          <div className="border-t p-2">
            <nav className="space-y-1">
              {bottomRoutes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    pathname === route.href 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-muted"
                  )}
                >
                  <route.icon className="h-4 w-4" />
                  {route.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

export default Sidebar 