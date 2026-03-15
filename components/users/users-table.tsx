"use client"

import * as React from "react"
import { api, User } from "@/lib/services/api"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Plus, Search, ShieldAlert } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export function UsersTable() {
    const { user } = useAuth()
    const [users, setUsers] = React.useState<User[]>([])
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState("")

    // Create User state
    const [isCreateOpen, setIsCreateOpen] = React.useState(false)
    const [name, setName] = React.useState("")
    const [email, setEmail] = React.useState("")
    const [password, setPassword] = React.useState("")
    const [role, setRole] = React.useState<"ADMIN" | "CAJERO">("CAJERO")
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    // Pagination & Search states
    const [currentPage, setCurrentPage] = React.useState(1)
    const [totalPages, setTotalPages] = React.useState(1)
    const [searchTerm, setSearchTerm] = React.useState("")
    const [debouncedSearch, setDebouncedSearch] = React.useState("")
    const [limit, setLimit] = React.useState<number>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("invenda_users_limit")
            if (saved) return Number(saved)
        }
        return 10
    })

    // Debounce search
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm)
            setCurrentPage(1)
        }, 500)
        return () => clearTimeout(timer)
    }, [searchTerm])

    React.useEffect(() => {
        if (user?.role === "ADMIN") {
            loadUsers()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, debouncedSearch, limit, user])

    const loadUsers = async () => {
        setLoading(true)
        setError("")
        try {
            const res = await api.getUsers({
                page: currentPage,
                limit: limit,
                search: debouncedSearch || undefined
            })
            setUsers(res.data || [])
            setTotalPages(res.meta?.totalPages || 1)
        } catch (err: any) {
            console.error(err)
            setError(err.message || "Error al cargar usuarios")
        } finally {
            setLoading(false)
        }
    }

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || !email.trim() || !password.trim()) return
        setIsSubmitting(true)
        setError("")
        try {
            await api.createUser({
                name,
                email,
                password,
                role
            })
            setIsCreateOpen(false)
            resetForm()
            await loadUsers()
        } catch (err: any) {
            setError(err.message || "Error al crear el usuario")
        } finally {
            setIsSubmitting(false)
        }
    }

    const resetForm = () => {
        setName("")
        setEmail("")
        setPassword("")
        setRole("CAJERO")
        setError("")
    }

    if (user?.role !== "ADMIN") {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4 rounded-md border text-center">
                <ShieldAlert className="h-10 w-10 text-destructive" />
                <h2 className="text-xl font-semibold">Acceso Denegado</h2>
                <p className="text-muted-foreground">Solo los administradores pueden ver y gestionar usuarios.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto flex-1 relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre o email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-full max-w-sm"
                    />
                </div>
                <Dialog open={isCreateOpen} onOpenChange={(open) => {
                    setIsCreateOpen(open)
                    if (!open) resetForm()
                }}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="w-full sm:w-auto">
                            <Plus className="w-4 h-4 mr-2" />
                            Nuevo Usuario
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                            <DialogDescription>
                                Los usuarios tendrán acceso al dashboard de acuerdo a su rol.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            {error && <div className="text-destructive text-sm font-medium">{error}</div>}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nombre</label>
                                <Input
                                    placeholder="Nombre del empleado"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={isSubmitting}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Correo Electrónico</label>
                                <Input
                                    type="email"
                                    placeholder="correo@ejemplo.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isSubmitting}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Contraseña Temporaria</label>
                                <Input
                                    type="password"
                                    placeholder="******"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isSubmitting}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Rol</label>
                                <Select value={role} onValueChange={(val: "ADMIN" | "CAJERO") => setRole(val)} disabled={isSubmitting}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un rol" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ADMIN">Administrador</SelectItem>
                                        <SelectItem value="CAJERO">Cajero</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? "Creando..." : "Crear Usuario"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead>Creado en</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    Cargando usuarios...
                                </TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    {debouncedSearch ? "No se encontraron usuarios que coincidan con la búsqueda." : "No hay otros usuarios registrados."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((u) => (
                                <TableRow key={u.id}>
                                    <TableCell className="font-medium">{u.name}</TableCell>
                                    <TableCell>{u.email}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === 'ADMIN' ? 'bg-primary/20 text-primary' : 'bg-muted text-foreground'}`}>
                                            {u.role === 'ADMIN' ? 'Admin' : 'Cajero'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground w-full sm:w-auto text-center sm:text-left justify-center sm:justify-start">
                    <span>Mostrar</span>
                    <Select
                        value={limit.toString()}
                        onValueChange={(val) => {
                            setLimit(Number(val));
                            localStorage.setItem("invenda_users_limit", val)
                            setCurrentPage(1);
                        }}
                    >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={limit} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[10, 20, 50].map((pageSize) => (
                                <SelectItem key={pageSize} value={`${pageSize}`}>
                                    {pageSize}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <span>registros</span>
                </div>

                {totalPages > 1 && (
                    <Pagination className="w-auto mx-0 sm:mx-auto">
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <PaginationItem key={page} className="hidden sm:inline-block">
                                    <Button
                                        variant={currentPage === page ? "outline" : "ghost"}
                                        size="icon"
                                        onClick={() => setCurrentPage(page)}
                                        className="w-9 h-9"
                                    >
                                        {page}
                                    </Button>
                                </PaginationItem>
                            ))}

                            <PaginationItem className="sm:hidden">
                                <span className="text-sm text-muted-foreground px-4">
                                    Página {currentPage} de {totalPages}
                                </span>
                            </PaginationItem>

                            <PaginationItem>
                                <PaginationNext
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                )}
            </div>
        </div>
    )
}
