import { createClient } from '@supabase/supabase-js'

const CONFIG = {
  UPSTREAM_URL: 'https://openrouter.ai/api/v1/chat/completions',
  OPENAI_URL: 'https://api.openai.com/v1/chat/completions',
  TIMEOUT_MS: 30000,
  MAX_BODY_SIZE: 1024 * 50,
  MAX_MESSAGES: 5,
  MAX_CONTENT_LENGTH: 6000,
  MAX_TOKENS_LIMIT: 2000,
  SOFT_LIMIT: 100,
  ALLOWED_MODELS: [
    'gpt-4o-mini','gpt-4o','gpt-3.5-turbo',
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemma-4-31b-it:free',
    'meta-llama/llama-3.2-3b-instruct:free',
    'openai/gpt-oss-20b:free',
    'nousresearch/hermes-3-llama-3.1-405b:free',
    'anthropic/claude-3.5-sonnet','openai/gpt-4o-mini'
  ],
  ALLOWED_ROLES: ['system', 'user', 'assistant'],
  RATE_LIMIT_WINDOW_MS: 60000,
  RATE_LIMIT_MAX: 15,
  APP_TITLE: 'ProposalAI'
}

// Lazy Supabase client - only created when first needed (after env vars loaded)
let _supabase = null
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  }
  return _supabase
}

const rateLimitStore = new Map()

function checkRateLimit(ip) {
  const now = Date.now()
  const rec = rateLimitStore.get(ip)
  if (!rec || now - rec.start > CONFIG.RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { start: now, count: 1 })
    return { ok: true, remaining: CONFIG.RATE_LIMIT_MAX - 1 }
  }
  rec.count++
  if (rec.count > CONFIG.RATE_LIMIT_MAX) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((rec.start + CONFIG.RATE_LIMIT_WINDOW_MS - now) / 1000) }
  }
  return { ok: true, remaining: CONFIG.RATE_LIMIT_MAX - rec.count }
}

setInterval(() => {
  const now = Date.now()
  for (const [ip, r] of rateLimitStore) {
    if (now - r.start > CONFIG.RATE_LIMIT_WINDOW_MS * 2) rateLimitStore.delete(ip)
  }
}, 120000)

function getIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || 'unknown'
}

function originAllowed(req) {
  const origin = req.headers['origin'] || ''
  const allowed = process.env.APP_URL || ''
  if (!allowed || process.env.NODE_ENV !== 'production') return true
  return origin === allowed || origin.endsWith('.vercel.app')
}

function clean(str, max) {
  return typeof str === 'string' ? str.replace(/[^\x09\x0A\x0D\x20-\uFFFF]/g, '').slice(0, max) : ''
}

function validate(body) {
  const errors = []
  if (!Array.isArray(body?.messages)) errors.push('messages must be an array')
  if (body?.messages?.length > CONFIG.MAX_MESSAGES) errors.push(`Max ${CONFIG.MAX_MESSAGES} messages`)
  for (const m of (body?.messages || [])) {
    if (!CONFIG.ALLOWED_ROLES.includes(m.role)) errors.push(`Invalid role: ${m.role}`)
    if (typeof m.content !== 'string') errors.push('Message content must be string')
    if (m.content?.length > CONFIG.MAX_CONTENT_LENGTH) errors.push(`Message too long`)
  }
  if (body?.model && !CONFIG.ALLOWED_MODELS.includes(body.model)) errors.push(`Disallowed model`)
  return errors
}

async function authenticateRequest(req) {
  const authHeader = req.headers['authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Missing authorization header' }
  }
  const token = authHeader.replace('Bearer ', '').trim()
  const { data: { user }, error } = await getSupabase().auth.getUser(token)
  if (error || !user) return { user: null, error: 'Invalid or expired token' }
  return { user, error: null }
}

