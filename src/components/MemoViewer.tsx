'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  Memo,
  MemoCategory,
  MEMO_CATEGORIES,
  MEMO_CATEGORY_COLORS,
} from '@/types/memo'
import { useMemoSummary } from '@/hooks/useMemoSummary'

// 마크다운 렌더러는 브라우저 전용이므로 SSR 없이 지연 로딩
const MarkdownPreview = dynamic(
  () => import('@uiw/react-md-editor').then(mod => mod.default.Markdown),
  { ssr: false }
)

interface MemoViewerProps {
  memo: Memo | null
  onClose: () => void
  onEdit: (memo: Memo) => void
  onDelete: (id: string) => void
}

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export default function MemoViewer({
  memo,
  onClose,
  onEdit,
  onDelete,
}: MemoViewerProps) {
  const isOpen = memo !== null
  const {
    summary,
    loading: summaryLoading,
    error: summaryError,
    summarize,
  } = useMemoSummary(memo?.id ?? null)

  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!memo) return null

  const handleDelete = () => {
    if (window.confirm('정말로 이 메모를 삭제하시겠습니까?')) {
      onDelete(memo.id)
      onClose()
    }
  }

  const category = memo.category as MemoCategory

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-40"
      onClick={onClose}
      data-testid="memo-viewer-backdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="memo-viewer-title"
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        data-testid="memo-viewer"
      >
        <div className="p-6">
          {/* 헤더 */}
          <div className="flex justify-between items-start gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h2
                id="memo-viewer-title"
                className="text-xl font-semibold text-gray-900 mb-2 break-words"
              >
                {memo.title}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${MEMO_CATEGORY_COLORS[category] || MEMO_CATEGORY_COLORS.other}`}
                >
                  {MEMO_CATEGORIES[category] || memo.category}
                </span>
                <span className="text-xs text-gray-500">
                  수정 {formatDate(memo.updatedAt)}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="닫기"
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              data-testid="memo-viewer-close-btn"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* 내용 */}
          <div
            data-color-mode="light"
            className="mb-6"
            data-testid="memo-viewer-content"
          >
            <MarkdownPreview
              source={memo.content}
              className="!bg-transparent !text-gray-700 break-words"
            />
          </div>

          {/* AI 요약 */}
          <div className="mb-6" data-testid="memo-summary-section">
            <button
              onClick={() => summarize(memo, summary !== null)}
              disabled={summaryLoading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-purple-300 text-purple-700 hover:bg-purple-50 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition-colors"
              data-testid="memo-summarize-btn"
            >
              ✨{' '}
              {summaryLoading
                ? '요약 중...'
                : summary
                  ? '다시 요약'
                  : 'AI 요약'}
            </button>

            {summaryError && (
              <p
                role="alert"
                className="mt-3 text-sm text-red-600"
                data-testid="memo-summary-error"
              >
                {summaryError}
              </p>
            )}
            {summary && (
              <div
                className="mt-3 p-4 bg-purple-50 border border-purple-100 rounded-lg"
                data-testid="memo-summary-result"
              >
                <p className="text-xs font-medium text-purple-700 mb-2">
                  AI 요약
                </p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                  {summary}
                </p>
              </div>
            )}
          </div>

          {/* 태그 */}
          {memo.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-6">
              {memo.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-500 mb-6">
            작성 {formatDate(memo.createdAt)}
          </p>

          {/* 액션 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={() => onEdit(memo)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
              data-testid="memo-viewer-edit-btn"
            >
              편집
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              data-testid="memo-viewer-delete-btn"
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
