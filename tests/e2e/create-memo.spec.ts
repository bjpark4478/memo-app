import { expect, test, type Page } from '@playwright/test'

const TIMEOUT = 15_000

function countText(page: Page) {
  return page.getByText(/총 \d+개의 메모/)
}

async function readCount(page: Page): Promise<number> {
  const text = await countText(page).first().innerText()
  const match = text.match(/총 (\d+)개의 메모/)
  if (!match) throw new Error(`메모 개수 문구를 해석할 수 없습니다: ${text}`)
  return Number(match[1])
}

function cardByTitle(page: Page, title: string) {
  return page
    .locator('[data-testid="memo-item"]')
    .filter({ has: page.locator('h3', { hasText: title }) })
}

/** 테스트가 만든 메모(고유 제목, E2E 접두사)만 UI 삭제 버튼으로 정리한다. */
async function cleanupMemo(page: Page, title: string) {
  if (page.isClosed()) return
  await page.goto('/')
  await expect(countText(page).first()).toBeVisible({ timeout: TIMEOUT })

  const card = cardByTitle(page, title)
  for (let attempt = 0; attempt < 2; attempt++) {
    if ((await card.count()) === 0) return
    page.once('dialog', dialog => dialog.accept())
    await card.first().locator('button[title="삭제"]').click()
    try {
      await expect(card).toHaveCount(0, { timeout: TIMEOUT })
      // 새로고침 후에도 사라졌는지 확인 (DB 반영)
      await page.reload()
      await expect(countText(page).first()).toBeVisible({ timeout: TIMEOUT })
      if ((await card.count()) === 0) return
    } catch {
      await page.reload()
      await expect(countText(page).first()).toBeVisible({ timeout: TIMEOUT })
    }
  }
  if ((await card.count()) > 0) {
    console.error(`[cleanup 실패] 남은 테스트 메모 제목: ${title}`)
  }
}

test.describe('새 메모 작성', () => {
  test.setTimeout(90_000)
  let title = ''

  test.afterEach(async ({ page }) => {
    await cleanupMemo(page, title)
  })

  test('제목, 카테고리, 마크다운 내용, 태그로 새 메모를 작성하면 목록 맨 앞에 표시된다', async ({
    page,
  }) => {
    title = `E2E 작성 ${Date.now()}`

    // 1. 목록 로딩 및 개수 기록
    await page.goto('/')
    await expect(countText(page).first()).toBeVisible({ timeout: TIMEOUT })
    const before = await readCount(page)

    // 2. 새 메모 모달 열기
    await page.getByRole('button', { name: '새 메모' }).click()
    await expect(page.getByText('새 메모 작성')).toBeVisible()
    const form = page.locator('form')
    await expect(form.locator('#title')).toBeVisible()
    await expect(form.locator('#content')).toBeVisible()

    // 3. 제목 없이 저장 -> 브라우저 기본 검증, 모달 유지
    await page.getByRole('button', { name: '저장하기' }).click()
    const titleMessage = await form
      .locator('#title')
      .evaluate((el: HTMLInputElement) => el.validationMessage)
    expect(titleMessage).not.toBe('')
    await expect(page.getByText('새 메모 작성')).toBeVisible()
    expect(await readCount(page)).toBe(before)

    // 4. 입력 및 프리뷰 확인
    await form.locator('#title').fill(title)
    await form.locator('#category').selectOption('업무')
    await form
      .locator('#content')
      .fill('# E2E 제목\n\n**굵게** 텍스트\n\n- 항목 1\n- 항목 2')
    await expect(form.locator('.w-md-editor-preview h1')).toHaveText(
      'E2E 제목',
      { timeout: TIMEOUT }
    )

    // 5. 태그 Enter -> 칩 추가, 폼 제출되지 않음
    const tagInput = page.getByPlaceholder('태그를 입력하고 Enter를 누르세요')
    await tagInput.fill('e2e')
    await tagInput.press('Enter')
    await expect(form.getByText('#e2e', { exact: true })).toBeVisible()
    await expect(tagInput).toHaveValue('')
    await expect(page.getByText('새 메모 작성')).toBeVisible()
    expect(await readCount(page)).toBe(before)

    // 6. 저장 -> 모달 닫힘, 에러 배너 없음
    await page.getByRole('button', { name: '저장하기' }).click()
    await expect(page.getByText('새 메모 작성')).toBeHidden({
      timeout: TIMEOUT,
    })
    await expect(page.locator('[data-testid="error-banner"]')).toHaveCount(0)

    // 7. 맨 앞 카드, 제목/배지/태그
    const first = page.locator('[data-testid="memo-item"]').first()
    await expect(first.locator('h3')).toHaveText(title, { timeout: TIMEOUT })
    await expect(first.getByText('업무', { exact: true })).toBeVisible()
    await expect(first.getByText('#e2e', { exact: true })).toBeVisible()

    // 8. 평문 미리보기
    await expect(first).toContainText('E2E 제목 굵게 텍스트 항목 1 항목 2')
    await expect(first).not.toContainText('**')
    await expect(first).not.toContainText('# E2E')

    // 9. 개수 +1
    await expect(
      page.getByText(`총 ${before + 1}개의 메모`).first()
    ).toBeVisible({ timeout: TIMEOUT })

    // 10. 새로고침 후 유지
    await page.reload()
    await expect(countText(page).first()).toBeVisible({ timeout: TIMEOUT })
    await expect(cardByTitle(page, title)).toHaveCount(1, { timeout: TIMEOUT })
    await expect(
      page.locator('[data-testid="memo-item"]').first().locator('h3')
    ).toHaveText(title)
  })
})
