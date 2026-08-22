import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { SignOutDialog } from './sign-out-dialog'

const logout = vi.fn(() => Promise.resolve())
const onOpenChange = vi.fn()

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => selector({ logout }),
}))

describe('SignOutDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls logout and closes the dialog when confirmed', async () => {
    const { getByRole } = await render(
      <SignOutDialog open onOpenChange={onOpenChange} />
    )

    await userEvent.click(getByRole('button', { name: /退出登录/i }))

    expect(logout).toHaveBeenCalledOnce()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not call logout when Cancel is clicked', async () => {
    const { getByRole } = await render(
      <SignOutDialog open onOpenChange={onOpenChange} />
    )

    await userEvent.click(getByRole('button', { name: /取消/i }))

    expect(logout).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })
})
