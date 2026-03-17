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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
import { Edit, Plus, Search, ShieldAlert, Trash2 } from "lucide-react"
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

    // Edit User state
    const [isEditOpen, setIsEditOpen] = React.useState(false)
    const [currentUser, setCurrentUser] = React.useState<User | null>(null)
    const [editName, setEditName] = React.useState("")
    const [editEmail, setEditEmail] = React.useState("")
    const [editPassword, setEditPassword] = React.useState("")
    const [editRole, setEditRole] = React.useState<"ADMIN" | "CAJERO">("CAJERO")

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
            const res = await api.getUsers()
            // Filter by search term locally
            let currentUsers = res || [];
            if (debouncedSearch) {
                const term = debouncedSearch.toLowerCase();
                currentUsers = currentUsers.filter(u =>
                    u.name?.toLowerCase().includes(term) ||
                    u.email.toLowerCase().includes(term) ||
                    u.role.toLowerCase().includes(term)
                );
            }
            setUsers(currentUsers)
            setTotalPages(Math.max(1, Math.ceil(currentUsers.length / limit)))
            // Safety check if we deleted the last item on a page
            if (currentPage > 1 && currentUsers.length === 0 && res.length > 0) {
                setCurrentPage(Math.max(1, Math.ceil(currentUsers.length / limit)))
            }
        } catch (err: any) {
            console.error(err)
            setError(err.message || "Error al cargar usuarios")
        } finally {
            setLoading(false)
        }
    }

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        if (!name.trim()) {
            setError("El nombre es requerido");
            return;
        }
        if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
            setError("Ingresa un correo electrónico válido");
            return;
        }
        if (password.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres");
            return;
        }

        setIsSubmitting(true)
        try {
            await api.createUser({
                name,
                email,
                password,
                role
            })
            setIsCreateOpen(false)
            resetCreateForm()
            await loadUsers()
        } catch (err: any) {
            setError(err.message || "Error al crear el usuario")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleEditUser = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        if (!currentUser) return;

        if (!editName.trim()) {
            setError("El nombre es requerido");
            return;
        }
        if (!editEmail.trim() || !/^\S+@\S+\.\S+$/.test(editEmail)) {
            setError("Ingresa un correo electrónico válido");
            return;
        }
        if (editPassword.trim() && editPassword.length < 6) {
            setError("Si vas a cambiarla, la contraseña debe tener al menos 6 caracteres");
            return;
        }

        setIsSubmitting(true)
        try {
            const updates: any = {
                name: editName,
                email: editEmail,
                role: editRole,
            }
            // Only include password if admin typed a new one
            if (editPassword.trim()) {
                updates.password = editPassword
            }
            await api.updateUser(currentUser.id, updates)
            setIsEditOpen(false)
            setCurrentUser(null)
            await loadUsers()
        } catch (err: any) {
            setError(err.message || "Error al actualizar el usuario")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteUser = async (id: string) => {
        try {
            await api.deleteUser(id)
            await loadUsers()
        } catch (err: any) {
            setError(err.message || "Error al eliminar el usuario")
        }
    }

    const openEdit = (u: User) => {
        setCurrentUser(u)
        setEditName(u.name || "")
        setEditEmail(u.email)
        setEditPassword("")
        setEditRole(u.role)
        setError("")
        setIsEditOpen(true)
    }

    const resetCreateForm = () => {
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
                    if (!open) resetCreateForm()
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
                                    minLength={6}
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

            {error && !isCreateOpen && !isEditOpen && (
                <div className="text-destructive text-sm font-medium">{error}</div>
            )}

            {/* Table wrapper with overflow for responsive */}
            <div className="border rounded-md overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead className="hidden md:table-cell">Creado en</TableHead>
                            <TableHead className="w-[100px] text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Cargando usuarios...
                                </TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
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
                                    <TableCell className="hidden md:table-cell text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            {/* Prevent deleting yourself */}
                                            {u.id !== user?.id && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-destructive">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Esta acción no se puede deshacer. Se eliminará permanentemente al usuario
                                                                &quot;{u.name || u.email}&quot; del sistema.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDeleteUser(u.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                Eliminar
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                        </div>
                                    </TableCell>
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

            {/* Edit User Dialog */}
            <Dialog open={isEditOpen} onOpenChange={(open) => {
                setIsEditOpen(open)
                if (!open) {
                    setCurrentUser(null)
                    setError("")
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Usuario</DialogTitle>
                        <DialogDescription>
                            Modifica los datos del usuario. Si ingresas una nueva contraseña, se le pedirá cambiarla al iniciar sesión.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditUser} className="space-y-4">
                        {error && <div className="text-destructive text-sm font-medium">{error}</div>}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nombre</label>
                            <Input
                                placeholder="Nombre del empleado"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                disabled={isSubmitting}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Correo Electrónico</label>
                            <Input
                                type="email"
                                placeholder="correo@ejemplo.com"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                disabled={isSubmitting}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nueva Contraseña <span className="text-muted-foreground font-normal">(Opcional)</span></label>
                            <Input
                                type="password"
                                placeholder="Dejar vacío para no cambiar"
                                value={editPassword}
                                onChange={(e) => setEditPassword(e.target.value)}
                                disabled={isSubmitting}
                                minLength={6}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Rol</label>
                            <Select value={editRole} onValueChange={(val: "ADMIN" | "CAJERO") => setEditRole(val)} disabled={isSubmitting}>
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
                                {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
