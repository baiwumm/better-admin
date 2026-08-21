import { type LucideIcon } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { HeaderActions } from '@/components/layout/header-actions'
import { Main } from '@/components/layout/main'
import { PagePlaceholder } from '@/components/page-placeholder'

type PlaceholderPageProps = {
  title: string
  description?: string
  icon?: LucideIcon
}

/**
 * 业务占位页面模板：统一 Header + 居中占位内容。
 */
export function PlaceholderPage({
  title,
  description,
  icon,
}: PlaceholderPageProps) {
  return (
    <>
      <Header fixed>
        <HeaderActions />
      </Header>
      <Main className='flex flex-1 flex-col'>
        <PagePlaceholder title={title} description={description} icon={icon} />
      </Main>
    </>
  )
}
