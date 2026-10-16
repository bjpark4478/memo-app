# App Router - AI Agent 지침서

## 모듈 역할

Next.js 16 App Router 기반 페이지, 레이아웃, 서버 액션 정의. 현재 단일 페이지(`/`) 구조이며, 페이지는 클라이언트 컴포넌트로 렌더링하고 데이터는 서버 액션을 통해 Supabase에서 읽고 쓴다.

## 의존성 관계

- `@/components/*` — UI 컴포넌트 import
- `@/hooks/useMemos` — 메모 상태 관리 훅
- `@/types/memo`, `@/types/action` — 메모 타입, 서버 액션 결과 타입
- `@/utils/supabaseServer`, `@/utils/gemini` — 서버 전용 유틸 (서버 액션에서만 사용)

## Tech Stack & Constraints

- Next.js App Router (pages 디렉토리 아님)
- 현재 모든 페이지는 `'use client'` 클라이언트 컴포넌트
- 데이터는 클라이언트에서 마운트 후 서버 액션(`getMemos`)으로 로드 (초기 렌더는 로딩 상태)
- `src/app/actions/*.ts`는 `'use server'` 파일 — async 함수만 export 가능

## 파일 구조

```
app/
├── actions/
│   ├── memos.ts      # 메모 CRUD 서버 액션 (getMemos, createMemo, updateMemo, deleteMemo)
│   └── summarize.ts  # AI 요약 서버 액션 (summarizeMemo, memo_summaries 캐시 사용)
├── favicon.ico     # 파비콘
├── globals.css     # 전역 스타일 (Tailwind, 마크다운 프리뷰 보정)
├── layout.tsx      # 루트 레이아웃
└── page.tsx        # 메인 페이지 (/)
```

## 서버 액션 규칙

- 반환 타입은 `ActionResult<T>` (`{ ok: true, data } | { ok: false, error }`). 프로덕션에서는 throw된 에러 메시지가 가려지므로 사용자에게 보여줄 메시지는 결과 객체로 반환한다
- 외부에서 직접 호출될 수 있으므로 입력값(ID는 UUID 형식, 카테고리, 길이 등)을 서버에서 검증한다
- 전체 삭제처럼 파괴적인 액션은 만들지 않는다 (인증이 없어 누구나 호출 가능)
- DB 오류 상세는 `console.error`로만 남기고 사용자에게는 일반 메시지를 반환한다

## Implementation Patterns

### 새 페이지 추가 시

```tsx
'use client'

import { useMemos } from '@/hooks/useMemos'
// 필요한 컴포넌트 import

export default function NewPage() {
  const { memos, loading } = useMemos()

  if (loading) return <div>Loading...</div>

  return <div className="min-h-screen bg-gray-50">{/* 콘텐츠 */}</div>
}
```

### 레이아웃 수정 시

- `layout.tsx`에서 전역 HTML 구조 정의
- `globals.css`에서 Tailwind 기본 설정 및 커스텀 스타일

## Local Golden Rules

### Do's

- 새 페이지 생성 시 폴더 기반 라우팅 사용 (예: `app/settings/page.tsx`)
- 메타데이터는 `layout.tsx` 또는 개별 페이지에서 `metadata` export로 정의
- 로딩 상태 UI 항상 제공

### Don'ts

- 클라이언트 컴포넌트에서 Supabase/Gemini 직접 호출 금지 (서버 액션 경유)
- `pages/` 디렉토리 사용 금지 (App Router 전용)
- `getServerSideProps`, `getStaticProps` 사용 금지 (레거시 패턴)

## 자주 발생하는 실수

1. `'use client'` 누락으로 인한 hydration 에러
2. `'use server'` 파일에서 상수/클래스 등 async 함수가 아닌 값을 export (빌드 에러 유발) — 헬퍼는 `src/utils/`로 분리
3. 서버 컴포넌트에서 브라우저 API 호출
4. 서버 액션 결과의 `ok` 확인 누락 (실패를 성공으로 처리)
