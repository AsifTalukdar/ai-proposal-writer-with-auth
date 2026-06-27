import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProposalForm from './ProposalForm'
import OutputBox from './OutputBox'
import History from './History'
import UserMenu from './UserMenu'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { MAX_HISTORY } from '../config/constants'

export default function ProposalApp() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [meta, setMeta] = useState({ type: '', tone: '' })
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useLocalStorage('proposal_history', [])
  const [usageWarning, setUsageWarning] = useState(null)

  const handleGenerated = useCallback((generated, form, proposalUsage) => {
    setText(generated)
    setMeta({ type: form.type, tone: form.tone })

    // Show soft limit alerts from server
    if (proposalUsage?.atLimit) {
      setUsageWarning({
        type: 'error',
        message: `⚠️ You've reached your soft limit of ${proposalUsage.limit} proposals this month. Usage continues, but you may be contacted about upgrading.`
      })
    } else if (proposalUsage?.nearLimit) {
      setUsageWarning({
        type: 'warning',
        message: `🔔 You've used ${proposalUsage.count}/${proposalUsage.limit} proposals this month. You're approaching the soft limit.`
      })
    } else {
      setUsageWarning(null)
    }

    const newItem = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      preview: generated.slice(0, 120) + (generated.length > 120 ? '...' : ''),
      fullText: generated,
      type: form.type,
      tone: form.tone
    }
    setItems(prev => [newItem, ...prev].slice(0, MAX_HISTORY))
  }, [setItems])

  const handleLoad = useCallback((item) => {
    setText(item.fullText)
    setMeta({ type: item.type, tone: item.tone })
  }, [])

  const handleDelete = useCallback((id) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [setItems])

  const handleClear = useCallback(() => {
    if (window.confirm('Clear all saved proposals?')) setItems([])
  }, [setItems])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">
      {/* Auth-aware Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-xl font-black text-white hover:text-blue-400 transition-colors"
            >
              ProposalAI
            </button>
            <span className="text-slate-600 hidden sm:block">|</span>
            <span className="text-slate-400 text-sm hidden sm:block">Proposal Writer</span>
          </div>
          <UserMenu />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Usage Warning Banner */}
        {usageWarning && (
          <div className={`p-4 rounded-xl text-sm border ${
            usageWarning.type === 'error'
              ? 'bg-red-500/10 border-red-500/20 text-red-200'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-200'
          }`}>
            {usageWarning.message}
            <button
              onClick={() => setUsageWarning(null)}
              className="ml-4 underline opacity-70 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Hero */}
        <section className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold mb-4">
            Built for Bangladeshi &amp; International Freelancers
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
            Write better proposals.
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              Win more freelance jobs.
            </span>
          </h1>
          <p className="mt-4 text-slate-400 text-sm md:text-base leading-relaxed">
            Paste a job post and generate a polished Upwork, Fiverr, PeoplePerHour,
            LinkedIn, or cold email in seconds.
          </p>
        </section>

        <ProposalForm
          onGenerated={handleGenerated}
          setLoading={setLoading}
          loading={loading}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <OutputBox text={text} meta={meta} loading={loading} />
          </div>
          <div className="lg:col-span-1">
            <History
              items={items}
              onLoad={handleLoad}
              onDelete={handleDelete}
              onClear={handleClear}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
