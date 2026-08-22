import { beforeEach, describe, expect, it, vi } from 'vitest'

async function importAuthStore() {
  const { useAuthStore } = await import('./auth-store')
  return useAuthStore
}

const sampleUser = {
  id: 'user-1',
  username: 'admin',
  displayName: '管理员',
  roles: ['super_admin'],
  permissions: '9223372036854775807',
}

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.resetModules()
  })

  it('starts with empty auth state when nothing is persisted', async () => {
    const useAuthStore = await importAuthStore()

    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('persists user/accessToken/isAuthenticated so a new store instance reads it back', async () => {
    const useAuthStore = await importAuthStore()
    useAuthStore.setState({
      user: sampleUser,
      accessToken: 'session-token',
      isAuthenticated: true,
    })

    vi.resetModules()
    const useAuthStoreAfterReload = await importAuthStore()

    expect(useAuthStoreAfterReload.getState().user).toEqual(sampleUser)
    expect(useAuthStoreAfterReload.getState().accessToken).toBe('session-token')
    expect(useAuthStoreAfterReload.getState().isAuthenticated).toBe(true)
  })

  it('updates the signed-in user via setUser', async () => {
    const useAuthStore = await importAuthStore()

    useAuthStore.getState().setUser({ ...sampleUser })

    expect(useAuthStore.getState().user).toEqual(sampleUser)
  })

  it('resetAuth clears user/accessToken/isAuthenticated and drops persistence', async () => {
    const useAuthStore = await importAuthStore()
    useAuthStore.setState({
      user: sampleUser,
      accessToken: 'will-be-cleared',
      isAuthenticated: true,
    })

    useAuthStore.getState().resetAuth()

    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)

    vi.resetModules()
    const useAuthStoreAfterReload = await importAuthStore()

    expect(useAuthStoreAfterReload.getState().user).toBeNull()
    expect(useAuthStoreAfterReload.getState().accessToken).toBeNull()
  })
})
