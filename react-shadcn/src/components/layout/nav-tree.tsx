import { type ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Badge } from '../ui/badge'
import {
  type NavCollapsible,
  type NavItem,
  type NavLink,
  type NavTree,
} from './types'

/**
 * 侧边栏菜单树渲染（与菜单管理结构一致）。
 * 直接递归渲染后端菜单树：有子级的节点为可折叠父级，叶子为链接项，
 * 不使用 SidebarGroupLabel 分组标题。
 */
export function NavTree({ items }: { items: NavTree }) {
  const href = useLocation({ select: (location) => location.href })
  return (
    <SidebarMenu>
      {items.map((item) => {
        const key = `${item.title}-${'url' in item ? item.url : ''}`
        if (!item.items) return <NavLeaf key={key} item={item} href={href} />
        return <NavCollapsibleItem key={key} item={item} href={href} />
      })}
    </SidebarMenu>
  )
}

function NavBadge({ children }: { children: ReactNode }) {
  return <Badge className='rounded-full px-1 py-0 text-xs'>{children}</Badge>
}

function checkIsActive(
  href: string,
  item: NavItem,
  mainNav = false
): boolean {
  return (
    ('url' in item && href === item.url) || // /endpoint?search=param
    ('url' in item && href.split('?')[0] === item.url) || // endpoint
    !!item?.items?.filter((i) => 'url' in i && i.url === href).length || // child active
    (mainNav &&
      'url' in item &&
      href.split('/')[1] !== '' &&
      href.split('/')[1] === item?.url?.split('/')[1])
  )
}

function NavLeaf({ item, href }: { item: NavLink; href: string }) {
  const { setOpenMobile } = useSidebar()
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={checkIsActive(href, item)}
        tooltip={item.title}
      >
        <Link to={item.url} onClick={() => setOpenMobile(false)}>
          {item.icon && <item.icon />}
          <span>{item.title}</span>
          {item.badge && <NavBadge>{item.badge}</NavBadge>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function NavCollapsibleItem({
  item,
  href,
  depth = 0,
}: {
  item: NavCollapsible
  href: string
  depth?: number
}) {
  const { setOpenMobile } = useSidebar()

  return (
    <Collapsible
      asChild
      defaultOpen={item.defaultOpen ?? false}
      className='group/collapsible'
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.title}>
            {item.icon && <item.icon />}
            <span>{item.title}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
            <ChevronRight className='ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 rtl:rotate-180' />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className='CollapsibleContent'>
          <SidebarMenuSub>
            {item.items.map((subItem) => {
              const key = `${subItem.title}-${'url' in subItem ? subItem.url : ''}`
              if (!subItem.items)
                return (
                  <SidebarMenuSubItem key={key}>
                    <SidebarMenuSubButton
                      asChild
                      isActive={checkIsActive(href, subItem as NavItem)}
                    >
                      <Link
                        to={subItem.url}
                        onClick={() => setOpenMobile(false)}
                      >
                        {subItem.icon && <subItem.icon />}
                        <span>{subItem.title}</span>
                        {subItem.badge && <NavBadge>{subItem.badge}</NavBadge>}
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                )
              return (
                <SidebarMenuSubItem key={key}>
                  <NavCollapsibleItem
                    item={subItem as NavCollapsible}
                    href={href}
                    depth={depth + 1}
                  />
                </SidebarMenuSubItem>
              )
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}
