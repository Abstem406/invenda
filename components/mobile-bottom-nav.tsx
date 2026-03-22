"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useAuth } from "@/lib/auth-context"
import { useIsMobile } from "@/hooks/use-mobile"
import { api } from "@/lib/services/api"

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
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
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

import {
    Home,
    Package,
    ShoppingCart,
    MoreHorizontal,
    User2,
    Moon,
    Sun,
    KeyRound,
    LogOut,
} from "lucide-react"

// Primary nav items visible in the bottom bar
const primaryItems = [
    { title: "Inicio", url: "/", icon: Home },
    { title: "Inventario", url: "/inventory", icon: Package },
    { title: "Ventas", url: "/sales", icon: ShoppingCart },
]

export function MobileBottomNav() {
    const pathname = usePathname()
    const router = useRouter()
    const isMobile = useIsMobile()
    const { theme, setTheme } = useTheme()
    const { user, logout } = useAuth()

    const [sheetOpen, setSheetOpen] = React.useState(false)

    // Change password state
    const [isPasswordOpen, setIsPasswordOpen] = React.useState(false)
    const [currentPassword, setCurrentPassword] = React.useState("")
    const [newPassword, setNewPassword] = React.useState("")
    const [passwordError, setPasswordError] = React.useState("")
    const [passwordSuccess, setPasswordSuccess] = React.useState("")
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const isDark = theme === "dark"
    const isAdmin = user?.role === "ADMIN"

    const handleLogout = async () => {
        setSheetOpen(false)
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

    // Don't render on desktop
    if (!isMobile) return null

    return (
        <>
            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <div className="flex items-center justify-around h-16 px-2">
                    {primaryItems.map((item) => {
                        const isActive = pathname === item.url
                        return (
                            <Link
                                key={item.url}
                                href={item.url}
                                className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${isActive
                                        ? "text-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                <item.icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                                <span className="text-[10px] font-medium leading-none">
                                    {item.title}
                                </span>
                            </Link>
                        )
                    })}

                    {/* "More" button that opens the Sheet */}
                    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                        <SheetTrigger asChild>
                            <button
                                className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${sheetOpen
                                        ? "text-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                <MoreHorizontal className="h-5 w-5" />
                                <span className="text-[10px] font-medium leading-none">
                                    Más
                                </span>
                            </button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
                            <SheetHeader className="pb-4">
                                <SheetTitle>Opciones</SheetTitle>
                            </SheetHeader>
                            <div className="grid grid-cols-3 gap-4">
                                {/* Users link - only for admins */}
                                {isAdmin && (
                                    <Link
                                        href="/users"
                                        onClick={() => setSheetOpen(false)}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors ${pathname === "/users"
                                                ? "bg-primary/10 text-primary"
                                                : "hover:bg-muted"
                                            }`}
                                    >
                                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10">
                                            <User2 className="h-6 w-6 text-blue-500" />
                                        </div>
                                        <span className="text-xs font-medium">Usuarios</span>
                                    </Link>
                                )}

                                {/* Theme toggle */}
                                <button
                                    onClick={() => setTheme(isDark ? "light" : "dark")}
                                    className="flex flex-col items-center gap-2 p-4 rounded-xl transition-colors hover:bg-muted"
                                >
                                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10">
                                        {isDark ? (
                                            <Moon className="h-6 w-6 text-amber-500" />
                                        ) : (
                                            <Sun className="h-6 w-6 text-amber-500" />
                                        )}
                                    </div>
                                    <span className="text-xs font-medium">
                                        {isDark ? "Modo Claro" : "Modo Oscuro"}
                                    </span>
                                </button>

                                {/* Change password */}
                                <button
                                    onClick={() => {
                                        setSheetOpen(false)
                                        setTimeout(() => setIsPasswordOpen(true), 200)
                                    }}
                                    className="flex flex-col items-center gap-2 p-4 rounded-xl transition-colors hover:bg-muted"
                                >
                                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10">
                                        <KeyRound className="h-6 w-6 text-emerald-500" />
                                    </div>
                                    <span className="text-xs font-medium">Contraseña</span>
                                </button>

                                {/* Logout */}
                                <button
                                    onClick={handleLogout}
                                    className="flex flex-col items-center gap-2 p-4 rounded-xl transition-colors hover:bg-muted"
                                >
                                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10">
                                        <LogOut className="h-6 w-6 text-red-500" />
                                    </div>
                                    <span className="text-xs font-medium text-destructive">Salir</span>
                                </button>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </nav>

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
