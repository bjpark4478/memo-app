'use server'

import { Memo, MemoFormData, DEFAULT_CATEGORIES } from '@/types/memo'
import { ActionResult } from '@/types/action'
import { createSupabaseServerClient } from '@/utils/supabaseServer'

interface MemoRow {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  created_at: string
  updated_at: string
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_TITLE_LENGTH = 200
const MAX_CONTENT_LENGTH = 100000
const DB_ERROR_MESSAGE =
  '데이터베이스 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'

const toMemo = (row: MemoRow): Memo => ({
  id: row.id,
  title: row.title,
  content: row.content,
  category: row.category,
  tags: row.tags,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

// 서버 액션은 외부에서 직접 호출될 수 있으므로 입력을 서버에서도 검증한다.
function parseFormData(input: unknown): MemoFormData | string {
  if (typeof input !== 'object' || input === null) {
    return '잘못된 요청입니다.'
  }
  const { title, content, category, tags } = input as Record<string, unknown>

  if (typeof title !== 'string' || !title.trim()) {
    return '제목을 입력해주세요.'
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return `제목은 ${MAX_TITLE_LENGTH}자 이하로 입력해주세요.`
  }
  if (typeof content !== 'string' || !content.trim()) {
    return '내용을 입력해주세요.'
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    return `내용은 ${MAX_CONTENT_LENGTH}자 이하로 입력해주세요.`
  }
  if (
    typeof category !== 'string' ||
    !(DEFAULT_CATEGORIES as string[]).includes(category)
  ) {
    return '올바르지 않은 카테고리입니다.'
  }
  if (!Array.isArray(tags) || !tags.every(tag => typeof tag === 'string')) {
    return '올바르지 않은 태그입니다.'
  }

  return { title, content, category, tags }
}

export async function getMemos(): Promise<ActionResult<Memo[]>> {
  try {
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase
      .from('memos')
      .select('*')
      .order('created_at', { ascending: false })
      .returns<MemoRow[]>()

    if (error) throw error
    return { ok: true, data: data.map(toMemo) }
  } catch (error) {
    console.error('Failed to load memos:', error)
    return { ok: false, error: DB_ERROR_MESSAGE }
  }
}

export async function createMemo(
  formData: MemoFormData
): Promise<ActionResult<Memo>> {
  const parsed = parseFormData(formData)
  if (typeof parsed === 'string') return { ok: false, error: parsed }

  try {
    const supabase = createSupabaseServerClient()
    // id(uuid v4)와 생성/수정 시각은 DB 기본값으로 생성한다.
    const { data, error } = await supabase
      .from('memos')
      .insert(parsed)
      .select('*')
      .single<MemoRow>()

    if (error) throw error
    return { ok: true, data: toMemo(data) }
  } catch (error) {
    console.error('Failed to create memo:', error)
    return { ok: false, error: DB_ERROR_MESSAGE }
  }
}

export async function updateMemo(
  id: string,
  formData: MemoFormData
): Promise<ActionResult<Memo>> {
  if (!UUID_PATTERN.test(id))
    return { ok: false, error: '잘못된 메모 ID입니다.' }
  const parsed = parseFormData(formData)
  if (typeof parsed === 'string') return { ok: false, error: parsed }

  try {
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase
      .from('memos')
      .update({ ...parsed, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .maybeSingle<MemoRow>()

    if (error) throw error
    if (!data) return { ok: false, error: '메모를 찾을 수 없습니다.' }
    return { ok: true, data: toMemo(data) }
  } catch (error) {
    console.error('Failed to update memo:', error)
    return { ok: false, error: DB_ERROR_MESSAGE }
  }
}

export async function deleteMemo(id: string): Promise<ActionResult<null>> {
  if (!UUID_PATTERN.test(id))
    return { ok: false, error: '잘못된 메모 ID입니다.' }

  try {
    const supabase = createSupabaseServerClient()
    const { error } = await supabase.from('memos').delete().eq('id', id)

    if (error) throw error
    return { ok: true, data: null }
  } catch (error) {
    console.error('Failed to delete memo:', error)
    return { ok: false, error: DB_ERROR_MESSAGE }
  }
}
