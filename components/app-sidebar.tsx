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
import { Home, Package, DollarSign, User2, ShoppingCart, LogOut, KeyRound, Sun, Moon } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/services/api"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import * as React from "react"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Settings } from "lucide-react"

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
    const { theme, setTheme } = useTheme()
    const { user, logout } = useAuth()

    // Change password state
    const [isPasswordOpen, setIsPasswordOpen] = React.useState(false)
    const [currentPassword, setCurrentPassword] = React.useState("")
    const [newPassword, setNewPassword] = React.useState("")
    const [passwordError, setPasswordError] = React.useState("")
    const [passwordSuccess, setPasswordSuccess] = React.useState("")
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const handleLogout = async () => {
        await logout()
        router.push("/login")
    }

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentPassword.trim() || !newPassword.trim()) return
        setIsSubmitting(true)
        setPasswordError("")
        setPasswordSuccess("")
        try {
            await api.changePassword(currentPassword, newPassword)
            setPasswordSuccess("Contraseña actualizada correctamente.")
            setCurrentPassword("")
            setNewPassword("")
            // Auto-close after a short delay
            setTimeout(() => {
                setIsPasswordOpen(false)
                setPasswordSuccess("")
            }, 1500)
        } catch (err: any) {
            setPasswordError(err.message || "Error al cambiar la contraseña")
        } finally {
            setIsSubmitting(false)
        }
    }

    const resetPasswordForm = () => {
        setCurrentPassword("")
        setNewPassword("")
        setPasswordError("")
        setPasswordSuccess("")
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

    const isDark = theme === "dark"

    return (
        <>
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
                                    <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                                        <div className="flex aspect-square min-w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                            <User2 className="size-4" />
                                        </div>
                                        <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                                            <span className="truncate font-semibold">{displayName}</span>
                                            <span className="truncate text-xs">{displayRole}</span>
                                        </div>
                                        <Settings className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
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

                                    {/* Theme toggle with Switch */}
                                    <DropdownMenuItem
                                        onSelect={(e) => e.preventDefault()}
                                        className="flex items-center justify-between cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                                            <Label htmlFor="theme-switch" className="cursor-pointer font-normal">
                                                Modo Oscuro
                                            </Label>
                                        </div>
                                        <Switch
                                            id="theme-switch"
                                            checked={isDark}
                                            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                                        />
                                    </DropdownMenuItem>

                                    {/* Change Password */}
                                    <DropdownMenuItem onClick={() => setIsPasswordOpen(true)}>
                                        <KeyRound className="mr-2 h-4 w-4" />
                                        <span>Cambiar Contraseña</span>
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

            {/* Change Password Dialog */}
            <Dialog open={isPasswordOpen} onOpenChange={(open) => {
                setIsPasswordOpen(open)
                if (!open) resetPasswordForm()
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cambiar Contraseña</DialogTitle>
                        <DialogDescription>
                            Introduce tu contraseña actual y la nueva contraseña.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        {passwordError && <div className="text-destructive text-sm font-medium">{passwordError}</div>}
                        {passwordSuccess && <div className="text-green-600 text-sm font-medium">{passwordSuccess}</div>}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Contraseña Actual</label>
                            <Input
                                type="password"
                                placeholder="••••••"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                disabled={isSubmitting}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nueva Contraseña</label>
                            <Input
                                type="password"
                                placeholder="••••••"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={isSubmitting}
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Guardando..." : "Cambiar Contraseña"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}
