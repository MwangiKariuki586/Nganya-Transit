import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Button from '../components/ui/Button'
import { UserPlus, Mail, Lock, User, AtSign, ChevronLeft, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { enforceGuestOnlyRoute } from '@/shared/auth/guards'

export const Route = createFileRoute('/signup')({
    beforeLoad: async () => {
        await enforceGuestOnlyRoute()
    },
    component: SignUpScreen,
})

function SignUpScreen() {
    const navigate = useNavigate()
    const { addToast } = useToast()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [handle, setHandle] = useState('')
    const [accountType, setAccountType] = useState<'fan' | 'crew'>('fan')
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const { error: signUpError } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: {
                        full_name: fullName.trim(),
                        handle: handle.trim(),
                        intent: accountType,
                        role: accountType,
                    },
                },
            })

            if (signUpError) throw signUpError

            setIsSuccess(true)
            addToast('Account created. Check your email to continue.', 'success')
            // Note: If email confirmation is enabled, we stay here. 
            // If disabled, user might be logged in immediately.
        } catch (err: any) {
            addToast(err.message || 'Failed to sign up. Please try again.', 'error')
        } finally {
            setIsLoading(false)
        }
    }

    if (isSuccess) {
        return (
            <div className="min-h-[calc(100vh-var(--top-nav-height)-var(--bottom-nav-height))] flex flex-col items-center justify-center p-5">
                <div className="w-full max-w-md p-8 rounded-xl bg-(--glass-bg) border border-(--glass-border) backdrop-blur-xl text-center space-y-6 animate-scale-in">
                    <div className="flex justify-center">
                        <div className="w-16 h-16 rounded-full bg-(--color-green-soft) flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-(--color-green)" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-h2">Check your email</h2>
                        <p className="text-body text-(--color-text-secondary)">
                            We've sent a verification link to <span className="text-(--color-text-primary) font-semibold">{email}</span>.
                        </p>
                    </div>
                    <Button variant="secondary" className="w-full" onClick={() => navigate({ to: '/signin' })}>
                        Go to Sign In
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-[calc(100vh-var(--top-nav-height)-var(--bottom-nav-height))] flex flex-col items-center justify-center p-5 py-12">
            <div className="w-full max-w-md space-y-8 animate-slide-up">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-(--color-accent) flex items-center justify-center shadow-(--glow-accent) -rotate-3">
                            <UserPlus className="w-6 h-6 text-(--color-bg-base)" />
                        </div>
                    </div>
                    <h1 className="text-h2">Join the Cult</h1>
                    <p className="text-body text-(--color-text-secondary)">Create your account to start spotting</p>
                </div>

                {/* Form */}
                <div className="p-8 rounded-xl bg-(--glass-bg) border border-(--glass-border) backdrop-blur-xl">
                    <form onSubmit={handleSignUp} className="space-y-5">
                        {/* Account Type Selector */}
                        <div className="p-1 rounded-md bg-(--bg-card) border border-(--glass-border) flex">
                            <button
                                type="button"
                                onClick={() => setAccountType('fan')}
                                className={`flex-1 py-2 rounded-[calc(var(--radius-md)-4px)] text-sm font-bold transition-all ${accountType === 'fan'
                                    ? 'bg-(--color-accent) text-(--color-bg-base) shadow-(--glow-accent-sm)'
                                    : 'text-(--color-text-tertiary) hover:text-(--color-text-primary)'
                                    }`}
                            >
                                Fan
                            </button>
                            <button
                                type="button"
                                onClick={() => setAccountType('crew')}
                                className={`flex-1 py-2 rounded-[calc(var(--radius-md)-4px)] text-sm font-bold transition-all ${accountType === 'crew'
                                    ? 'bg-(--color-accent) text-(--color-bg-base) shadow-(--glow-accent-sm)'
                                    : 'text-(--color-text-tertiary) hover:text-(--color-text-primary)'
                                    }`}
                            >
                                Crew
                            </button>
                        </div>

                        {accountType === 'crew' && (
                            <div className="p-3 rounded-md bg-(--color-accent-soft) border border-(--color-accent-glow) text-[10px] text-(--color-accent) leading-tight">
                                <span className="font-bold flex items-center gap-1 mb-0.5 uppercase tracking-wider">
                                    <AlertCircle className="w-3 h-3" /> Note for Crew
                                </span>
                                You will be able to manage sessions once an admin maps you to your Nganya.
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-(--color-text-primary) mb-1.5">Full Name</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-(--color-text-tertiary)">
                                        <User className="w-4 h-4" />
                                    </span>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="John Doe"
                                        className="w-full pl-11 pr-4 py-2.5 rounded-md bg-(--bg-card) border border-(--glass-border) text-(--color-text-primary) focus:outline-none focus:border-(--color-accent) transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-(--color-text-primary) mb-1.5">Handle (Username)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-(--color-text-tertiary)">
                                        <AtSign className="w-4 h-4" />
                                    </span>
                                    <input
                                        type="text"
                                        value={handle}
                                        onChange={(e) => setHandle(e.target.value)}
                                        placeholder="matwana_king"
                                        className="w-full pl-11 pr-4 py-2.5 rounded-md bg-(--bg-card) border border-(--glass-border) text-(--color-text-primary) focus:outline-none focus:border-(--color-accent) transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-(--color-text-primary) mb-1.5">Email</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-(--color-text-tertiary)">
                                        <Mail className="w-4 h-4" />
                                    </span>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@example.com"
                                        className="w-full pl-11 pr-4 py-2.5 rounded-md bg-(--bg-card) border border-(--glass-border) text-(--color-text-primary) focus:outline-none focus:border-(--color-accent) transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-(--color-text-primary) mb-1.5">Password</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-(--color-text-tertiary)">
                                        <Lock className="w-4 h-4" />
                                    </span>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pl-11 pr-4 py-2.5 rounded-md bg-(--bg-card) border border-(--glass-border) text-(--color-text-primary) focus:outline-none focus:border-(--color-accent) transition-all"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <Button type="submit" variant="primary" className="w-full h-12 mt-4" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-bg-base)' }} isLoading={isLoading}>
                            Create Account
                        </Button>
                    </form>

                    <div className="mt-8 text-center space-y-4">
                        <p className="text-sm text-(--color-text-tertiary)">
                            Already a member?{' '}
                            <Link to="/signin" className="text-(--color-accent) font-semibold hover:underline">
                                Sign in
                            </Link>
                        </p>

                        <Link to="/" className="inline-flex items-center gap-2 text-xs text-(--color-text-tertiary) hover:text-(--color-text-primary) transition-colors">
                            <ChevronLeft className="w-3 h-3" />
                            Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
