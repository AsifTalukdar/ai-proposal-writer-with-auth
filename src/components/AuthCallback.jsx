import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { handleOAuthCallback } from '../services/auth'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    const inviteCode = searchParams.get('invite') || null

    const process = async () => {
      const { error: err } = await handleOAuthCallback(inviteCode)
      if (err) {
        setError(err)
        setTimeout(() => navigate('/login'), 3000)
      } else {
        navigate('/dashboard')
      }
    }

    process()
  }, [])

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center px-4">
        <div className="bg-slate-900/80 border border-red-500/20 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Authentication Failed</h2>
          <p className="text-red-300 text-sm mb-4">{error}</p>
          <p className="text-slate-500 text-xs">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm">Completing sign in...</p>
      </div>
    </div>
  )
}
