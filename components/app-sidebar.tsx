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
import { Home, Package, DollarSign, Settings, User2, Moon, Sun, ShoppingCart, LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useAuth } from "@/lib/auth-context"

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
    {
        title: "Usuarios",
        url: "/users",
        icon: User2,
    },
]

export function AppSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const { setTheme } = useTheme()
    const { user, logout } = useAuth()

    const handleLogout = async () => {
        await logout()
        router.push("/login")
    }

    // Display name fallback chain: name -> email prefix -> "Usuario"
    const displayName = user?.name || user?.email?.split("@")[0] || "Usuario"
    const displayEmail = user?.email || ""
    const displayRole = user?.role === "ADMIN" ? "Administrador" : "Cajero"

    // Filter items based on role
    const filteredItems = items.filter(item => {
        if (item.title === "Usuarios" && user?.role !== "ADMIN") return false;
        return true;
    });

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
                            {filteredItems.map((item) => (
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
                                            <span className="truncate font-semibold">{displayName}</span>
                                            <span className="truncate text-xs">{displayRole}</span>
                                        </div>
                                    </div>
                                    <Settings className="ml-auto size-4" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg" align="end" side="right" sideOffset={4}>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{displayName}</p>
                                        <p className="text-xs leading-none text-muted-foreground">{displayEmail}</p>
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
                                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Cerrar Sesión</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}

