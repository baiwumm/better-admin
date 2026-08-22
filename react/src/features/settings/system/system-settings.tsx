'use client'

import { useState } from 'react'
import { AxiosError } from 'axios'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { apiClient } from '@/lib/api-client'
import { type ApiEnvelope, type ApiError, type Setting } from '@/lib/api-types'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Header } from '@/components/layout/header'
import { HeaderActions } from '@/components/layout/header-actions'
import { Main } from '@/components/layout/main'

const groups: { value: Setting['group']; label: string }[] = [
  { value: 'basic', label: '基本设置' },
  { value: 'user', label: '用户设置' },
  { value: 'theme', label: '主题设置' },
  { value: 'system', label: '系统设置' },
]

const groupDescriptions: Record<Setting['group'], string> = {
  basic: '站点基础信息（LOGO、标题、描述等）。',
  user: '用户注册、密码等策略。',
  theme: '主题主色、默认深色模式等。',
  system: '系统级参数（如日志保留天数）。',
}

const useSettings = (group?: Setting['group']) =>
  useQuery({
    queryKey: ['settings', group],
    queryFn: async () => {
      const response = (await apiClient.get('/settings', {
        params: group ? { group } : undefined,
      })) as ApiEnvelope<Setting[]>
      return response.data
    },
  })

interface EditableRow {
  key: string
  value: string
  originalType: 'boolean' | 'number' | 'string' | 'object'
  booleanValue: boolean
}

function serializeValue(setting: Setting): EditableRow {
  const value = setting.value
  if (typeof value === 'boolean') {
    return {
      key: setting.key,
      value: String(value),
      originalType: 'boolean',
      booleanValue: value,
    }
  }
  if (typeof value === 'number') {
    return {
      key: setting.key,
      value: String(value),
      originalType: 'number',
      booleanValue: false,
    }
  }
  if (value && typeof value === 'object') {
    return {
      key: setting.key,
      value: JSON.stringify(value, null, 2),
      originalType: 'object',
      booleanValue: false,
    }
  }
  return {
    key: setting.key,
    value: String(value ?? ''),
    originalType: 'string',
    booleanValue: false,
  }
}

