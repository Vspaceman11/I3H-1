'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthActions } from '@convex-dev/auth/react'
import { ConvexError } from 'convex/values'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SignInPage() {
  const router = useRouter()
  const { signIn } = useAuthActions()
  const [step, setStep] = useState<'signIn' | 'signUp'>('signIn')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-foreground">
            {step === 'signIn' ? 'Sign In' : 'Sign Up'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {step === 'signIn'
              ? 'Sign in to your Pigeon-eye account'
              : 'Create a new account to report city issues'}
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setError(null)
            setLoading(true)
            const formData = new FormData(e.currentTarget)
            try {
              const result = await signIn('password', formData)
              if (result.signingIn) {
                await new Promise((r) => setTimeout(r, 500))
                window.location.href = '/?view=user'
                return
              }
            } catch (err) {
              const msg =
                err instanceof ConvexError
                  ? (err.data as { message?: string })?.message ?? String(err.data)
                  : err instanceof Error
                    ? err.message
                    : 'Sign in failed'
              setError(msg)
            } finally {
              setLoading(false)
            }
          }}
        >
          {step === 'signUp' && (
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Your name"
                required={step === 'signUp'}
                autoComplete="name"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder={step === 'signUp' ? 'Min. 8 characters' : ''}
              required
              autoComplete={step === 'signIn' ? 'current-password' : 'new-password'}
              minLength={8}
            />
          </div>
          <input name="flow" type="hidden" value={step} />

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Please wait…' : step === 'signIn' ? 'Sign In' : 'Sign Up'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {step === 'signIn' ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                className="font-medium text-primary underline-offset-4 hover:underline"
                onClick={() => setStep('signUp')}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                className="font-medium text-primary underline-offset-4 hover:underline"
                onClick={() => setStep('signIn')}
              >
                Sign in
              </button>
            </>
          )}
        </p>

        <p className="text-center">
          <Link href="/" className="text-sm text-muted-foreground hover:underline">
            ← Back to map
          </Link>
        </p>
      </div>
    </div>
  )
}
