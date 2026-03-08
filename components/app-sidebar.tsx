"use client"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Home, Package, DollarSign, Settings, User2, Moon, Sun, ShoppingCart } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const items = [
    {
        title: "Inicio",
        url: "/",
        icon: Home,
    },
    {
        title: "Inventario",
        url: "/inventory",
        icon: Package,
    },
    {
        title: "Precios",
        url: "/prices",
        icon: DollarSign,
    },
    {
        title: "Ventas",
        url: "/sales",
        icon: ShoppingCart,
    },
]

export function AppSidebar() {
    const pathname = usePathname()
    const { setTheme } = useTheme()

    return (
        <Sidebar collapsible="icon" className="w-[280px]">
            <SidebarHeader className="p-4 flex items-center h-16 border-b">
                <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
                    <span className="font-bold text-xl truncate">Invenda</span>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup className="pt-6">
                    <SidebarGroupLabel className="text-sm">Menú Principal</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="gap-3 mt-4">
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === item.url}
                                        tooltip={item.title}
                                    >
                                        <Link href={item.url} className="flex items-center gap-3">
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton size="lg" className="w-full flex justify-between">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                            <User2 className="size-4" />
                                        </div>
                                        <div className="grid flex-1 text-left text-sm leading-tight">
                                            <span className="truncate font-semibold">Usuario Admin</span>
                                            <span className="truncate text-xs">admin@invenda.com</span>
                                        </div>
                                    </div>
                                    <Settings className="ml-auto size-4" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg" align="end" side="right" sideOffset={4}>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">Usuario Admin</p>
                                        <p className="text-xs leading-none text-muted-foreground">admin@invenda.com</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setTheme("light")}>
                                    <Sun className="mr-2 h-4 w-4" />
                                    <span>Modo Claro</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTheme("dark")}>
                                    <Moon className="mr-2 h-4 w-4" />
                                    <span>Modo Oscuro</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                    <Settings className="mr-2 h-4 w-4" />
                                    <span>Configuración General</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <User2 className="mr-2 h-4 w-4" />
                                    <span>Perfil de Usuario</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
