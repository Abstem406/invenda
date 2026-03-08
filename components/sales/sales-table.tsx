"use client"

import * as React from "react"
import { api, Sale, ExchangeRates, Product } from "@/lib/services/api"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, Eye, ShoppingCart } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Local interface for Cart Items before posting to API
interface CartItem {
    product: Product;
    quantity: number;
}

export function SalesTable() {
    const [sales, setSales] = React.useState<Sale[]>([])
    const [products, setProducts] = React.useState<Product[]>([])
    const [rates, setRates] = React.useState<ExchangeRates>({ cop: 1, bcv: 1 })
    const [loading, setLoading] = React.useState(true)

    // Cart states
    const [isCreateOpen, setIsCreateOpen] = React.useState(false)
    const [cart, setCart] = React.useState<CartItem[]>([])
    const [selectedProductId, setSelectedProductId] = React.useState("")
    const [paymentMethods, setPaymentMethods] = React.useState<Record<string, boolean>>({
        usd: false,
        cop: false,
        ves: false
    })
    const [saleStatus, setSaleStatus] = React.useState<"pagado" | "fiado" | "debiendo">("pagado")
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    // Derived Grand Totals
    const grandTotals = React.useMemo(() => {
        let u = 0, c = 0, v = 0;
        cart.forEach(item => {
            const p = item.product.prices;
            // Unit prices dynamic VES derivation
            let unitVes = 0;
            if (p.exchangeType === "usd") {
                unitVes = p.usd * rates.bcv;
            } else {
                unitVes = p.cop / rates.cop;
            }

            u += (p.usd * item.quantity);
            c += (p.cop * item.quantity);
            v += (unitVes * item.quantity);
        });
        return { usd: u, cop: c, ves: v }
    }, [cart, rates]);

    // Pagination states
    const [currentPage, setCurrentPage] = React.useState(1)
    const ITEMS_PER_PAGE = 5
    const totalPages = Math.max(1, Math.ceil(sales.length / ITEMS_PER_PAGE))
    const paginatedSales = sales.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

    React.useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        const [salesData, prods, exchange] = await Promise.all([
            api.getSales(),
            api.getProducts(),
            api.getExchangeRates()
        ])
        setSales(salesData)
        setProducts(prods)
        setRates(exchange)
        setLoading(false)
    }

    const resetForm = () => {
        setIsCreateOpen(false)
        setCart([])
        setSelectedProductId("")
        setPaymentMethods({ usd: false, cop: false, ves: false })
        setSaleStatus("pagado")
    }

    const getDynamicVes = (p: Product) => {
        if (p.prices.exchangeType === "usd") return p.prices.usd * rates.bcv;
        return p.prices.cop / rates.cop;
    }

    const handleAddToCart = () => {
        if (!selectedProductId) return;
        const prod = products.find(p => p.id === selectedProductId);
        if (!prod) return;

        // Check if already in cart
        if (cart.find(c => c.product.id === prod.id)) return;

        setCart(prev => [...prev, { product: prod, quantity: 1 }])
        setSelectedProductId("")
    }

    const updateCartQuantity = (productId: string, newQuantity: string) => {
        const qty = parseInt(newQuantity, 10);
        if (isNaN(qty) || qty < 1) return;

        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                // Ensure it does not exceed stock
                const safeQty = Math.min(qty, item.product.stock);
                return { ...item, quantity: safeQty };
            }
            return item;
        }))
    }

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    }

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setIsSubmitting(true);

        const activePayments = Object.entries(paymentMethods).filter(([_, active]) => active).map(([k]) => k.toLowerCase())
        if (activePayments.length === 0) activePayments.push("efectivo") // fallback default

        await api.createSale({
            items: cart.map(c => ({
                productId: c.product.id,
                quantity: c.quantity,
                unitPrice: {
                    ...c.product.prices,
                    ves: getDynamicVes(c.product)
                },
                totalPrice: {
                    usd: c.product.prices.usd * c.quantity,
                    cop: c.product.prices.cop * c.quantity,
                    ves: getDynamicVes(c.product) * c.quantity,
                    exchangeType: c.product.prices.exchangeType
                }
            })),
            grandTotal: { ...grandTotals, exchangeType: "usd" }, // abstracting exchange type for total
            paymentMethods: activePayments,
            status: saleStatus
        });

        await loadData();
        resetForm();
        setIsSubmitting(false);
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Historial de Ventas</h2>
                <Dialog open={isCreateOpen} onOpenChange={(val) => {
                    setIsCreateOpen(val);
                    if (!val) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Nueva Venta
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="lg:max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>Registrar Nueva Venta</DialogTitle>
                            <DialogDescription>
                                Agrega los productos al carrito, ajusta cantidades y procesa el pago.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex gap-4 items-end mt-2">
                            <div className="flex-1 space-y-2">
                                <label className="text-sm font-medium">Agregar Producto al Carrito</label>
                                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un producto en stock" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products.filter(p => p.stock > 0).map(p => (
                                            <SelectItem key={p.id} value={p.id}>
                                                <span className="font-mono text-muted-foreground mr-2">[{p.stock}]</span>
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleAddToCart} disabled={!selectedProductId} variant="secondary">
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                Agregar
                            </Button>
                        </div>

                        <div className="border rounded-md mt-4 max-h-[300px] overflow-y-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background z-10">
                                    <TableRow>
                                        <TableHead>Producto</TableHead>
                                        <TableHead className="w-[120px]">Cant.</TableHead>
                                        <TableHead>Precio Unitario</TableHead>
                                        <TableHead>Total</TableHead>
                                        <TableHead className="w-[50px] text-right"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cart.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                El carrito está vacío.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        cart.map((item) => {
                                            const p = item.product;
                                            const unitVes = getDynamicVes(p);
                                            return (
                                                <TableRow key={p.id}>
                                                    <TableCell className="font-medium align-top py-4">{p.name}</TableCell>
                                                    <TableCell className="align-top py-4">
                                                        <Input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => updateCartQuantity(p.id, e.target.value)}
                                                            min="1"
                                                            max={p.stock}
                                                            className="w-20"
                                                        />
                                                        <div className="text-[10px] text-muted-foreground mt-1 text-center">Máx: {p.stock}</div>
                                                    </TableCell>
                                                    <TableCell className="align-top py-4">
                                                        <div className="space-y-1 text-sm border-l pl-3">
                                                            <div className="font-medium text-foreground">${p.prices.usd.toFixed(2)} USD</div>
                                                            <div className="text-muted-foreground">${p.prices.cop.toLocaleString('es-CO')} COP</div>
                                                            <div className="text-muted-foreground">Bs. {unitVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="align-top py-4">
                                                        <div className="space-y-1 text-sm border-l pl-3 bg-muted/20 p-2 rounded-md">
                                                            <div className="font-medium text-foreground">${(p.prices.usd * item.quantity).toFixed(2)} USD</div>
                                                            <div className="text-muted-foreground">${(p.prices.cop * item.quantity).toLocaleString('es-CO')} COP</div>
                                                            <div className="text-muted-foreground">Bs. {(unitVes * item.quantity).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="align-top py-4 text-right">
                                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeFromCart(p.id)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {cart.length > 0 && (
                            <div className="mt-6 flex flex-col md:flex-row gap-8 justify-between bg-muted/30 p-4 rounded-lg border">
                                <div className="space-y-4 flex-1">
                                    <h4 className="font-semibold mb-2">Método de Pago e Información</h4>

                                    <div className="space-y-3">
                                        <label className="text-sm font-medium">Divisas recibidas (Múltiple):</label>
                                        <div className="flex flex-wrap gap-4">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox id="pay-usd" checked={paymentMethods.usd} onCheckedChange={(c) => setPaymentMethods(p => ({ ...p, usd: !!c }))} />
                                                <label htmlFor="pay-usd" className="text-sm font-medium leading-none cursor-pointer"><Badge variant="outline">USD</Badge></label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox id="pay-cop" checked={paymentMethods.cop} onCheckedChange={(c) => setPaymentMethods(p => ({ ...p, cop: !!c }))} />
                                                <label htmlFor="pay-cop" className="text-sm font-medium leading-none cursor-pointer"><Badge variant="outline">COP</Badge></label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox id="pay-ves" checked={paymentMethods.ves} onCheckedChange={(c) => setPaymentMethods(p => ({ ...p, ves: !!c }))} />
                                                <label htmlFor="pay-ves" className="text-sm font-medium leading-none cursor-pointer"><Badge variant="outline">Bs (VES)</Badge></label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-2">
                                        <label className="text-sm font-medium">Estado del Cobro:</label>
                                        <Select value={saleStatus} onValueChange={(val: any) => setSaleStatus(val)}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Estado..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pagado">Pagado Totalidad</SelectItem>
                                                <SelectItem value="fiado">Fiado (Pendiente)</SelectItem>
                                                <SelectItem value="debiendo">Debiendo Fracción</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="min-w-[250px] border-l pl-8 space-y-1 self-end md:self-stretch flex flex-col justify-center">
                                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">Total a Pagar</h4>
                                    <div className="text-3xl font-bold tracking-tight">${grandTotals.usd.toFixed(2)} <span className="text-lg font-normal text-muted-foreground">USD</span></div>
                                    <div className="text-xl font-medium tracking-tight">${grandTotals.cop.toLocaleString('es-CO')} <span className="text-sm font-normal text-muted-foreground">COP</span></div>
                                    <div className="text-xl font-medium tracking-tight text-primary">Bs. {grandTotals.ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                </div>
                            </div>
                        )}

                        <DialogFooter className="mt-4">
                            <Button variant="outline" onClick={resetForm} disabled={isSubmitting}>Cancelar</Button>
                            <Button onClick={handleCheckout} disabled={cart.length === 0 || isSubmitting}>
                                {isSubmitting ? "Procesando..." : "Confirmar Venta"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Total (USD)</TableHead>
                            <TableHead>Total (COP)</TableHead>
                            <TableHead>Total (VES)</TableHead>
                            <TableHead>Estado</TableHead>
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
                        ) : sales.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No hay ventas registradas.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedSales.map((sale) => {
                                return (
                                    <TableRow key={sale.id}>
                                        <TableCell className="font-medium">
                                            {new Date(sale.date).toLocaleDateString()} {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </TableCell>
                                        <TableCell>${sale.grandTotal.usd.toFixed(2)}</TableCell>
                                        <TableCell>${sale.grandTotal.cop.toLocaleString('es-CO')}</TableCell>
                                        <TableCell>Bs. {sale.grandTotal.ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</TableCell>
                                        <TableCell>
                                            <Badge variant={sale.status === 'pagado' ? 'default' : sale.status === 'fiado' ? 'secondary' : 'destructive'} className="capitalize">
                                                {sale.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon">
                                                <Eye className="w-4 h-4" />
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
        </div>
    )
}
