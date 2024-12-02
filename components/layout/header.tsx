'use client'

import { useSession, signIn, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Moon, Sun } from "lucide-react"
import Link from "next/link"
import { useTheme } from "next-themes"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Icons } from "@/components/ui/icons"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useState } from "react"
import Image from 'next/image'
import { ConnectBankButton } from "@/components/bank-connection/connect-bank-button"

function getInitials(name: string | null | undefined): string {
  if (!name) return "U"
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getAvatarColor(name: string | null | undefined): string {
  if (!name) return "bg-primary"
  const colors = [
    "bg-red-500",
    "bg-green-500",
    "bg-blue-500",
    "bg-yellow-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
  ]
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[index % colors.length]
}

export function Header() {
  const { data: session, status } = useSession()
  const { setTheme, theme } = useTheme()
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handleSignIn = async (provider: string) => {
    try {
      setShowAuthDialog(false)
      await signIn(provider, {
        callbackUrl: window.location.origin,
        redirect: true,
      })
    } catch (error) {
      console.error('Sign in error:', error)
    }
  }

  const handleImageError = () => {
    setImageError(true)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-lg font-semibold">
            ChipTrip
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="relative"
          >
            {theme === "light" ? (
              <Sun className="h-5 w-5 text-orange-500 hover:text-orange-600 transition-colors" />
            ) : (
              <Moon className="h-5 w-5 text-slate-900 hover:text-slate-800 transition-colors" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>

          {status === 'loading' ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          ) : session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                  <Avatar>
                    {session.user?.image && !imageError ? (
                      <AvatarImage
                        src={session.user.image}
                        alt={session.user?.name || "User"}
                        onError={() => setImageError(true)}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <AvatarFallback className={cn(
                        "text-white font-medium",
                        getAvatarColor(session.user?.name)
                      )}>
                        {getInitials(session.user?.name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none">
                    {session.user?.name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session.user?.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/account">Account</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <ConnectBankButton className="w-full" />
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600 cursor-pointer"
                  onClick={() => signOut({ callbackUrl: '/' })}
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
              <DialogTrigger asChild>
                <Button variant="default">Sign in</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Welcome back</DialogTitle>
                  <DialogDescription>
                    Choose a method to sign in to your account
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Button
                    variant="outline"
                    onClick={() => handleSignIn('google')}
                    className="w-full"
                  >
                    <Icons.google className="mr-2 h-4 w-4" />
                    Continue with Google
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </header>
  )
} 