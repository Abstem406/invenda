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
import { Switch } from "@/components/ui/switch"

export function PricesTable() {
    const [products, setProducts] = React.useState<Product[]>([])
    const [categories, setCategories] = React.useState<Category[]>([])
    const [rates, setRates] = React.useState<ExchangeRates>({ cop: 5, bcv: 435, copUsd: 3754 })
    const [loading, setLoading] = React.useState(true)

    // Rates config dialog
    const [isRatesOpen, setIsRatesOpen] = React.useState(false)
    const [rateCop, setRateCop] = React.useState("")
    const [rateBcv, setRateBcv] = React.useState("")
    const [rateCopUsd, setRateCopUsd] = React.useState("")

    // Edit Pricing Dialog states
    const [isEditOpen, setIsEditOpen] = React.useState(false)
    const [currentProduct, setCurrentProduct] = React.useState<Product | null>(null)

    // Add Pricing to Existing Product Dialog states
    // A requirement from the user: the add product on this page should be a select of existing products.
    // If it's not in inventory, it shouldn't show up.
    const [isCreateOpen, setIsCreateOpen] = React.useState(false)
    const [selectedProductId, setSelectedProductId] = React.useState("")

    const [usdTarjeta, setUsdTarjeta] = React.useState("")
    const [usdFisico, setUsdFisico] = React.useState("")
    const [cop, setCop] = React.useState("")
    const [exchangeType, setExchangeType] = React.useState<"usd" | "cop">("usd")
    const [isCustomVes, setIsCustomVes] = React.useState(false)
    const [customVes, setCustomVes] = React.useState("")

    const [isSubmitting, setIsSubmitting] = React.useState(false)

    // Pagination states
    const [currentPage, setCurrentPage] = React.useState(1)
    const [limit, setLimit] = React.useState<number>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("invenda_prices_limit")
            if (saved) return Number(saved)
        }
        return 5
    })

    const totalPages = Math.max(1, Math.ceil(products.length / limit))
    const paginatedProducts = products.slice((currentPage - 1) * limit, currentPage * limit)

    React.useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        const [prodsRes, catsRes, exchange] = await Promise.all([
            api.getProducts({ limit: 1000 }), // In PricesTable we need all/many products to edit
            api.getCategories({ limit: 100 }),
            api.getExchangeRates()
        ])
        setProducts(prodsRes.data)
        setCategories(catsRes.data)
        setRates(exchange)
        setLoading(false)
    }

    const resetForm = () => {
        setSelectedProductId("")
        setUsdTarjeta("")
        setUsdFisico("")
        setCop("")
        setExchangeType("usd")
        setIsCustomVes(false)
        setCustomVes("")
        setCurrentProduct(null)
    }

    // Function to calculate VES dynamically based on Base Divisa
    const calculateVes = (type: "usd" | "cop", valUsdTarjeta: number, valCop: number) => {
        //  console.log("rates:", rates);
        //  console.log("valUsdTarjeta:", valUsdTarjeta);
        //  console.log("valUsdTarjeta * rates.bcv:", valUsdTarjeta * rates.bcv);

        if (type === "usd") return valUsdTarjeta * rates.bcv;
        return valCop / rates.cop;
    }

    // Function to calculate USD Fisico to COP
    const calculateCopFromFisico = (valUsdFisico: number) => {
        return valUsdFisico * rates.copUsd;
    }

    const handleSaveRates = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        const newRates = {
            cop: parseFloat(rateCop) || 1,
            bcv: parseFloat(rateBcv) || 1,
            copUsd: parseFloat(rateCopUsd) || 3754
        }
        await api.updateExchangeRates(newRates)

        // Recalculate all products' usdFisico based on new copUsd rate
        // COP is the source of truth, usdFisico = cop / copUsd
        const allProductsRes = await api.getProducts({ limit: 1000 });
        for (const prod of allProductsRes.data) {
            if (prod.prices.cop > 0) {
                const newUsdFisico = parseFloat((prod.prices.cop / newRates.copUsd).toFixed(2));
                await api.updatePrices(prod.id, {
                    ...prod.prices,
                    usdFisico: newUsdFisico
                });
            }
        }

        await loadData()
        setIsSubmitting(false)
        setIsRatesOpen(false)
    }

    const openRatesConfig = () => {
        setRateCop(rates.cop.toString())
        setRateBcv(rates.bcv.toString())
        setRateCopUsd(rates.copUsd?.toString() || "3754")
        setIsRatesOpen(true)
    }

    const handleAddPrices = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedProductId) return
        setIsSubmitting(true)

        const vUsdTarjeta = parseFloat(usdTarjeta) || 0
        const vUsdFisico = parseFloat(usdFisico) || 0
        const vCop = parseFloat(cop) || 0
        const vVes = isCustomVes ? (parseFloat(customVes) || 0) : calculateVes(exchangeType, vUsdTarjeta, vCop)

        await api.updatePrices(selectedProductId, {
            usdTarjeta: vUsdTarjeta,
            usdFisico: vUsdFisico,
            cop: vCop,
            ves: vVes,
            exchangeType,
            isCustomVes
        })

        await loadData()
        setIsSubmitting(false)
        setIsCreateOpen(false)
        resetForm()
    }

    const handleEditPrices = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentProduct) return
        setIsSubmitting(true)

        const vUsdTarjeta = parseFloat(usdTarjeta) || 0
        const vUsdFisico = parseFloat(usdFisico) || 0
        const vCop = parseFloat(cop) || 0
        const vVes = isCustomVes ? (parseFloat(customVes) || 0) : calculateVes(exchangeType, vUsdTarjeta, vCop)

        await api.updatePrices(currentProduct.id, {
            usdTarjeta: vUsdTarjeta,
            usdFisico: vUsdFisico,
            cop: vCop,
            ves: vVes,
            exchangeType,
            isCustomVes
        })

        await loadData()
        setIsSubmitting(false)
        setIsEditOpen(false)
        resetForm()
    }

    const openEdit = (prod: Product) => {
        setCurrentProduct(prod)
        setUsdTarjeta(prod.prices.usdTarjeta?.toString() || "0")
        setUsdFisico(prod.prices.usdFisico?.toString() || "0")
        setCop(prod.prices.cop.toString())
        setExchangeType(prod.prices.exchangeType)
        setIsCustomVes(prod.prices.isCustomVes || false)
        setCustomVes(prod.prices.ves.toString())
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
                                    <label className="text-sm font-medium">USD Tarjeta ($)</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={usdTarjeta}
                                        onChange={(e) => setUsdTarjeta(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                    <div className="text-xs text-muted-foreground">Úsalo para calcular VES.</div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">USD Físico ($)</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={usdFisico}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setUsdFisico(val);
                                            // Auto calc COP based on USD Fisico
                                            const num = parseFloat(val) || 0;
                                            setCop((num * rates.copUsd).toString());
                                        }}
                                        disabled={isSubmitting}
                                    />
                                    <div className="text-xs text-muted-foreground">Multiplica x {rates.copUsd} para dar COP.</div>
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label className="text-sm font-medium">Precio COP ($)</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={cop}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setCop(val);
                                            // Auto calc USD Fisico based on COP (dividing in reverse)
                                            const num = parseFloat(val) || 0;
                                            setUsdFisico((num / rates.copUsd).toFixed(2).toString());
                                        }}
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 border rounded-md p-4 bg-muted/30 mt-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <h4 className="text-sm font-medium">Precio en Bolívares (VES)</h4>
                                        <div className="text-xs text-muted-foreground">
                                            {isCustomVes ? "Valor establecido manualmente" : "Calculado base a Divisa Base"}
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Switch id="custom-ves-1" checked={isCustomVes} onCheckedChange={setIsCustomVes} disabled={isSubmitting} />
                                        <label htmlFor="custom-ves-1" className="text-xs">Fijar Manual</label>
                                    </div>
                                </div>
                                {isCustomVes ? (
                                    <div className="space-y-2 pt-2">
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="Ej. 1500"
                                            value={customVes}
                                            onChange={(e) => setCustomVes(e.target.value)}
                                            disabled={isSubmitting}
                                            min="0"
                                        />
                                    </div>
                                ) : (
                                    <div className="text-2xl font-semibold tracking-tight">
                                        Bs. {calculateVes(exchangeType, parseFloat(usdTarjeta) || 0, parseFloat(cop) || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                )}
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
                                Tasa de conversión de Peso Colombiano a Dólar Físico (ej. 3754).
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
                            <TableHead>USD Tarjeta</TableHead>
                            <TableHead>USD Físico</TableHead>
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
                                const dynamicVes = prod.prices.isCustomVes ? prod.prices.ves : calculateVes(prod.prices.exchangeType, prod.prices.usdTarjeta, prod.prices.cop);

                                return (
                                    <TableRow key={prod.id}>
                                        <TableCell className="font-medium">{prod.name}</TableCell>
                                        <TableCell>${prod.prices.usdTarjeta?.toFixed(2) || '0.00'}</TableCell>
                                        <TableCell>${(prod.prices.cop / rates.copUsd).toFixed(2)}</TableCell>
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

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground w-full sm:w-auto text-center sm:text-left justify-center sm:justify-start">
                    <span>Mostrar</span>
                    <Select
                        value={limit.toString()}
                        onValueChange={(val) => {
                            setLimit(Number(val));
                            localStorage.setItem("invenda_prices_limit", val);
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
                                    <label className="text-sm font-medium">USD Tarjeta ($)</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={usdTarjeta}
                                        onChange={(e) => setUsdTarjeta(e.target.value)}
                                        disabled={isSubmitting}
                                        min="0"
                                    />
                                    <div className="text-xs text-muted-foreground">Para calcular VES.</div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">USD Físico ($)</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={usdFisico}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setUsdFisico(val);
                                            // Auto calc COP based on USD Fisico
                                            const num = parseFloat(val) || 0;
                                            setCop((num * rates.copUsd).toString());
                                        }}
                                        disabled={isSubmitting}
                                        min="0"
                                    />
                                    <div className="text-xs text-muted-foreground">X {rates.copUsd} = COP.</div>
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label className="text-sm font-medium">COP ($)</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={cop}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setCop(val);
                                            // Auto calc USD Fisico based on COP
                                            const num = parseFloat(val) || 0;
                                            setUsdFisico((num / rates.copUsd).toFixed(2).toString());
                                        }}
                                        disabled={isSubmitting}
                                        min="0"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 border rounded-md p-4 bg-muted/30 mt-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <h4 className="text-sm font-medium">Precio en Bolívares (VES)</h4>
                                    <div className="text-xs text-muted-foreground">
                                        {isCustomVes ? "Valor establecido manualmente" : "Calculado base a Divisa Base"}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch id="custom-ves-2" checked={isCustomVes} onCheckedChange={setIsCustomVes} disabled={isSubmitting} />
                                    <label htmlFor="custom-ves-2" className="text-xs">Fijar Manual</label>
                                </div>
                            </div>
                            {isCustomVes ? (
                                <div className="space-y-2 pt-2">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="Ej. 1500"
                                        value={customVes}
                                        onChange={(e) => setCustomVes(e.target.value)}
                                        disabled={isSubmitting}
                                        min="0"
                                    />
                                </div>
                            ) : (
                                <div className="text-2xl font-semibold tracking-tight">
                                    Bs. {calculateVes(exchangeType, parseFloat(usdTarjeta) || 0, parseFloat(cop) || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            )}
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