async function trackUsage(userId) {
  const monthYear = new Date().toISOString().slice(0, 7)
  const { data: updated } = await getSupabase().rpc('increment_usage', {
    p_user_id: userId,
    p_month_year: monthYear
  })
  const finalCount = updated ?? 1
  return {
    count: finalCount,
    nearLimit: finalCount >= 80,
    atLimit: finalCount >= CONFIG.SOFT_LIMIT
  }
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')

  if (!originAllowed(req)) return res.status(403).json({ error: 'Forbidden' })
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }) }

  const ip = getIP(req)
  const rl = checkRateLimit(ip)
  if (!rl.ok) {
    res.setHeader('Retry-After', rl.retryAfter)
    return res.status(429).json({ error: `Rate limit exceeded. Try again in ${rl.retryAfter}s.` })
  }

  const { user, error: authError } = await authenticateRequest(req)
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized. Please log in.' })

  const useOpenRouter = !!(process.env.OPENROUTER_API_KEY)
  const key = useOpenRouter ? process.env.OPENROUTER_API_KEY : process.env.OPENAI_API_KEY
  if (!key) return res.status(500).json({ error: 'Server misconfigured: Missing API key.' })

  const errors = validate(req.body)
  if (errors.length) return res.status(400).json({ error: 'Validation failed.', details: errors })

  const messages = req.body.messages.map(m => ({ role: m.role, content: clean(m.content, CONFIG.MAX_CONTENT_LENGTH) }))
  const isOpenAI = !useOpenRouter
  const targetUrl = isOpenAI ? CONFIG.OPENAI_URL : CONFIG.UPSTREAM_URL
  let targetModel = req.body.model

  if (useOpenRouter && (targetModel.includes('gpt') || targetModel.includes('claude') || targetModel.includes('mistral'))) {
    targetModel = 'meta-llama/llama-3.3-70b-instruct:free'
  }
  if (isOpenAI && targetModel.includes(':free')) targetModel = 'gpt-4o-mini'

  const payload = {
    model: targetModel,
    messages,
    temperature: req.body.temperature ?? 0.75,
    max_tokens: Math.min(Number(req.body.max_tokens) || 900, CONFIG.MAX_TOKENS_LIMIT)
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), CONFIG.TIMEOUT_MS)

  try {
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }
    if (useOpenRouter) {
      headers['HTTP-Referer'] = process.env.APP_URL || 'https://proposalai.vercel.app'
      headers['X-Title'] = CONFIG.APP_TITLE
    }

    let up = await fetch(targetUrl, { method: 'POST', headers, body: JSON.stringify(payload), signal: ctrl.signal })
    let data = await up.json().catch(() => null)

    if (!up.ok && useOpenRouter) {
      const fallbacks = ['meta-llama/llama-3.3-70b-instruct:free','google/gemma-4-31b-it:free','meta-llama/llama-3.2-3b-instruct:free','openai/gpt-oss-20b:free']
      for (const fbModel of fallbacks) {
        if (fbModel === payload.model) continue
        payload.model = fbModel
        up = await fetch(targetUrl, { method: 'POST', headers, body: JSON.stringify(payload), signal: ctrl.signal })
        data = await up.json().catch(() => null)
        if (up.ok) break
      }
    }

    if (!up.ok) {
      const errMsg = data?.error?.message || data?.error || 'AI request failed.'
      return res.status(up.status).json({ error: typeof errMsg === 'string' ? errMsg : 'AI request failed.' })
    }

    const content = data?.choices?.[0]?.message?.content
    if (!content) return res.status(502).json({ error: 'No content returned.' })

    const usageInfo = await trackUsage(user.id)

    return res.status(200).json({
      choices: [{ message: { role: 'assistant', content: content.trim() } }],
      usage: data.usage || null,
      proposalUsage: { count: usageInfo.count, limit: CONFIG.SOFT_LIMIT, nearLimit: usageInfo.nearLimit, atLimit: usageInfo.atLimit }
    })
  } catch (err) {
    if (err.name === 'AbortError') return res.status(504).json({ error: 'AI timed out. Try again.' })
    return res.status(500).json({ error: 'Unexpected error.' })
  } finally {
    clearTimeout(timer)
  }
}