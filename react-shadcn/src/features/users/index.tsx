import { getRouteApi } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { HeaderActions } from '@/components/layout/header-actions'
import { Main } from '@/components/layout/main'
import { UsersDialogs } from './components/users-dialogs'
import { UsersPrimaryButtons } from './components/users-primary-buttons'
import { UsersProvider } from './components/users-provider'
import { UsersTable } from './components/users-table'
import { useUsers } from './hooks/use-users'

const route = getRouteApi('/_authenticated/users/')

export function Users() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const { data, isLoading, isFetching } = useUsers({
    page: search.page ?? 1,
    pageSize: search.pageSize ?? 10,
    search: search.search || undefined,
    status: search.status?.[0],
    sort: search.sort,
    order: search.order,
  })

  return (
    <UsersProvider>
      <Header fixed>
        <HeaderActions />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>用户管理</h2>
            <p className='text-muted-foreground'>管理系统用户及其状态。</p>
          </div>
          <UsersPrimaryButtons />
        </div>
        <UsersTable
          data={data?.data ?? []}
          total={data?.pagination.total ?? 0}
          isLoading={isLoading}
          isFetching={isFetching}
          search={search as unknown as Record<string, unknown>}
          navigate={navigate}
        />
      </Main>

      <UsersDialogs />
    </UsersProvider>
  )
}
