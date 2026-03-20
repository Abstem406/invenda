"use client"

import * as React from "react"
import { api, Product, Category } from "@/lib/services/api"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import { Edit, Plus, Trash2, ArrowUpDown } from "lucide-react"

export function ProductsTable({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
    const [products, setProducts] = React.useState<Product[]>([])
    const [categories, setCategories] = React.useState<Category[]>([])
    const [loading, setLoading] = React.useState(true)

    // Dialog states
    const [isCreateOpen, setIsCreateOpen] = React.useState(false)
    const [isEditOpen, setIsEditOpen] = React.useState(false)
    const [currentProduct, setCurrentProduct] = React.useState<Product | null>(null)

    // Form states
    const [name, setName] = React.useState("")
    const [categoryId, setCategoryId] = React.useState("")
    const [stock, setStock] = React.useState("")
    const [status, setStatus] = React.useState<"1" | "2">("1")
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [error, setError] = React.useState("")

    // Pagination & Search states
    const [currentPage, setCurrentPage] = React.useState(1)
    const [totalPages, setTotalPages] = React.useState(1)
    const [searchTerm, setSearchTerm] = React.useState("")
    const [debouncedSearch, setDebouncedSearch] = React.useState("")
    const [limit, setLimit] = React.useState<number>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("invenda_products_limit")
            if (saved) return Number(saved)
        }
        return 5
    })

    // Sorting state (kept for visual consistency, though server might need it later)
    const [sortOrder, setSortOrder] = React.useState<"asc" | "desc" | null>(null)

    // Debounce search
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm)
            setCurrentPage(1)
        }, 500)
        return () => clearTimeout(timer)
    }, [searchTerm])

    React.useEffect(() => {
        loadData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, debouncedSearch, refreshTrigger, limit])

    const loadData = async () => {
        setLoading(true)
        try {
            const [prodsRes, catsRes] = await Promise.all([
                api.getProducts({
                    page: currentPage,
                    limit: limit,
                    search: debouncedSearch || undefined
                }),
                // Consider fetching all categories for the dropdown, bypassing pagination if possible
                // For now, we fetch a large limit just for the dropdown, or use the paginated one
                api.getCategories({ limit: 100 })
            ])
            setProducts(prodsRes.data)
            setTotalPages(prodsRes.meta.totalPages)
            setCategories(catsRes.data) // Using .data because getCategories is now PaginatedResponse

            if (currentPage > 1 && prodsRes.data.length === 0 && prodsRes.meta.total > 0) {
                setCurrentPage(prodsRes.meta.totalPages);
            }
        } catch (error) {
            console.error("Error loading products", error);
        } finally {
            setLoading(false)
        }
    }

    const sortedProducts = React.useMemo(() => {
        if (!sortOrder) return products;
        return [...products].sort((a, b) => {
            if (sortOrder === "asc") return a.stock - b.stock;
            return b.stock - a.stock;
        });
    }, [products, sortOrder]);

    const resetForm = () => {
        setName("")
        setCategoryId("")
        setStock("")
        setStatus("1")
        setCurrentProduct(null)
        setError("")
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        if (!name.trim()) {
            setError("El nombre del producto es requerido");
            return;
        }
        if (!categoryId) {
            setError("Debes seleccionar una categoría");
            return;
        }
        if (stock === "" || parseInt(stock, 10) < 0) {
            setError("El stock debe ser un número mayor o igual a 0");
            return;
        }

        setIsSubmitting(true)
        try {
            await api.createProduct({
                name,
                categoryId,
                stock: parseInt(stock, 10),
                status: parseInt(status, 10) as 1 | 2
            })
            await loadData()
            setIsCreateOpen(false)
            resetForm()
        } catch (err: any) {
            setError(err.message || "Error al crear el producto");
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        if (!currentProduct) return;
        if (!name.trim()) {
            setError("El nombre del producto es requerido");
            return;
        }
        if (!categoryId) {
            setError("Debes seleccionar una categoría");
            return;
        }
        if (stock === "" || parseInt(stock, 10) < 0) {
            setError("El stock debe ser un número mayor o igual a 0");
            return;
        }

        setIsSubmitting(true)
        try {
            await api.updateProduct(currentProduct.id, {
                name,
                categoryId,
                stock: parseInt(stock, 10),
                status: parseInt(status, 10) as 1 | 2,
            })
            await loadData()
            setIsEditOpen(false)
            resetForm()
        } catch (err: any) {
            setError(err.message || "Error al actualizar el producto");
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        await api.deleteProduct(id)
        await loadData()
    }

    const handleStatusChange = async (id: string, newStatus: string) => {
        await api.updateProduct(id, { status: parseInt(newStatus, 10) as 1 | 2 })
        await loadData()
    }

    const openEdit = (prod: Product) => {
        setCurrentProduct(prod)
        setName(prod.name)
        setCategoryId(prod.categoryId)
        setStock(prod.stock.toString())
        setStatus(prod.status.toString() as "1" | "2")
        setError("")
        setIsEditOpen(true)
    }

    const getCategoryName = (id: string) => {
        return categories.find(c => c.id === id)?.name || "Desconocida"
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto flex-1">
                    <h2 className="text-xl font-semibold hidden sm:block">Productos</h2>
                    <Input
                        placeholder="Buscar producto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-xs"
                    />
                </div>
                <Dialog open={isCreateOpen} onOpenChange={(val) => {
                    setIsCreateOpen(val);
                    if (!val) resetForm();
                    else {
                        // Refetch categories when opening the create product modal to ensure we have the latest
                        api.getCategories({ limit: 100 }).then(catsRes => setCategories(catsRes.data)).catch(console.error);
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="w-full sm:w-auto">
                            <Plus className="w-4 h-4 mr-2" />
                            Nuevo Producto
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Crear Producto</DialogTitle>
                            <DialogDescription>
                                Ingresa los detalles del nuevo producto. Los precios se configuran en la sección de precios.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4">
                            {error && <div className="text-destructive text-sm font-medium">{error}</div>}
                            <div className="space-y-2">
                                <Input
                                    placeholder="Nombre de producto"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={isSubmitting}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Select value={categoryId} onValueChange={setCategoryId} required disabled={isSubmitting}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona una categoría" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Input
                                    type="number"
                                    placeholder="Stock (Cantidad)"
                                    value={stock}
                                    onChange={(e) => setStock(e.target.value)}
                                    disabled={isSubmitting}
                                    min="0"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Select value={status} onValueChange={(val: "1" | "2") => setStatus(val)} disabled={isSubmitting}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">Activo</SelectItem>
                                        <SelectItem value="2">Inactivo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isSubmitting || !name.trim() || !categoryId || !stock}>
                                    {isSubmitting ? "Guardando..." : "Guardar"}
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
                            <TableHead>Estado</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead>
                                <Button
                                    variant="ghost"
                                    onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                                    className="-ml-4 h-8 data-[state=open]:bg-accent"
                                >
                                    Stock
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead className="w-[100px] text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Cargando...
                                </TableCell>
                            </TableRow>
                        ) : products.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    {debouncedSearch ? "No se encontraron productos." : "No hay productos registrados."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedProducts.map((prod) => (
                                <TableRow key={prod.id}>
                                    <TableCell className="font-medium">{prod.name}</TableCell>
                                    <TableCell>
                                        {prod.status === 1 ? (
                                            <Badge className="w-[100px] justify-center bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">Activo </Badge>
                                        ) : (
                                            <Badge variant="destructive" className="w-[100px] justify-center bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">Inactivo </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>{getCategoryName(prod.categoryId)}</TableCell>
                                    <TableCell>{prod.stock}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(prod)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Esta acción no se puede deshacer. Esto eliminará permanentemente
                                                            "{prod.name}".
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDelete(prod.id)}
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        >
                                                            Eliminar
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
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
                            localStorage.setItem("invenda_products_limit", val);
                            setCurrentPage(1);
                        }}
                    >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={limit} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[5, 10, 20, 50].map((pageSize) => (
                                <SelectItem key={pageSize} value={`${pageSize}`}>
                                    {pageSize}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <span>registros por página</span>
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

                            {/* Render numbered pages */}
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

                            {/* Mobile short display */}
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

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={(val) => {
                setIsEditOpen(val);
                if (!val) resetForm();
                else {
                    // Refetch categories when opening the edit product modal to ensure we have the latest
                    api.getCategories({ limit: 100 }).then(catsRes => setCategories(catsRes.data)).catch(console.error);
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Producto</DialogTitle>
                        <DialogDescription>
                            Modifica los detalles del producto.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        {error && <div className="text-destructive text-sm font-medium">{error}</div>}
                        <div className="space-y-2">
                            <Input
                                placeholder="Nombre de producto"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={isSubmitting}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Select value={categoryId} onValueChange={setCategoryId} required disabled={isSubmitting}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona una categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Input
                                type="number"
                                placeholder="Stock (Cantidad)"
                                value={stock}
                                onChange={(e) => setStock(e.target.value)}
                                disabled={isSubmitting}
                                min="0"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Select value={status} onValueChange={(val: "1" | "2") => setStatus(val)} disabled={isSubmitting}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Activo</SelectItem>
                                    <SelectItem value="2">Inactivo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting || !name.trim() || !categoryId || !stock}>
                                {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
