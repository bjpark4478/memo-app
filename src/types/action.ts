// 서버 액션 반환 타입. 프로덕션에서는 throw된 에러 메시지가 가려지므로 결과 객체로 반환한다.
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }
