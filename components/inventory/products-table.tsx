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

export function ProductsTable() {
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

    // Pagination states
    const [currentPage, setCurrentPage] = React.useState(1)
    const ITEMS_PER_PAGE = 5

    // Sorting state
    const [sortOrder, setSortOrder] = React.useState<"asc" | "desc" | null>(null)

    // Derived states
    const sortedProducts = React.useMemo(() => {
        if (!sortOrder) return products;
        return [...products].sort((a, b) => {
            if (sortOrder === "asc") return a.stock - b.stock;
            return b.stock - a.stock;
        });
    }, [products, sortOrder]);

    const totalPages = Math.max(1, Math.ceil(sortedProducts.length / ITEMS_PER_PAGE))
    const paginatedProducts = sortedProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

    React.useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        const [prods, cats] = await Promise.all([
            api.getProducts(),
            api.getCategories()
        ])
        setProducts(prods)
        setCategories(cats)
        setLoading(false)
    }

    const resetForm = () => {
        setName("")
        setCategoryId("")
        setStock("")
        setStatus("1")
        setCurrentProduct(null)
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || !categoryId || !stock) return
        setIsSubmitting(true)
        await api.createProduct({
            name,
            categoryId,
            stock: parseInt(stock, 10),
            status: parseInt(status, 10) as 1 | 2,
            prices: { usdTarjeta: 0, usdFisico: 0, cop: 0, ves: 0, exchangeType: "usd" }
        })
        await loadData()
        setIsSubmitting(false)
        setIsCreateOpen(false)
        resetForm()
    }

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentProduct || !name.trim() || !categoryId || !stock) return
        setIsSubmitting(true)
        await api.updateProduct(currentProduct.id, {
            name,
            categoryId,
            stock: parseInt(stock, 10),
            status: parseInt(status, 10) as 1 | 2,
        })
        await loadData()
        setIsSubmitting(false)
        setIsEditOpen(false)
        resetForm()
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
        setIsEditOpen(true)
    }

    const getCategoryName = (id: string) => {
        return categories.find(c => c.id === id)?.name || "Desconocida"
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Productos</h2>
                <Dialog open={isCreateOpen} onOpenChange={(val) => {
                    setIsCreateOpen(val);
                    if (!val) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button size="sm">
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
                                    No hay productos registrados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedProducts.map((prod) => (
                                <TableRow key={prod.id}>
                                    <TableCell className="font-medium">{prod.name}</TableCell>
                                    <TableCell>
                                        {prod.status === 1 ? (
                                            <Badge className="w-[100px] justify-center bg-green-500 hover:bg-green-600 text-white shadow-sm border-0 font-medium">Activo 🟢</Badge>
                                        ) : (
                                            <Badge variant="destructive" className="w-[100px] justify-center shadow-sm border-0 font-medium">Inactivo 🔴</Badge>
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

            {totalPages > 1 && (
                <Pagination className="mt-4">
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>
                        <PaginationItem>
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

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={(val) => {
                setIsEditOpen(val);
                if (!val) resetForm();
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Producto</DialogTitle>
                        <DialogDescription>
                            Modifica los detalles del producto.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
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
