# Hooks - AI Agent 지침서

## 모듈 역할

클라이언트 상태 관리를 위한 커스텀 React 훅 집합. 메모 CRUD, 검색, 필터링 로직을 캡슐화한다.

## 의존성 관계

- `@/types/memo` — Memo, MemoFormData 타입
- `@/app/actions/memos` — 메모 CRUD 서버 액션 (Supabase)
- `@/app/actions/summarize` — AI 요약 서버 액션

## 훅 목록

| 파일                | 역할                                                 | 반환값                                          |
| ------------------- | ---------------------------------------------------- | ----------------------------------------------- |
| `useMemos.ts`       | 메모 상태 전체 관리 (서버 액션 호출)                 | memos, CRUD 함수, 필터 함수, stats, error       |
| `useMemoSummary.ts` | 메모 AI 요약 요청/상태 관리 (버전별 클라이언트 캐시) | summary, loading, error, summarize(memo, force) |

## useMemos 구조

```tsx
const {
  // 상태
  memos, // 필터링된 메모 배열
  allMemos, // 전체 메모 배열
  loading, // 로딩 상태
  error, // 서버 액션 실패 메시지 (없으면 null)
  searchQuery, // 현재 검색어
  selectedCategory, // 선택된 카테고리
  stats, // 통계 (total, byCategory, filtered)

  // CRUD (모두 서버 액션 호출, 성공 시 로컬 상태 갱신)
  createMemo, // (formData) => Promise<Memo | null>
  updateMemo, // (id, formData) => Promise<void>
  deleteMemo, // (id) => Promise<void>
  getMemoById, // (id) => Memo | undefined
  clearError, // () => void

  // 필터링
  searchMemos, // (query) => void
  filterByCategory, // (category) => void
} = useMemos()
```

## Implementation Patterns

### 새 커스텀 훅 작성 템플릿

```tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

export const useCustomHook = (initialValue?: SomeType) => {
  const [state, setState] = useState<StateType>(initialValue)
  const [loading, setLoading] = useState(true)

  // 초기 로드 (서버 액션 호출, 언마운트 시 늦은 응답 무시)
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      // const result = await someServerAction()
      if (cancelled) return
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // 메모이제이션된 함수
  const action = useCallback(() => {
    // 로직
  }, [dependencies])

  // 파생 상태
  const derivedState = useMemo(() => {
    return /* 계산 */
  }, [state])

  return {
    state,
    loading,
    action,
    derivedState,
  }
}
```

### 성능 최적화 패턴

1. **useCallback**: 자식 컴포넌트에 전달되는 함수
2. **useMemo**: 비용이 큰 계산 또는 객체/배열 생성
3. 의존성 배열 최소화

## Local Golden Rules

### Do's

- 훅 이름은 `use` 접두사 필수
- 데이터 접근은 서버 액션(`@/app/actions/*`)을 통해서만 (훅에서 Supabase/Gemini 직접 호출 금지)
- 서버 액션 결과는 `ok` 확인 후 처리하고, 실패 시 `error` 상태로 노출
- 에러 처리: try-catch로 감싸고 console.error 로깅
- 로딩 상태 항상 제공

### Don'ts

- 훅 내부에서 직접 UI 렌더링 금지
- 조건부 훅 호출 금지 (React 규칙)
- 무한 루프 유발하는 의존성 배열 주의
- 훅 외부에서 useState/useEffect 호출 금지

## 확장 시 고려사항

새 기능 추가 시 useMemos 훅 확장 또는 별도 훅 생성:

- **useMemos 확장**: 메모 관련 기능 (정렬, 페이지네이션)
- **별도 훅 생성**: 독립적 기능 (useTheme, useToast 등)
