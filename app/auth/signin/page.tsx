'use client'

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FcGoogle } from "react-icons/fc"
import { useSearchParams } from 'next/navigation'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"
import { useState } from "react"

export default function SignIn() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleGoogleSignIn = () => {
    signIn('google', { 
      callbackUrl: '/',
      prompt: 'select_account'
    })
  }

  const handleEmailSignIn = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle email/password sign in here
    signIn('email', { email, callbackUrl: '/' })
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <Card className="w-[400px] shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">B</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Sign in to Budget Advisor
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                {error === 'OAuthAccountNotLinked' 
                  ? 'This email is already associated with another account. Please sign in with the original provider.'
                  : 'An error occurred during sign in. Please try again.'}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full h-11 font-normal border-2 bg-white hover:bg-slate-50"
            onClick={handleGoogleSignIn}
          >
            <FcGoogle className="mr-2 h-5 w-5" />
            Google
          </Button>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Button 
              variant="link" 
              className="p-0 h-auto font-normal"
              onClick={() => signIn('google', { callbackUrl: '/' })}
            >
              Sign up
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 