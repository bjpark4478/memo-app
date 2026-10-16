'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Memo, MEMO_CATEGORIES, MEMO_CATEGORY_COLORS } from '@/types/memo'
import { useMemoSummary } from '@/hooks/useMemoSummary'
import { stripMarkdown } from '@/utils/markdown'

const HOVER_SUMMARY_DELAY_MS = 600

interface MemoItemProps {
  memo: Memo
  onView: (memo: Memo) => void
  onEdit: (memo: Memo) => void
  onDelete: (id: string) => void
}

export default function MemoItem({
  memo,
  onView,
  onEdit,
  onDelete,
}: MemoItemProps) {
  const [isHovered, setIsHovered] = useState(false)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { summary, loading, error, summarize } = useMemoSummary(memo.id)

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }, [])

  // 호버가 잠깐 스쳐 지나갈 때는 LLM을 호출하지 않도록 지연 후 요약 요청
  const handleMouseEnter = () => {
    setIsHovered(true)
    clearHoverTimer()
    hoverTimerRef.current = setTimeout(() => {
      summarize(memo)
    }, HOVER_SUMMARY_DELAY_MS)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    clearHoverTimer()
  }

  useEffect(() => clearHoverTimer, [clearHoverTimer])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getCategoryColor = (category: string) =>
    MEMO_CATEGORY_COLORS[category as keyof typeof MEMO_CATEGORY_COLORS] ||
    MEMO_CATEGORY_COLORS.other

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onView(memo)}
      onKeyDown={e => {
        if (
          e.target === e.currentTarget &&
          (e.key === 'Enter' || e.key === ' ')
        ) {
          e.preventDefault()
          onView(memo)
        }
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-200 cursor-pointer"
      data-testid="memo-item"
    >
      {/* 호버 시 AI 요약 */}
      {isHovered && (loading || summary || error) && (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-x-3 bottom-3 max-h-[85%] overflow-hidden z-20 p-3 bg-purple-50 border border-purple-200 rounded-lg shadow-lg pointer-events-none"
          data-testid="memo-hover-summary"
        >
          <p className="text-xs font-medium text-purple-700 mb-1">✨ AI 요약</p>
          {loading && <p className="text-sm text-gray-500">요약 중...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {summary && (
            <p className="text-xs text-gray-700 leading-snug whitespace-pre-wrap break-words">
              {summary}
            </p>
          )}
        </div>
      )}

      {/* 헤더 */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
            {memo.title}
          </h3>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(memo.category)}`}
            >
              {MEMO_CATEGORIES[memo.category as keyof typeof MEMO_CATEGORIES] ||
                memo.category}
            </span>
            <span className="text-xs text-gray-500">
              {formatDate(memo.updatedAt)}
            </span>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-2 ml-4">
          <button
            onClick={e => {
              e.stopPropagation()
              onEdit(memo)
            }}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="편집"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={e => {
              e.stopPropagation()
              if (window.confirm('정말로 이 메모를 삭제하시겠습니까?')) {
                onDelete(memo.id)
              }
            }}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="삭제"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* 내용 */}
      <div className="mb-4">
        <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">
          {stripMarkdown(memo.content)}
        </p>
      </div>

      {/* 태그 */}
      {memo.tags.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {memo.tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
