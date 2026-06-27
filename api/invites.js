import { createClient } from '@supabase/supabase-js'

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

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.APP_URL || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { action } = req.query

  // POST /api/invites?action=validate
  if (req.method === 'POST' && action === 'validate') {
    return validateInvite(req, res)
  }

  // POST /api/invites?action=use
  if (req.method === 'POST' && action === 'use') {
    return useInvite(req, res)
  }

  // POST /api/invites?action=create (admin only)
  if (req.method === 'POST' && action === 'create') {
    return createInvite(req, res)
  }

  return res.status(404).json({ error: 'Not found' })
}

/**
 * Validate an invite code
 */
async function validateInvite(req, res) {
  const { code } = req.body || {}

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ valid: false, message: 'Invite code is required' })
  }

  const cleanCode = code.trim().toUpperCase()

  const { data, error } = await supabase
    .from('invites')
    .select('id, code, used_count, max_uses, expires_at, is_active')
    .eq('code', cleanCode)
    .single()

  if (error || !data) {
    return res.status(200).json({ valid: false, message: 'Invite code not found' })
  }

  if (!data.is_active) {
    return res.status(200).json({ valid: false, message: 'This invite code has been deactivated' })
  }

  if (new Date(data.expires_at) < new Date()) {
    return res.status(200).json({ valid: false, message: 'This invite code has expired' })
  }

  if (data.used_count >= data.max_uses) {
    return res.status(200).json({ valid: false, message: 'This invite code has reached its maximum uses' })
  }

  return res.status(200).json({
    valid: true,
    remaining: data.max_uses - data.used_count,
    message: 'Valid invite code'
  })
}

/**
 * Mark an invite as used (called after successful signup)
 */
async function useInvite(req, res) {
  const { code, user_id } = req.body || {}

  if (!code || !user_id) {
    return res.status(400).json({ error: 'code and user_id are required' })
  }

  const cleanCode = code.trim().toUpperCase()

  // Get current invite
  const { data: invite, error: fetchError } = await supabase
    .from('invites')
    .select('id, used_count, max_uses')
    .eq('code', cleanCode)
    .single()

  if (fetchError || !invite) {
    return res.status(404).json({ error: 'Invite not found' })
  }

  const newUsedCount = invite.used_count + 1
  const shouldDeactivate = newUsedCount >= invite.max_uses

  // Update invite
  const { error: updateError } = await supabase
    .from('invites')
    .update({
      used_count: newUsedCount,
      used_by: user_id,
      is_active: !shouldDeactivate
    })
    .eq('id', invite.id)

  if (updateError) {
    return res.status(500).json({ error: 'Failed to update invite' })
  }

  return res.status(200).json({ success: true })
}

/**
 * Create a new invite code (admin use only)
 * Protect this with an admin secret in production
 */
async function createInvite(req, res) {
  const { max_uses = 1, admin_secret, created_by } = req.body || {}

  // Simple admin check
  if (admin_secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const code = 'PRPSL-' + generateRandomCode(8)

  const { data, error } = await supabase
    .from('invites')
    .insert({
      code,
      max_uses: Math.min(max_uses, 100), // cap at 100
      created_by: created_by || null,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    })
    .select('code, max_uses, expires_at')
    .single()

  if (error) {
    return res.status(500).json({ error: 'Failed to create invite' })
  }

  return res.status(201).json({ code: data.code, max_uses: data.max_uses, expires_at: data.expires_at })
}

function generateRandomCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
