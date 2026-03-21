"use client"

import * as React from "react"
import { api, Product, Category, ExchangeRates } from "@/lib/services/api"
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
import { Edit, Plus, Trash2, ArrowUpDown, Settings2 } from "lucide-react"

export function ProductsTable({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
    const [products, setProducts] = React.useState<Product[]>([])
    const [categories, setCategories] = React.useState<Category[]>([])
    const [rates, setRates] = React.useState<ExchangeRates>({ cop: 5, bcv: 435, copUsd: 3754 })
    const [loading, setLoading] = React.useState(true)

    // Dialog states
    const [isCreateOpen, setIsCreateOpen] = React.useState(false)
    const [isEditOpen, setIsEditOpen] = React.useState(false)
    const [currentProduct, setCurrentProduct] = React.useState<Product | null>(null)
    const [isCreateCategoryOpen, setIsCreateCategoryOpen] = React.useState(false)
    const [newCategoryName, setNewCategoryName] = React.useState("")
    const [isCreatingCategory, setIsCreatingCategory] = React.useState(false)

    // Rates config dialog
    const [isRatesOpen, setIsRatesOpen] = React.useState(false)
    const [rateCop, setRateCop] = React.useState("")
    const [rateBcv, setRateBcv] = React.useState("")
    const [rateCopUsd, setRateCopUsd] = React.useState("")

    // Form states — product fields
    const [name, setName] = React.useState("")
    const [categoryId, setCategoryId] = React.useState("")
    const [stock, setStock] = React.useState("")
    const [status, setStatus] = React.useState<"1" | "2">("1")

    // Form states — price fields
    const [usdTarjeta, setUsdTarjeta] = React.useState("")
    const [usdFisico, setUsdFisico] = React.useState("")
    const [cop, setCop] = React.useState("")

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

    // Sorting state
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
            const [prodsRes, catsRes, exchange] = await Promise.all([
                api.getProducts({
                    page: currentPage,
                    limit: limit,
                    search: debouncedSearch || undefined
                }),
                api.getCategories({ limit: 100 }),
                api.getExchangeRates()
            ])
            setProducts(prodsRes.data)
            setTotalPages(prodsRes.meta.totalPages)
            setCategories(catsRes.data)
            setRates(exchange)

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
        setUsdTarjeta("")
        setUsdFisico("")
        setCop("")
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

        // Price validation — mandatory
        const vUsdTarjeta = parseFloat(usdTarjeta)
        const vUsdFisico = parseFloat(usdFisico)
        const vCop = parseFloat(cop)
        if (isNaN(vUsdTarjeta) || vUsdTarjeta < 0) {
            setError("El precio USD Tarjeta es requerido y debe ser mayor o igual a 0");
            return;
        }
        if (isNaN(vUsdFisico) || vUsdFisico < 0) {
            setError("El precio USD Físico es requerido y debe ser mayor o igual a 0");
            return;
        }
        if (isNaN(vCop) || vCop < 0) {
            setError("El precio COP es requerido y debe ser mayor o igual a 0");
            return;
        }

        setIsSubmitting(true)
        try {
            // Step 1: Create the product
            const newProduct = await api.createProduct({
                name,
                categoryId,
                stock: parseInt(stock, 10),
                status: parseInt(status, 10) as 1 | 2
            })

            // Step 2: Create prices for the new product
            await api.createProductPrice({
                productId: newProduct.id,
                usdTarjeta: vUsdTarjeta,
                usdFisico: vUsdFisico,
                cop: vCop,
                ves: 0,
                exchangeType: "usd",
                isCustomVes: false,
                isCustomUsdTarjeta: false,
                isCustomUsdFisico: false,
                isCustomCop: false,
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

        // Price validation — mandatory
        const vUsdTarjeta = parseFloat(usdTarjeta)
        const vUsdFisico = parseFloat(usdFisico)
        const vCop = parseFloat(cop)
        if (isNaN(vUsdTarjeta) || vUsdTarjeta < 0) {
            setError("El precio USD Tarjeta es requerido y debe ser mayor o igual a 0");
            return;
        }
        if (isNaN(vUsdFisico) || vUsdFisico < 0) {
            setError("El precio USD Físico es requerido y debe ser mayor o igual a 0");
            return;
        }
        if (isNaN(vCop) || vCop < 0) {
            setError("El precio COP es requerido y debe ser mayor o igual a 0");
            return;
        }

        setIsSubmitting(true)
        try {
            // Step 1: Update the product
            await api.updateProduct(currentProduct.id, {
                name,
                categoryId,
                stock: parseInt(stock, 10),
                status: parseInt(status, 10) as 1 | 2,
            })

            // Step 2: Create or update prices
            const pricePayload = {
                usdTarjeta: vUsdTarjeta,
                usdFisico: vUsdFisico,
                cop: vCop,
                ves: 0,
                exchangeType: "usd" as const,
                isCustomVes: false,
                isCustomUsdTarjeta: false,
                isCustomUsdFisico: false,
                isCustomCop: false,
            }

            if (currentProduct.price) {
                // Product already has prices — update
                await api.updateProductPrice(currentProduct.id, pricePayload)
            } else {
                // Product has no prices yet — create
                await api.createProductPrice({
                    ...pricePayload,
                    productId: currentProduct.id,
                })
            }

            await loadData()
            setIsEditOpen(false)
            resetForm()
        } catch (err: any) {
            setError(err.message || "Error al actualizar el producto");
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newCategoryName.trim()) return
        setIsCreatingCategory(true)
        try {
            const newCat = await api.createCategory({ name: newCategoryName })
            const catsRes = await api.getCategories({ limit: 100 })
            setCategories(catsRes.data)
            setCategoryId(newCat.id)
            setIsCreateCategoryOpen(false)
            setNewCategoryName("")
        } catch (err) {
            console.error("Error creating category", err)
        } finally {
            setIsCreatingCategory(false)
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

    const openRatesConfig = () => {
        setRateCop(rates.cop.toString())
        setRateBcv(rates.bcv.toString())
        setRateCopUsd(rates.copUsd?.toString() || "3600")
        setIsRatesOpen(true)
    }

    const handleSaveRates = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        const newRates = {
            cop: parseFloat(rateCop) || 1,
            bcv: parseFloat(rateBcv) || 1,
            copUsd: parseFloat(rateCopUsd) || 3600
        }
        await api.updateExchangeRates(newRates)
        await loadData()
        setIsSubmitting(false)
        setIsRatesOpen(false)
    }

    const openEdit = (prod: Product) => {
        setCurrentProduct(prod)
        setName(prod.name)
        setCategoryId(prod.categoryId)
        setStock(prod.stock.toString())
        setStatus(prod.status.toString() as "1" | "2")
        // Load existing price values
        setUsdTarjeta(prod.price?.usdTarjeta?.toString() || "")
        setUsdFisico(prod.price?.usdFisico?.toString() || "")
        setCop(prod.price?.cop?.toString() || "")
        setError("")
        setIsEditOpen(true)
    }

    const getCategoryName = (id: string) => {
        return categories.find(c => c.id === id)?.name || "Desconocida"
    }

    // Price fields JSX used in both create and edit dialogs
    const renderPriceFields = () => (
        <div className="space-y-3 border-t pt-4 mt-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Precios del Producto</h4>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-sm font-medium">USD Tarjeta ($)</label>
                    <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={usdTarjeta}
                        onChange={(e) => setUsdTarjeta(e.target.value)}
                        disabled={isSubmitting}
                        min="0"
                        required
                    />
                    <div className="text-xs text-muted-foreground">Para calcular VES.</div>
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium">USD Físico ($)</label>
                    <Input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={usdFisico}
                        onChange={(e) => {
                            const val = e.target.value;
                            setUsdFisico(val);
                            if (val !== "") {
                                const num = parseFloat(val);
                                if (!isNaN(num)) {
                                    setCop((num * rates.copUsd).toString());
                                }
                            } else {
                                setCop("");
                            }
                        }}
                        disabled={isSubmitting}
                        min="0"
                        required
                    />
                </div>
                <div className="space-y-1 col-span-2">
                    <label className="text-sm font-medium">Precio COP ($)</label>
                    <Input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={cop}
                        onChange={(e) => {
                            const val = e.target.value;
                            setCop(val);
                            if (val !== "") {
                                const num = parseFloat(val);
                                if (!isNaN(num)) {
                                    setUsdFisico((num / rates.copUsd).toString());
                                }
                            } else {
                                setUsdFisico("");
                            }
                        }}
                        disabled={isSubmitting}
                        min="0"
                        required
                    />
                </div>
            </div>
        </div>
    )

    // Check if price fields are filled for disabling submit button
    const isPriceValid = usdTarjeta !== "" && usdFisico !== "" && cop !== ""

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
                    <Button variant="outline" size="lg" onClick={openRatesConfig} className="w-full sm:w-auto text-md">
                        <Settings2 className="w-4 h-4 mr-2" />
                        Tasas de Cambio
                    </Button>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={(val) => {
                    setIsCreateOpen(val);
                    if (!val) resetForm();
                    else {
                        // Refetch categories and rates when opening the dialog
                        Promise.all([
                            api.getCategories({ limit: 100 }),
                            api.getExchangeRates()
                        ]).then(([catsRes, exchange]) => {
                            setCategories(catsRes.data);
                            setRates(exchange);
                        }).catch(console.error);
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button size="lg" className="w-full sm:w-auto text-md">
                            <Plus className="w-4 h-4 mr-2" />
                            Nuevo Producto
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Crear Producto</DialogTitle>
                            <DialogDescription>
                                Ingresa los detalles y precios del nuevo producto.
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
                                <div className="grid grid-cols-[1fr_auto] gap-2 items-center w-full">
                                    <Select value={categoryId} onValueChange={setCategoryId} required disabled={isSubmitting}>
                                        <SelectTrigger className="flex-1 w-full min-w-0 [&>span]:truncate flex gap-2">
                                            <SelectValue placeholder="Selecciona una categoría" className="block truncate" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map(cat => (
                                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setIsCreateCategoryOpen(true)}
                                        disabled={isSubmitting}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
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

                            {renderPriceFields()}

                            <DialogFooter>
                                <Button type="submit" disabled={isSubmitting || !name.trim() || !categoryId || !stock || !isPriceValid}>
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
                            <TableHead>USD Tarjeta</TableHead>
                            <TableHead>USD Físico</TableHead>
                            <TableHead>COP</TableHead>
                            <TableHead className="w-[100px] text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">
                                    Cargando...
                                </TableCell>
                            </TableRow>
                        ) : products.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                    {debouncedSearch ? "No se encontraron productos." : "No hay productos registrados."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedProducts.map((prod) => (
                                <TableRow key={prod.id}>
                                    <TableCell className="font-medium max-w-[150px] sm:max-w-[300px] truncate" title={prod.name}>{prod.name}</TableCell>
                                    <TableCell>
                                        {prod.status === 1 ? (
                                            <Badge className="w-[100px] justify-center bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">Activo </Badge>
                                        ) : (
                                            <Badge variant="destructive" className="w-[100px] justify-center bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">Inactivo </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>{getCategoryName(prod.categoryId)}</TableCell>
                                    <TableCell>{prod.stock}</TableCell>
                                    <TableCell>
                                        {prod.price ? `$${prod.price.usdTarjeta?.toFixed(2)}` : <span className="text-muted-foreground">—</span>}
                                    </TableCell>
                                    <TableCell>
                                        {prod.price ? `$${prod.price.usdFisico?.toFixed(2)}` : <span className="text-muted-foreground">—</span>}
                                    </TableCell>
                                    <TableCell>
                                        {prod.price ? `$${prod.price.cop?.toLocaleString('es-CO')}` : <span className="text-muted-foreground">—</span>}
                                    </TableCell>
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
                                                            &quot;{prod.name}&quot;.
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
                    // Refetch categories and rates when opening the edit dialog
                    Promise.all([
                        api.getCategories({ limit: 100 }),
                        api.getExchangeRates()
                    ]).then(([catsRes, exchange]) => {
                        setCategories(catsRes.data);
                        setRates(exchange);
                    }).catch(console.error);
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Producto</DialogTitle>
                        <DialogDescription>
                            Modifica los detalles y precios del producto.
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
                            <div className="grid grid-cols-[1fr_auto] gap-2 items-center w-full">
                                <Select value={categoryId} onValueChange={setCategoryId} required disabled={isSubmitting}>
                                    <SelectTrigger className="flex-1 w-full min-w-0 [&>span]:truncate flex gap-2">
                                        <SelectValue placeholder="Selecciona una categoría" className="block truncate" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setIsCreateCategoryOpen(true)}
                                    disabled={isSubmitting}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
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

                        {renderPriceFields()}

                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting || !name.trim() || !categoryId || !stock || !isPriceValid}>
                                {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            {/* Create Category Dialog */}
            <Dialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nueva Categoría</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateCategory} className="space-y-4">
                        <Input
                            placeholder="Nombre de la categoría"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            required
                            disabled={isCreatingCategory}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateCategoryOpen(false)} disabled={isCreatingCategory}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isCreatingCategory || !newCategoryName.trim()}>
                                {isCreatingCategory ? "Guardando..." : "Guardar"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Exchange Rates Config Dialog */}
            <Dialog open={isRatesOpen} onOpenChange={setIsRatesOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Configurar Tasas de Cambio</DialogTitle>
                        <DialogDescription>
                            Ajusta las tasas de cambio globales que afectan todos los precios.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveRates} className="space-y-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-medium">Tasa BCV</label>
                            <Input
                                className="col-span-3"
                                type="number"
                                step="0.01"
                                value={rateBcv}
                                onChange={(e) => setRateBcv(e.target.value)}
                                min="0"
                                required
                            />
                            <div className="col-span-4 text-xs text-muted-foreground ml-16">
                                Bolívares por $1 USD. Ej: 455.25 significa que: <br /> $1 USD = 455.25 Bs.
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-medium">Tasa COP/USD</label>
                            <Input
                                className="col-span-3"
                                type="number"
                                step="0.01"
                                value={rateCopUsd}
                                onChange={(e) => setRateCopUsd(e.target.value)}
                                min="0"
                                required
                            />
                            <div className="col-span-4 text-xs text-muted-foreground ml-16">
                                Pesos Colombianos por $1 USD. Ej: 3600 significa que: <br /> $1 USD = 3600 COP.
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-medium">Factor COP/Bs</label>
                            <Input
                                className="col-span-3"
                                type="number"
                                step="0.01"
                                value={rateCop}
                                onChange={(e) => setRateCop(e.target.value)}
                                min="0"
                                required
                            />
                            <div className="col-span-4 text-xs text-muted-foreground ml-16">
                                Factor de conversión directa COP → Bs. Ej: si el factor es 5, <br /> 6500 COP / 5 = 1300 Bs.
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting}>
                                Guardar Tasas
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
