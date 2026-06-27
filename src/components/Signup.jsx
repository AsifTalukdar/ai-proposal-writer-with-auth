import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signupWithEmail, signInWithGoogle } from '../services/auth'

export default function Signup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: invite code, 2: details, 3: complete
  const [inviteCode, setInviteCode] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleValidateInvite = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/invites?action=validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode.trim() })
      })
      const data = await res.json()

      if (!data.valid) {
        setError(data.message || 'Invalid or expired invite code')
        setLoading(false)
        return
      }

      setStep(2)
      setLoading(false)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const { error: err } = await signupWithEmail(
      email,
      password,
      fullName,
      inviteCode.trim()
    )

    if (err) {
      setError(err)
      setLoading(false)
    } else {
      setStep(3)
    }
  }

  const handleGoogleSignup = async () => {
    setError('')
    setLoading(true)
    const { error: err } = await signInWithGoogle(inviteCode.trim())
    if (err) {
      setError(err)
      setLoading(false)
    }
  }

  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome to ProposalAI!</h2>
            <p className="text-slate-400 mb-6">Your account has been created. Check your email to verify your account, then sign in.</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo & Heading */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white mb-2">ProposalAI</h1>
          <p className="text-slate-400">Write winning proposals in seconds</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-6">
            {step === 1 ? 'Enter Invite Code' : 'Create Your Account'}
          </h2>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm mb-6">
              {error}
            </div>
          )}

          {/* Step 1: Invite Code */}
          {step === 1 && (
            <form onSubmit={handleValidateInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Invite Code</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="e.g., PRPSL-ABC123-XYZ"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none transition-colors font-mono"
                />
                <p className="text-xs text-slate-500 mt-2">Ask an admin for an invite code to join</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Validating...' : 'Continue'}
              </button>
            </form>
          )}

          {/* Step 2: Account Details */}
          {step === 2 && (
            <div className="space-y-4">
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Rahman Ahmed"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                  <p className="text-xs text-slate-500 mt-1">Min 6 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-900 text-slate-500">Or sign up with</span>
                </div>
              </div>

              <button
                onClick={handleGoogleSignup}
                disabled={loading}
                className="w-full px-4 py-2.5 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {loading ? 'Signing up...' : 'Google'}
              </button>

              <button
                onClick={() => setStep(1)}
                className="w-full text-slate-400 hover:text-slate-300 text-sm py-2"
              >
                ← Back
              </button>
            </div>
          )}

          {/* Login Link */}
          {step === 1 && (
            <div className="mt-6 text-center text-sm text-slate-400">
              Already have an account? <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold">Sign in</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
