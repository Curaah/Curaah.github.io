// ============================================
// CURAAH — Supabase Client
// ============================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://lospowxozjnoiawxbojg.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxvc3Bvd3hvempub2lhd3hib2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTIzMjksImV4cCI6MjA5MjMyODMyOX0.KBfNiJIKweEAqVJ8q_G8ZkbU5qi4vfglRhazKIH32ic'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
