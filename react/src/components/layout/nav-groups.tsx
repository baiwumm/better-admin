import { type ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
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
  type NavGroup as NavGroupProps,
  type NavItem,
  type NavLink,
} from './types'

/**
 * 「标签/分组」模式渲染：顶层菜单节点作为分组标题（SidebarGroupLabel），
 * 其直接子项平铺展示、不可折叠，与菜单管理的分组一一对应。
 * 若某个子项自身仍有子级（多级菜单），则退化为可折叠子组，避免丢菜单。
 */
export function NavGroups({ groups }: { groups: NavGroupProps[] }) {
  return (
    <>
      {groups.map((group) => (
        <NavGroup key={group.title} {...group} />
      ))}
    </>
  )
}

function NavBadge({ children }: { children: ReactNode }) {
  return <Badge className='rounded-full px-1 py-0 text-xs'>{children}</Badge>
}

function checkIsActive(href: string, item: NavItem, mainNav = false) {
  return (
    ('url' in item && href === item.url) ||
    ('url' in item && href.split('?')[0] === item.url) ||
    !!item?.items?.filter((i) => 'url' in i && i.url === href).length ||
    (mainNav &&
      'url' in item &&
      href.split('/')[1] !== '' &&
      href.split('/')[1] === item?.url?.split('/')[1])
  )
}

function NavGroup({ title, items }: NavGroupProps) {
  const href = useLocation({ select: (location) => location.href })
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const key = `${item.title}-${'url' in item ? item.url : ''}`
          if (!item.items)
            return <NavLeaf key={key} item={item} href={href} />
          return <NavCollapsibleItem key={key} item={item} href={href} />
        })}
      </SidebarMenu>
    </SidebarGroup>
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

/** 多级菜单在分组模式下的兜底：自身仍有子级时渲染为可折叠子组。 */
function NavCollapsibleItem({
  item,
  href,
}: {
  item: NavCollapsible
  href: string
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
