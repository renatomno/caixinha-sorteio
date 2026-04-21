import { processLock } from '@supabase/auth-js'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const supabaseStorageKey = 'sorteio-caixinha-auth'
export const supabaseProjectHost = (() => {
  try {
    return new URL(supabaseUrl).host
  } catch {
    return null
  }
})()

console.log('[CaixinhaDebug]', new Date().toISOString(), 'supabase:client:init', {
  projectHost: supabaseProjectHost,
  storageKey: supabaseStorageKey,
  hasSupabaseUrl: Boolean(supabaseUrl),
  hasPublishableKey: Boolean(supabasePublishableKey),
  lockStrategy: 'processLock',
})

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
    storageKey: supabaseStorageKey,
    lock: processLock,
    lockAcquireTimeout: 15000,
  },
})
