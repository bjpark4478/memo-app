'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Memo } from '@/types/memo'
import { summarizeMemo } from '@/app/actions/summarize'

type SummaryTarget = Pick<Memo, 'id' | 'updatedAt'>

// 서버(DB)에도 요약이 저장되지만, 같은 세션에서의 반복 호버는 서버 왕복 없이 처리하도록
// 메모 버전(id + updatedAt)을 키로 클라이언트 캐시를 둔다.
const summaryCache = new Map<string, string>()
const inflightRequests = new Map<string, Promise<string>>()

class SummaryError extends Error {}

const cacheKey = (memo: SummaryTarget) => `${memo.id}:${memo.updatedAt}`

async function fetchSummary(memoId: string, force: boolean): Promise<string> {
  try {
    const result = await summarizeMemo(memoId, force)
    if (!result.ok) throw new SummaryError(result.error)
    return result.data
  } catch (err) {
    if (err instanceof SummaryError) throw err
    console.error('Failed to request summary:', err)
    throw new SummaryError('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
  }
}

function requestSummary(memo: SummaryTarget, force: boolean): Promise<string> {
  const key = cacheKey(memo)
  if (!force) {
    const cached = summaryCache.get(key)
    if (cached) return Promise.resolve(cached)
    const inflight = inflightRequests.get(key)
    if (inflight) return inflight
  }

  const request = fetchSummary(memo.id, force)
    .then(summary => {
      summaryCache.set(key, summary)
      return summary
    })
    .finally(() => {
      inflightRequests.delete(key)
    })
  inflightRequests.set(key, request)
  return request
}

// 메모가 바뀌면 요약 상태를 초기화하고, 이전 메모의 늦은 응답은 무시한다.
export const useMemoSummary = (memoId: string | null) => {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    requestIdRef.current += 1
    setSummary(null)
    setError(null)
    setLoading(false)
  }, [memoId])

  const summarize = useCallback(
    async (memo: SummaryTarget, force = false): Promise<void> => {
      const requestId = ++requestIdRef.current
      setError(null)

      const cached = force ? undefined : summaryCache.get(cacheKey(memo))
      if (cached) {
        setSummary(cached)
        setLoading(false)
        return
      }

      setLoading(true)
      setSummary(null)
      try {
        const result = await requestSummary(memo, force)
        if (requestId === requestIdRef.current) setSummary(result)
      } catch (err) {
        if (requestId === requestIdRef.current) {
          setError(
            err instanceof SummaryError ? err.message : '요약에 실패했습니다.'
          )
        }
      } finally {
        if (requestId === requestIdRef.current) setLoading(false)
      }
    },
    []
  )

  return { summary, loading, error, summarize }
}
