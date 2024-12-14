"use client"

import { signOut } from "next-auth/react"
import { Button } from "./ui/button"

export function SignOutButton() {
  return (
    <Button
      onClick={() => signOut({
        callbackUrl: '/',
        redirect: true
      })}
      variant="ghost"
    >
      Sign Out
    </Button>
  )
} 