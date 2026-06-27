import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { signOut } from '../services/auth'
import UserMenu from './UserMenu'

const SOFT_LIMIT = 100

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, profile, usage } = useAuth()

  const proposalCount = usage?.proposal_count ?? 0
  const usagePercent = Math.min((proposalCount / SOFT_LIMIT) * 100, 100)
  const nearLimit = proposalCount >= 80
  const atLimit = proposalCount >= SOFT_LIMIT

  const monthLabel = usage?.month_year
    ? new Date(usage.month_year + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })
    : new Date().toLocaleString('default', { month: 'long', year: 'numeric' })

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-xl font-black text-white">ProposalAI</span>
          <UserMenu />
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">

        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/20 rounded-2xl p-6">
          <h1 className="text-2xl font-bold text-white mb-1">
            Welcome back, {displayName}! 👋
          </h1>
          <p className="text-slate-400">Ready to write your next winning proposal?</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Usage Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-slate-400">Proposals this month</p>
                <p className="text-3xl font-black text-white mt-0.5">{proposalCount}
                  <span className="text-slate-500 text-lg font-normal"> / {SOFT_LIMIT}</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">{monthLabel}</p>
              </div>
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background: `conic-gradient(${atLimit ? '#ef4444' : nearLimit ? '#f59e0b' : '#3b82f6'} ${usagePercent}%, #1e293b ${usagePercent}%)`
                }}>
                <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{Math.round(usagePercent)}%</span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${atLimit ? 'bg-red-500' : nearLimit ? 'bg-amber-500' : 'bg-blue-500'}`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>

            {/* Alerts */}
            {atLimit && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm">
                ⚠️ You've reached your soft limit for this month. Usage continues but we may reach out regarding a plan upgrade.
              </div>
            )}
            {nearLimit && !atLimit && (
              <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm">
                🔔 You're approaching your monthly limit ({proposalCount}/100 proposals used).
              </div>
            )}
          </div>

          {/* Quick Info Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Account</p>
              <p className="text-sm text-white font-medium truncate">{user?.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ✓ Verified
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Plan</p>
              <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Beta Access
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Member since</p>
              <p className="text-sm text-white">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* CTA - Go to Generator */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Start Writing</h2>
            <p className="text-slate-400 text-sm">Paste a job description and let AI craft the perfect proposal for you.</p>
          </div>
          <button
            onClick={() => navigate('/app')}
            className="shrink-0 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20"
          >
            Open Proposal Writer →
          </button>
        </div>

        {/* Tips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: '🎯', title: 'Be Specific', tip: 'Paste the full job description for best results — the more context, the better the proposal.' },
            { icon: '🔥', title: 'Match the Tone', tip: 'Use "Aggressive" tone for competitive markets and "Professional" for corporate clients.' },
            { icon: '📋', title: 'History Saved', tip: 'Your last 50 proposals are saved in your browser — access them from the History panel.' },
          ].map(({ icon, title, tip }) => (
            <div key={title} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
              <div className="text-2xl mb-2">{icon}</div>
              <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
              <p className="text-xs text-slate-400">{tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
