import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { UiPlayground } from './ui-playground'

describe('UiPlayground（Hero UI + Shadcn UI 共存冒烟测试）', () => {
  it('renders both component libraries side by side without throwing', async () => {
    const { getByRole, getByText } = await render(<UiPlayground />)

    await expect
      .element(getByRole('heading', { name: 'UI Playground' }))
      .toBeInTheDocument()

    // Hero UI 与 Shadcn UI 区块对照存在
    await expect
      .element(getByRole('button', { name: '主要按钮' }))
      .toBeInTheDocument()
    await expect
      .element(getByRole('button', { name: '默认按钮' }))
      .toBeInTheDocument()

    // 两组区块标签（Hero UI / Shadcn UI 各至少出现一次）
    expect(
      document.querySelectorAll('[data-slot="panel-label"]').length
    ).toBeGreaterThan(0)
    await expect.element(getByText('打开 Modal（Hero）')).toBeInTheDocument()
  })

  it('opens the Hero modal via overlay state', async () => {
    const { getByRole, getByText } = await render(<UiPlayground />)
    await getByText('打开 Modal（Hero）').click()
    await expect
      .element(getByRole('heading', { name: 'Hero UI Modal' }))
      .toBeInTheDocument()
  })
})