export function SystemSettings() {
  const [activeGroup, setActiveGroup] = useState<Setting['group']>('basic')
  const { data, isLoading } = useSettings(activeGroup)
  const [rows, setRows] = useState<Record<string, EditableRow>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const userPermissions = useAuthStore((state) => state.user?.permissions)

  const canUpdate = hasPermission(userPermissions, PERMISSIONS.SETTINGS_UPDATE)

  const updateRow = (key: string, patch: Partial<EditableRow>) => {
    setRows((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }))
  }

  const saveRow = async (row: EditableRow) => {
    let parsedValue: string | number | boolean | Record<string, unknown>
    if (row.originalType === 'boolean') {
      parsedValue = row.booleanValue
    } else if (row.originalType === 'number') {
      parsedValue = Number(row.value)
    } else if (row.originalType === 'object') {
      try {
        parsedValue = JSON.parse(row.value) as Record<string, unknown>
      } catch {
        toast.error('JSON 格式不正确')
        return
      }
    } else {
      parsedValue = row.value
    }

    setSavingKey(row.key)
    try {
      const response = (await apiClient.put(`/settings/${row.key}`, {
        value: parsedValue,
      })) as ApiEnvelope<Setting>
      // 刷新当前行的原始类型（后端可能归一化 value 类型）
      const fresh = serializeValue(response.data)
      setRows((prev) => ({ ...prev, [row.key]: fresh }))
      toast.success(`设置 ${row.key} 更新成功`)
    } catch (error) {
      let message = '设置更新失败'
      if (error instanceof AxiosError) {
        const errData = error.response?.data as ApiError | undefined
        if (errData?.message) message = errData.message
      }
      toast.error(message)
    } finally {
      setSavingKey(null)
    }
  }

  // 编辑行 = 用户覆盖（rows）优先，否则取服务端实时值
  const currentRows = data
    ? data.map((s) => rows[s.key] ?? serializeValue(s))
    : []

  return (
    <>
      <Header fixed>
        <HeaderActions />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>系统设置</h2>
            <p className='text-muted-foreground'>
              读取与更新系统配置项。
              {!canUpdate && (
                <span className='ms-2 text-destructive'>
                  （当前账号无 SETTINGS_UPDATE 权限，仅可查看）
                </span>
              )}
            </p>
          </div>
        </div>

        <Tabs
          value={activeGroup}
          onValueChange={(value) => setActiveGroup(value as Setting['group'])}
        >
          <TabsList>
            {groups.map((group) => (
              <TabsTrigger key={group.value} value={group.value}>
                {group.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {groups.map((group) => {
            const activeRows = activeGroup === group.value ? currentRows : []
            return (
              <TabsContent
                key={group.value}
                value={group.value}
                className='space-y-4'
              >
                <p className='text-sm text-muted-foreground'>
                  {groupDescriptions[group.value]}
                </p>
                {isLoading ? (
                  <div className='flex h-24 items-center gap-2 text-muted-foreground'>
                    <Loader2 className='size-5 animate-spin' /> 加载设置…
                  </div>
                ) : activeRows.length ? (
                  activeRows.map((row) => (
                    <div
                      key={row.key}
                      className='flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between'
                    >
                      <div className='min-w-40'>
                        <Label className='font-mono text-sm'>{row.key}</Label>
                        <p className='text-xs text-muted-foreground'>
                          {data?.find((s) => s.key === row.key)?.description ??
                            '—'}
                        </p>
                      </div>
                      {row.originalType === 'boolean' ? (
                        <div className='flex items-center gap-4'>
                          <Switch
                            disabled={!canUpdate}
                            checked={row.booleanValue}
                            onCheckedChange={(checked) =>
                              updateRow(row.key, { booleanValue: checked })
                            }
                          />
                          {canUpdate && (
                            <Button
                              size='sm'
                              onClick={() => void saveRow(row)}
                              disabled={savingKey === row.key}
                            >
                              {savingKey === row.key ? (
                                <Loader2 className='animate-spin' />
                              ) : (
                                <Save size={14} />
                              )}
                              保存
                            </Button>
                          )}
                        </div>
                      ) : row.originalType === 'object' ? (
                        <div className='flex flex-1 flex-col gap-2 sm:max-w-md'>
                          <Textarea
                            disabled={!canUpdate}
                            className='h-28 resize-none font-mono text-xs'
                            value={row.value}
                            onChange={(e) =>
                              updateRow(row.key, { value: e.target.value })
                            }
                          />
                          {canUpdate && (
                            <div className='flex justify-end'>
                              <Button
                                size='sm'
                                onClick={() => void saveRow(row)}
                                disabled={savingKey === row.key}
                              >
                                保存
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className='flex flex-1 flex-col gap-2 sm:max-w-md sm:flex-row sm:items-center sm:justify-end sm:gap-2'>
                          <Input
                            disabled={!canUpdate}
                            type={
                              row.originalType === 'number' ? 'number' : 'text'
                            }
                            value={row.value}
                            onChange={(e) =>
                              updateRow(row.key, { value: e.target.value })
                            }
                          />
                          {canUpdate && (
                            <Button
                              size='sm'
                              onClick={() => void saveRow(row)}
                              disabled={savingKey === row.key}
                            >
                              {savingKey === row.key ? (
                                <Loader2 className='animate-spin' />
                              ) : (
                                <Save size={14} />
                              )}
                              保存
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className='py-8 text-center text-sm text-muted-foreground'>
                    该分组暂无设置项
                  </p>
                )}
              </TabsContent>
            )
          })}
        </Tabs>

        {currentRows.length > 0 && (
          <p className='text-xs text-muted-foreground'>
            修改后点击对应「保存」按钮生效。
          </p>
        )}
      </Main>
    </>
  )
}
