import { KeyRound } from 'lucide-react'
import { PERMISSIONS, type PermissionKey } from '@/lib/permissions'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Header } from '@/components/layout/header'
import { HeaderActions } from '@/components/layout/header-actions'
import { Main } from '@/components/layout/main'
import { usePermissionItems } from './hooks/use-permissions'

/** 权限位中文名（与 PERMISSIONS 常量一致） */
const permissionLabels: Record<PermissionKey, string> = {
  SEARCH: '查询',
  ADD: '新增',
  EDIT: '编辑',
  DELETE: '删除',
  BATCH_DELETE: '批量删除',
  ADD_CHILD: '新增子级',
  RESET: '重置',
  SETTINGS_UPDATE: '设置更新',
}

export function PermissionsPage() {
  const { data, isLoading } = usePermissionItems()

  return (
    <>
      <Header fixed>
        <HeaderActions />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>权限管理</h2>
            <p className='text-muted-foreground'>
              展示系统权限点字典（RBAC 位掩码模型，只读）。
            </p>
          </div>
        </div>

        <div className='overflow-hidden rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow className='group/row'>
                <TableHead>权限标识</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>位值</TableHead>
                <TableHead>图标</TableHead>
                <TableHead>说明</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className='h-24 text-center'>
                    加载中...
                  </TableCell>
                </TableRow>
              ) : data?.length ? (
                data.map((item) => {
                  const key = item.value as PermissionKey
                  const label =
                    permissionLabels[key] ?? item.label ?? item.value
                  return (
                    <TableRow key={item.value} className='group/row'>
                      <TableCell className='font-mono text-sm font-medium'>
                        {item.value}
                      </TableCell>
                      <TableCell>{label}</TableCell>
                      <TableCell className='font-mono text-xs'>
                        {item.bits}（2^{Math.log2(item.bits)}）
                      </TableCell>
                      <TableCell className='font-mono text-xs text-muted-foreground'>
                        <span className='me-1.5 inline-flex text-foreground'>
                          <KeyRound className='size-4' />
                        </span>
                        {item.icon}
                      </TableCell>
                      <TableCell className='text-muted-foreground'></TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className='h-24 text-center'>
                    未找到结果
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <p className='text-sm text-muted-foreground'>
          共 {data?.length ?? 0}{' '}
          个权限点。权限点由系统内置，通过角色授权的位掩码
          <span className='font-mono'>
            ({Object.values(PERMISSIONS).join(' / ')})
          </span>
          组合控制按钮显隐与接口访问。
        </p>
      </Main>
    </>
  )
}
