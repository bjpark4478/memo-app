import { createClient } from '@supabase/supabase-js'

// 서버 액션 전용 클라이언트. 환경변수에 NEXT_PUBLIC_ 접두사가 없으므로 브라우저로 노출되지 않는다.
export function createSupabaseServerClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL 또는 SUPABASE_PUBLISHABLE_KEY가 설정되지 않았습니다.'
    )
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
