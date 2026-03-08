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
import { Edit, Settings2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function PricesTable() {
    const [products, setProducts] = React.useState<Product[]>([])
    const [categories, setCategories] = React.useState<Category[]>([])
    const [rates, setRates] = React.useState<ExchangeRates>({ cop: 1, bcv: 1 })
    const [loading, setLoading] = React.useState(true)

    // Rates config dialog
    const [isRatesOpen, setIsRatesOpen] = React.useState(false)
    const [rateCop, setRateCop] = React.useState("")
    const [rateBcv, setRateBcv] = React.useState("")

    // Edit Pricing Dialog states
    const [isEditOpen, setIsEditOpen] = React.useState(false)
    const [currentProduct, setCurrentProduct] = React.useState<Product | null>(null)

    // Add Pricing to Existing Product Dialog states
    // A requirement from the user: the add product on this page should be a select of existing products.
    // If it's not in inventory, it shouldn't show up.
    const [isCreateOpen, setIsCreateOpen] = React.useState(false)
    const [selectedProductId, setSelectedProductId] = React.useState("")

    // Prices states for both edit and create
    const [usd, setUsd] = React.useState("")
    const [cop, setCop] = React.useState("")
    const [exchangeType, setExchangeType] = React.useState<"usd" | "cop">("usd")

    const [isSubmitting, setIsSubmitting] = React.useState(false)

    // Pagination states
    const [currentPage, setCurrentPage] = React.useState(1)
    const ITEMS_PER_PAGE = 5
    const totalPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE))
    const paginatedProducts = products.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

    React.useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        const [prods, cats, exchange] = await Promise.all([
            api.getProducts(),
            api.getCategories(),
            api.getExchangeRates()
        ])
        setProducts(prods)
        setCategories(cats)
        setRates(exchange)
        setLoading(false)
    }

    const resetForm = () => {
        setSelectedProductId("")
        setUsd("")
        setCop("")
        setExchangeType("usd")
        setCurrentProduct(null)
    }

    // Function to calculate VES dynamically
    const calculateVes = (type: "usd" | "cop", valUsd: number, valCop: number) => {
        if (type === "usd") {
            return valUsd * rates.bcv;
        } else {
            // As per user formula: valCop / cop_rate
            return valCop / rates.cop;
        }
    }

    const handleSaveRates = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        const newRates = {
            cop: parseFloat(rateCop) || 1,
            bcv: parseFloat(rateBcv) || 1
        }
        await api.updateExchangeRates(newRates)

        // Updating global rates means we might need to recalculate all VES prices for all products
        // to reflect immediately, we iterate and update all.
        // In a real DB this would be handled differently (e.g. calculated on the fly on GET).
        // For the mock, we can just reload data, but we need to update the mock JSON storage technically.
        // For visual display, calculateVes runs dynamically in the render if we just store the base price.

        await loadData()
        setIsSubmitting(false)
        setIsRatesOpen(false)
    }

    const openRatesConfig = () => {
        setRateCop(rates.cop.toString())
        setRateBcv(rates.bcv.toString())
        setIsRatesOpen(true)
    }

    // Adding prices to an existing product
    const handleAddPrices = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedProductId) return
        setIsSubmitting(true)

        const vUsd = parseFloat(usd) || 0
        const vCop = parseFloat(cop) || 0
        const vVes = calculateVes(exchangeType, vUsd, vCop)

        await api.updatePrices(selectedProductId, {
            usd: vUsd,
            cop: vCop,
            ves: vVes,
            exchangeType
        })

        await loadData()
        setIsSubmitting(false)
        setIsCreateOpen(false)
        resetForm()
    }

    // Editing prices of a product
    const handleEditPrices = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentProduct) return
        setIsSubmitting(true)

        const vUsd = parseFloat(usd) || 0
        const vCop = parseFloat(cop) || 0
        const vVes = calculateVes(exchangeType, vUsd, vCop)

        await api.updatePrices(currentProduct.id, {
            usd: vUsd,
            cop: vCop,
            ves: vVes,
            exchangeType
        })

        await loadData()
        setIsSubmitting(false)
        setIsEditOpen(false)
        resetForm()
    }

    const openEdit = (prod: Product) => {
        setCurrentProduct(prod)
        setUsd(prod.prices.usd.toString())
        setCop(prod.prices.cop.toString())
        setExchangeType(prod.prices.exchangeType)
        setIsEditOpen(true)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold">Listado de Precios</h2>
                    <Button variant="outline" size="sm" onClick={openRatesConfig}>
                        <Settings2 className="w-4 h-4 mr-2" />
                        Tasas de Cambio
                    </Button>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={(val) => {
                    setIsCreateOpen(val);
                    if (!val) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            Asignar Precios a Producto
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Asignar Precios</DialogTitle>
                            <DialogDescription>
                                Selecciona un producto existente del inventario para establecer sus precios.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddPrices} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Producto a configurar</label>
                                <Select value={selectedProductId} onValueChange={setSelectedProductId} required disabled={isSubmitting}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un producto del inventario" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Divisa Base (Cambio a Bs)</label>
                                <Select value={exchangeType} onValueChange={(val: "usd" | "cop") => setExchangeType(val)} disabled={isSubmitting}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona la divisa" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="usd">Dólares (USD)</SelectItem>
                                        <SelectItem value="cop">Pesos Colombianos (COP)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Precio USD</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={usd}
                                        onChange={(e) => setUsd(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Precio COP</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={cop}
                                        onChange={(e) => setCop(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            <div className="p-3 bg-muted rounded-md text-sm border">
                                <span className="font-semibold block mb-1">Cálculo en Bolívares (VES):</span>
                                Bs. {calculateVes(exchangeType, parseFloat(usd) || 0, parseFloat(cop) || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>

                            <DialogFooter>
                                <Button type="submit" disabled={isSubmitting || !selectedProductId}>
                                    {isSubmitting ? "Guardando..." : "Asignar Precios"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Rates Config Dialog */}
            <Dialog open={isRatesOpen} onOpenChange={setIsRatesOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Configurar Tasas de Cambio</DialogTitle>
                        <DialogDescription>
                            Ajusta las tasas globales. BCV (Bs. por $1) y Factor COP (Pesos por Bs).
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
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-medium">Factor COP</label>
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
                                Ejemplo: si la tasa es 6500 COP = 1300 Bs, el factor es 5 (6500 / 5 = 1300).
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

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Divisa Base</TableHead>
                            <TableHead>Precio USD ($)</TableHead>
                            <TableHead>Precio COP ($)</TableHead>
                            <TableHead>Precio VES (Bs.)</TableHead>
                            <TableHead className="w-[100px] text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    Cargando...
                                </TableCell>
                            </TableRow>
                        ) : products.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No hay productos para mostrar.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedProducts.map((prod) => {
                                // Dynamic recalculation on render to reflect immediate rate changes
                                const dynamicVes = calculateVes(prod.prices.exchangeType, prod.prices.usd, prod.prices.cop);

                                return (
                                    <TableRow key={prod.id}>
                                        <TableCell className="font-medium">{prod.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="w-[60px] justify-center bg-muted">
                                                {prod.prices.exchangeType === 'usd' ? 'USD' : 'COP'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>${prod.prices.usd.toFixed(2)}</TableCell>
                                        <TableCell>${prod.prices.cop.toLocaleString('es-CO')}</TableCell>
                                        <TableCell>Bs. {dynamicVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(prod)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
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

            {/* Edit Prices Dialog */}
            <Dialog open={isEditOpen} onOpenChange={(val) => {
                setIsEditOpen(val);
                if (!val) resetForm();
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Precios</DialogTitle>
                        <DialogDescription>
                            Modifica los precios para "{currentProduct?.name}".
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditPrices} className="space-y-4">
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Divisa Base (Cambio a Bs)</label>
                                <Select value={exchangeType} onValueChange={(val: "usd" | "cop") => setExchangeType(val)} disabled={isSubmitting}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona la divisa" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="usd">Dólares (USD)</SelectItem>
                                        <SelectItem value="cop">Pesos Colombianos (COP)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">USD ($)</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={usd}
                                        onChange={(e) => setUsd(e.target.value)}
                                        disabled={isSubmitting}
                                        min="0"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">COP ($)</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={cop}
                                        onChange={(e) => setCop(e.target.value)}
                                        disabled={isSubmitting}
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="p-3 bg-muted rounded-md text-sm border mt-2">
                                <span className="font-semibold block mb-1">Cálculo en Bolívares (VES):</span>
                                Bs. {calculateVes(exchangeType, parseFloat(usd) || 0, parseFloat(cop) || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
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
