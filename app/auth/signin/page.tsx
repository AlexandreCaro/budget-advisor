'use client'

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/ui/icons"

export default function SignIn() {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to Pitaka</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to continue to your account
          </p>
        </div>

        <div className="grid gap-6">
          <Button 
            variant="outline" 
            onClick={() => signIn('google', { callbackUrl: '/' })}
          >
            <Icons.google className="mr-2 h-4 w-4" />
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  )
} 