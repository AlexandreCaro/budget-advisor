'use client'

import { useSearchParams } from 'next/navigation'

export default function ErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="mx-auto max-w-xl px-4">
        <h1 className="text-2xl font-bold">Authentication Error</h1>
        <p className="mt-4 text-gray-600">
          {error || 'An error occurred during authentication'}
        </p>
        <pre className="mt-4 bg-gray-100 p-4 rounded">
          {JSON.stringify({ error }, null, 2)}
        </pre>
      </div>
    </div>
  )
} 