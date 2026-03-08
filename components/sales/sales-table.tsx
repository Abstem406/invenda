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
    payments: {
        usdTarjeta: number;
        usdFisico: number;
        cop: number;
        ves: number;
    };
}

export function SalesTable() {
    const [sales, setSales] = React.useState<Sale[]>([])
    const [products, setProducts] = React.useState<Product[]>([])
    const [rates, setRates] = React.useState<ExchangeRates>({ cop: 1, bcv: 1, copUsd: 3754 })
    const [loading, setLoading] = React.useState(true)

    // Cart states
    const [isCreateOpen, setIsCreateOpen] = React.useState(false)
    const [cart, setCart] = React.useState<CartItem[]>([])
    const [selectedProductId, setSelectedProductId] = React.useState("")
    const [saleStatus, setSaleStatus] = React.useState<"pagado" | "fiado" | "debiendo">("pagado")
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    // View Details states
    const [isDetailsOpen, setIsDetailsOpen] = React.useState(false)
    const [selectedSale, setSelectedSale] = React.useState<Sale | null>(null)

    const getDynamicVes = React.useCallback((p: Product) => {
        if (p.prices.isCustomVes) return p.prices.ves;
        if (p.prices.exchangeType === "usd") return p.prices.usdTarjeta * rates.bcv;
        return p.prices.cop / rates.cop;
    }, [rates]);

    // Derived Grand Totals (What the customer ACTUALLY deposited)
    const receivedTotals = React.useMemo(() => {
        let uT = 0, uF = 0, c = 0, v = 0;
        cart.forEach(item => {
            uT += item.payments.usdTarjeta;
            uF += item.payments.usdFisico;
            c += item.payments.cop;
            v += item.payments.ves;
        });
        return { usdTarjeta: uT, usdFisico: uF, cop: c, ves: v }
    }, [cart]);

    // Theoretical Debt/Cart Totals
    const cartTotals = React.useMemo(() => {
        let u = 0, c = 0, v = 0;
        cart.forEach(item => {
            const p = item.product.prices;
            let unitVes = getDynamicVes(item.product);

            u += (p.usdTarjeta * item.quantity);
            c += (p.cop * item.quantity);
            v += (unitVes * item.quantity);
        });
        return { usdTarjeta: u, cop: c, ves: v }
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
        setSaleStatus("pagado")
    }

    const handleAddToCart = () => {
        if (!selectedProductId) return;
        const prod = products.find(p => p.id === selectedProductId);
        if (!prod) return;

        // Check if already in cart
        if (cart.find(c => c.product.id === prod.id)) return;

        setCart(prev => [...prev, {
            product: prod,
            quantity: 1,
            payments: { usdTarjeta: 0, usdFisico: 0, cop: 0, ves: 0 }
        }])
        setSelectedProductId("")
    }

    const updateItemPayment = (productId: string, field: keyof CartItem["payments"], value: string) => {
        const num = parseFloat(value) || 0;
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                return { ...item, payments: { ...item.payments, [field]: num } };
            }
            return item;
        }))
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

        await api.createSale({
            items: cart.map(c => ({
                productId: c.product.id,
                quantity: c.quantity,
                unitPrice: {
                    ...c.product.prices,
                    ves: getDynamicVes(c.product)
                },
                totalPrice: {
                    usdTarjeta: c.product.prices.usdTarjeta * c.quantity,
                    usdFisico: c.product.prices.usdFisico * c.quantity,
                    cop: c.product.prices.cop * c.quantity,
                    ves: getDynamicVes(c.product) * c.quantity,
                    exchangeType: c.product.prices.exchangeType
                },
                payments: c.payments
            })),
            receivedTotals: receivedTotals,
            status: saleStatus
        });

        await loadData();
        resetForm();
        setIsSubmitting(false);
    }

    const openDetails = (sale: Sale) => {
        setSelectedSale(sale);
        setIsDetailsOpen(true);
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
                                        <TableHead className="w-[80px]">Cant.</TableHead>
                                        <TableHead>Total Adeudado</TableHead>
                                        <TableHead>Pagos del Cliente</TableHead>
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
                                                            className="w-16 h-8"
                                                        />
                                                        <div className="text-[10px] text-muted-foreground mt-1 text-center">Máx: {p.stock}</div>
                                                    </TableCell>
                                                    <TableCell className="align-top py-4">
                                                        <div className="space-y-1 text-sm border-l pl-3 bg-muted/20 p-2 rounded-md">
                                                            <div className="font-medium text-foreground">${(p.prices.usdTarjeta * item.quantity).toFixed(2)} USD (T)</div>
                                                            <div className="text-muted-foreground">${(p.prices.cop * item.quantity).toLocaleString('es-CO')} COP</div>
                                                            <div className="text-muted-foreground">Bs. {(unitVes * item.quantity).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="align-top py-2">
                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className="w-[50px] justify-center">USD F</Badge>
                                                                <Input type="number" step="0.01" className="h-7 w-20" value={item.payments.usdFisico || ""} onChange={(e) => updateItemPayment(p.id, "usdFisico", e.target.value)} placeholder="0.00" />
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className="w-[50px] justify-center">USD T</Badge>
                                                                <Input type="number" step="0.01" className="h-7 w-20" value={item.payments.usdTarjeta || ""} onChange={(e) => updateItemPayment(p.id, "usdTarjeta", e.target.value)} placeholder="0.00" />
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className="w-[50px] justify-center">COP</Badge>
                                                                <Input type="number" step="0.01" className="h-7 w-20" value={item.payments.cop || ""} onChange={(e) => updateItemPayment(p.id, "cop", e.target.value)} placeholder="0.00" />
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className="w-[50px] justify-center">VES</Badge>
                                                                <Input type="number" step="0.01" className="h-7 w-20" value={item.payments.ves || ""} onChange={(e) => updateItemPayment(p.id, "ves", e.target.value)} placeholder="0.00" />
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="align-top py-4 text-right">
                                                        <Button variant="ghost" size="icon" className="text-destructive h-8" onClick={() => removeFromCart(p.id)}>
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
                                    <h4 className="font-semibold mb-2">Estado General de Venta</h4>
                                    <div className="space-y-2 pt-2">
                                        <label className="text-sm font-medium">Condición del Cobro:</label>
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

                                <div className="min-w-[250px] border-l pl-8 space-y-2 self-end md:self-stretch flex flex-col justify-center">
                                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1 border-b pb-1">Recibido (Total Depositado)</h4>
                                    <div className="text-2xl font-bold tracking-tight text-green-600">${receivedTotals.usdFisico.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">USD (Físico)</span></div>
                                    <div className="text-2xl font-bold tracking-tight text-green-600">${receivedTotals.usdTarjeta.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">USD (Tarjeta)</span></div>
                                    <div className="text-xl font-medium tracking-tight text-green-600">${receivedTotals.cop.toLocaleString('es-CO')} <span className="text-sm font-normal text-muted-foreground">COP</span></div>
                                    <div className="text-xl font-medium tracking-tight text-green-600">Bs. {receivedTotals.ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
                            <TableHead>Total (USD F)</TableHead>
                            <TableHead>Total (USD T)</TableHead>
                            <TableHead>Total (COP)</TableHead>
                            <TableHead>Total (VES)</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="w-[100px] text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    Cargando...
                                </TableCell>
                            </TableRow>
                        ) : sales.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
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
                                        <TableCell>{sale.receivedTotals.usdFisico > 0 ? `$${sale.receivedTotals.usdFisico.toFixed(2)}` : '-'}</TableCell>
                                        <TableCell>{sale.receivedTotals.usdTarjeta > 0 ? `$${sale.receivedTotals.usdTarjeta.toFixed(2)}` : '-'}</TableCell>
                                        <TableCell>{sale.receivedTotals.cop > 0 ? `$${sale.receivedTotals.cop.toLocaleString('es-CO')}` : '-'}</TableCell>
                                        <TableCell>{sale.receivedTotals.ves > 0 ? `Bs. ${sale.receivedTotals.ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}` : '-'}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1 items-start">
                                                <Badge variant={sale.status === 'pagado' ? 'default' : sale.status === 'fiado' ? 'secondary' : 'destructive'} className="capitalize">
                                                    {sale.status}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => openDetails(sale)}>
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

            {/* Sale Details Dialog */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Detalles de la Venta</DialogTitle>
                        <DialogDescription>
                            {selectedSale && `Venta registrada el ${new Date(selectedSale.date).toLocaleString()} - ID: ${selectedSale.id}`}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedSale && (
                        <div className="space-y-6">
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Producto</TableHead>
                                            <TableHead>Cant.</TableHead>
                                            <TableHead>Totales Adeudados</TableHead>
                                            <TableHead>Pagos Registrados</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedSale.items.map((item, idx) => {
                                            const pProd = products.find(p => p.id === item.productId);
                                            const name = pProd ? pProd.name : "Producto Eliminado";
                                            return (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-medium align-top py-3">{name}</TableCell>
                                                    <TableCell className="align-top py-3">{item.quantity}</TableCell>
                                                    <TableCell className="align-top py-3 text-sm">
                                                        <div className="space-y-1">
                                                            <div>${item.totalPrice.usdFisico?.toFixed(2) || '0.00'} USD (F)</div>
                                                            <div>${item.totalPrice.usdTarjeta?.toFixed(2) || '0.00'} USD (T)</div>
                                                            <div className="text-muted-foreground">${item.totalPrice.cop.toLocaleString('es-CO')} COP</div>
                                                            <div className="text-muted-foreground">Bs. {item.totalPrice.ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="align-top py-3">
                                                        <div className="flex flex-col gap-1 text-sm bg-muted/30 p-2 rounded border">
                                                            {item.payments?.usdFisico > 0 && <div><Badge variant="outline" className="mr-2">USD (F)</Badge> ${item.payments.usdFisico.toFixed(2)}</div>}
                                                            {item.payments?.usdTarjeta > 0 && <div><Badge variant="outline" className="mr-2">USD (T)</Badge> ${item.payments.usdTarjeta.toFixed(2)}</div>}
                                                            {item.payments?.cop > 0 && <div><Badge variant="outline" className="mr-2">COP</Badge> ${item.payments.cop.toLocaleString('es-CO')}</div>}
                                                            {item.payments?.ves > 0 && <div><Badge variant="outline" className="mr-2">VES</Badge> Bs. {item.payments.ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>}
                                                            {(!item.payments || (item.payments.usdFisico === 0 && item.payments.usdTarjeta === 0 && item.payments.cop === 0 && item.payments.ves === 0)) && (
                                                                <span className="text-muted-foreground italic">No hay pagos registrados para este ítem.</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="bg-muted p-4 rounded-lg flex justify-between items-center border">
                                <div>
                                    <h4 className="font-semibold text-sm uppercase text-muted-foreground mb-1">Estado</h4>
                                    <Badge variant={selectedSale.status === 'pagado' ? 'default' : selectedSale.status === 'fiado' ? 'secondary' : 'destructive'} className="capitalize text-lg">
                                        {selectedSale.status}
                                    </Badge>
                                </div>
                                <div className="text-right space-y-1">
                                    <h4 className="font-semibold text-sm uppercase text-muted-foreground mb-1">Total Recibido (Global)</h4>
                                    <div className="font-bold text-green-600">${selectedSale.receivedTotals.usdFisico.toFixed(2)} USD (F)</div>
                                    <div className="font-bold text-green-600">${selectedSale.receivedTotals.usdTarjeta.toFixed(2)} USD (T)</div>
                                    <div className="font-medium text-green-600">${selectedSale.receivedTotals.cop.toLocaleString('es-CO')} COP</div>
                                    <div className="font-medium text-green-600">Bs. {selectedSale.receivedTotals.ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
