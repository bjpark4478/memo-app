'use server'

import { ActionResult } from '@/types/action'
import { createSupabaseServerClient } from '@/utils/supabaseServer'
import { summarizeText, SummarizeError } from '@/utils/gemini'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DB_ERROR_MESSAGE =
  '데이터베이스 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'

// 메모 본문은 클라이언트가 아니라 DB에서 읽는다. 저장된 요약이 현재 메모 버전과
// 일치하면 Gemini를 호출하지 않고 재사용한다. (force=true면 항상 새로 요약)
export async function summarizeMemo(
  memoId: string,
  force = false
): Promise<ActionResult<string>> {
  if (!UUID_PATTERN.test(memoId)) {
    return { ok: false, error: '잘못된 메모 ID입니다.' }
  }

  try {
    const supabase = createSupabaseServerClient()

    const { data: memo, error: memoError } = await supabase
      .from('memos')
      .select('content, updated_at')
      .eq('id', memoId)
      .maybeSingle<{ content: string; updated_at: string }>()
    if (memoError) throw memoError
    if (!memo) return { ok: false, error: '메모를 찾을 수 없습니다.' }

    if (!force) {
      const { data: saved, error: savedError } = await supabase
        .from('memo_summaries')
        .select('summary, source_updated_at')
        .eq('memo_id', memoId)
        .maybeSingle<{ summary: string; source_updated_at: string }>()
      if (savedError) throw savedError

      const isFresh =
        saved &&
        new Date(saved.source_updated_at).getTime() ===
          new Date(memo.updated_at).getTime()
      if (saved && isFresh) return { ok: true, data: saved.summary }
    }

    const summary = await summarizeText(memo.content)

    const { error: upsertError } = await supabase.from('memo_summaries').upsert(
      {
        memo_id: memoId,
        summary,
        source_updated_at: memo.updated_at,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'memo_id' }
    )
    // 저장 실패가 요약 결과 반환을 막지는 않는다.
    if (upsertError) console.error('Failed to save summary:', upsertError)

    return { ok: true, data: summary }
  } catch (error) {
    if (error instanceof SummarizeError) {
      return { ok: false, error: error.message }
    }
    console.error('Failed to summarize memo:', error)
    return { ok: false, error: DB_ERROR_MESSAGE }
  }
}
