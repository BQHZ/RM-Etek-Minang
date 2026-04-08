import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Used ONLY for Realtime subscriptions (kitchen display, stock alerts).
// All CRUD operations go through Prisma via API routes.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
