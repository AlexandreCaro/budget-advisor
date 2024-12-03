'use client'

import { useSearchParams } from 'next/navigation'

export default function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="p-8 bg-white rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
        <p className="text-gray-600 mb-4">
          An error occurred during authentication: {error}
        </p>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
          {JSON.stringify(searchParams.toString(), null, 2)}
        </pre>
        <a 
          href="/auth/signin"
          className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Try Again
        </a>
      </div>
    </div>
  )
} 