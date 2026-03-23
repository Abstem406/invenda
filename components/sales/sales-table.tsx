"use client"

import * as React from "react"
import { api, Sale, ExchangeRates, Product } from "@/lib/services/api"
import { useIsMobile } from "@/hooks/use-mobile"
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
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
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
import { Plus, Minus, Trash2, Eye, ShoppingCart, Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

// Local interface for Cart Items before posting to API
interface CartItem {
    product: Product;
    quantity: number;
    vesBaseCurrency: "usd" | "cop";
    autoPaymentMethod: "none" | "usdFisico" | "usdTarjeta" | "cop" | "ves";
    payments: {
        usdTarjeta: number;
        usdFisico: number;
        cop: number;
        ves: number;
    };
}

export function SalesTable() {
    const isMobile = useIsMobile()
    const [sales, setSales] = React.useState<Sale[]>([])
    const [products, setProducts] = React.useState<Product[]>([])
    const [rates, setRates] = React.useState<ExchangeRates>({ cop: 5, bcv: 435, copUsd: 3754 })
    const [loading, setLoading] = React.useState(true)

    // Cart states
    const [isCreateOpen, setIsCreateOpen] = React.useState(false)
    const [cart, setCart] = React.useState<CartItem[]>([])

    // Product Command/Popover states
    const [openCombobox, setOpenCombobox] = React.useState(false)
    const [searchCombobox, setSearchCombobox] = React.useState("")
    const [refreshTrigger, setRefreshTrigger] = React.useState(0)
    const [prodPage, setProdPage] = React.useState(1)
    const [hasMoreProds, setHasMoreProds] = React.useState(true)
    const [isLoadMoreProds, setIsLoadMoreProds] = React.useState(false)
    const observerTarget = React.useRef<HTMLDivElement>(null)

    const [saleStatus, setSaleStatus] = React.useState<"pagado" | "fiado" | "debiendo">("pagado")
    const [defaultCurrency, setDefaultCurrency] = React.useState<"none" | "usdFisico" | "usdTarjeta" | "cop" | "ves">("none")
    const [receivedUsdForChange, setReceivedUsdForChange] = React.useState("")
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [checkoutError, setCheckoutError] = React.useState<string | null>(null)

    // View Details states
    const [isDetailsOpen, setIsDetailsOpen] = React.useState(false)
    const [selectedSale, setSelectedSale] = React.useState<Sale | null>(null)
    const [detailProductNames, setDetailProductNames] = React.useState<Record<string, string>>({})
    const [isLoadingDetails, setIsLoadingDetails] = React.useState(false)

    const getDynamicVes = React.useCallback((p: Product, baseCurrency: "usd" | "cop") => {
        if (!p.price) return 0;
        if (baseCurrency === "usd") return (p.price.usdTarjeta || 0) * rates.bcv;
        // COP base: COP / Factor COP = Bs
        return (p.price.cop || 0) / rates.cop;
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
        let uT = 0, uF = 0, c = 0, v = 0;
        cart.forEach(item => {
            const p = item.product.price || { usdTarjeta: 0, usdFisico: 0, cop: 0, ves: 0 };
            let unitVes = getDynamicVes(item.product, item.vesBaseCurrency);

            uT += ((p.usdTarjeta || 0) * item.quantity);
            uF += ((p.usdFisico || 0) * item.quantity);
            c += ((p.cop || 0) * item.quantity);
            v += (unitVes * item.quantity);
        });
        return { usdTarjeta: uT, usdFisico: uF, cop: c, ves: v }
    }, [cart, rates, getDynamicVes]);

    // Pagination & Search states
    const [currentPage, setCurrentPage] = React.useState(1)
    const [totalPages, setTotalPages] = React.useState(1)
    const [searchTerm, setSearchTerm] = React.useState("")
    const [debouncedSearch, setDebouncedSearch] = React.useState("")
    const [limit, setLimit] = React.useState<number>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("invenda_sales_limit")
            if (saved) return Number(saved)
        }
        return 5
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
        loadData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, debouncedSearch, limit])

    // When defaultCurrency changes, recalculate ALL cart items payments immediately
    React.useEffect(() => {
        if (cart.length === 0) return;
        setCart(prev => prev.map(item => {
            const payments = { usdTarjeta: 0, usdFisico: 0, cop: 0, ves: 0 };
            if (defaultCurrency && defaultCurrency !== "none") {
                const p = item.product.price || { usdTarjeta: 0, usdFisico: 0, cop: 0, ves: 0 };
                if (defaultCurrency === "usdFisico") payments.usdFisico = (p.usdFisico || 0) * item.quantity;
                else if (defaultCurrency === "usdTarjeta") payments.usdTarjeta = (p.usdTarjeta || 0) * item.quantity;
                else if (defaultCurrency === "cop") payments.cop = (p.cop || 0) * item.quantity;
                else if (defaultCurrency === "ves") payments.ves = getDynamicVes(item.product, item.vesBaseCurrency) * item.quantity;
            }
            return { ...item, autoPaymentMethod: defaultCurrency, payments };
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultCurrency])

    const loadData = async () => {
        setLoading(true)
        try {
            const [salesRes, exchange] = await Promise.all([
                api.getSales({
                    page: currentPage,
                    limit: limit,
                    search: debouncedSearch || undefined
                }),
                api.getExchangeRates()
            ])
            setSales(salesRes.data)
            setTotalPages(salesRes.meta.totalPages)
            setRates(exchange)

            if (currentPage > 1 && salesRes.data.length === 0 && salesRes.meta.total > 0) {
                setCurrentPage(salesRes.meta.totalPages);
            }
        } catch (error) {
            console.error("Error loading sales", error);
        } finally {
            setLoading(false)
        }
    }

    // Load Initial/Search Products for Combobox
    React.useEffect(() => {
        const loadInitialProducts = async () => {
            setIsLoadMoreProds(true);
            try {
                const res = await api.getProducts({ page: 1, limit: 15, search: searchCombobox, hasPrice: true });
                setProducts(res.data);
                setProdPage(1);
                setHasMoreProds(res.data.length > 0 && res.meta.totalPages > 1);
            } catch (err) {
                console.error("Error loading products for combobox", err);
            } finally {
                setIsLoadMoreProds(false);
            }
        };
        const timer = setTimeout(() => {
            loadInitialProducts();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchCombobox, refreshTrigger]);

    // Load More Products API
    const loadMoreProducts = React.useCallback(async () => {
        if (!hasMoreProds || isLoadMoreProds) return;
        setIsLoadMoreProds(true);
        try {
            const nextPage = prodPage + 1;
            const res = await api.getProducts({ page: nextPage, limit: 15, search: searchCombobox, hasPrice: true });

            if (res.data.length > 0) {
                setProducts(prev => {
                    // Avoid duplicates if API returns overlapping results
                    const existingIds = new Set(prev.map(p => p.id));
                    const newProds = res.data.filter(p => !existingIds.has(p.id));
                    return [...prev, ...newProds];
                });
                setProdPage(nextPage);
            } else {
                setHasMoreProds(false);
            }

            if (nextPage >= res.meta.totalPages) {
                setHasMoreProds(false);
            }
        } catch (err) {
            console.error("Error loading more products", err);
        } finally {
            setIsLoadMoreProds(false);
        }
    }, [prodPage, hasMoreProds, isLoadMoreProds, searchCombobox]);

    // Intersection Observer for Infinite Scroll
    React.useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) {
                    loadMoreProducts();
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current && openCombobox) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [loadMoreProducts, openCombobox]);

    const resetForm = () => {
        setIsCreateOpen(false)
        setCart([])
        setSearchCombobox("")
        setSaleStatus("pagado")
        setDefaultCurrency("none")
        setReceivedUsdForChange("")
        setCheckoutError(null)
    }

    const handleAddToCart = (productId: string) => {
        if (!productId) return;
        const prod = products.find(p => p.id === productId);
        if (!prod) return;

        // Check if already in cart
        if (cart.find(c => c.product.id === prod.id)) return;

        const initialVesBaseCurrency = "usd";

        // Auto-fill payment based on the selected default currency
        const payments = { usdTarjeta: 0, usdFisico: 0, cop: 0, ves: 0 };
        if (defaultCurrency && defaultCurrency !== "none") {
            const defaultPrice = prod.price || { usdTarjeta: 0, usdFisico: 0, cop: 0, ves: 0 };
            if (defaultCurrency === "usdFisico") payments.usdFisico = defaultPrice.usdFisico || 0;
            else if (defaultCurrency === "usdTarjeta") payments.usdTarjeta = defaultPrice.usdTarjeta || 0;
            else if (defaultCurrency === "cop") payments.cop = defaultPrice.cop || 0;
            else if (defaultCurrency === "ves") payments.ves = getDynamicVes(prod, initialVesBaseCurrency);
        }

        setCart(prev => [...prev, {
            product: prod,
            quantity: 1,
            vesBaseCurrency: initialVesBaseCurrency,
            autoPaymentMethod: defaultCurrency,
            payments
        }]);
        setOpenCombobox(false);
        setSearchCombobox("");
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

    const updateItemAutoPaymentMethod = (productId: string, val: "none" | "usdFisico" | "usdTarjeta" | "cop" | "ves") => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const payments = { usdTarjeta: 0, usdFisico: 0, cop: 0, ves: 0 };
                if (val !== "none") {
                    const p = item.product.price || { usdTarjeta: 0, usdFisico: 0, cop: 0, ves: 0 };
                    if (val === "usdFisico") payments.usdFisico = (p.usdFisico || 0) * item.quantity;
                    else if (val === "usdTarjeta") payments.usdTarjeta = (p.usdTarjeta || 0) * item.quantity;
                    else if (val === "cop") payments.cop = (p.cop || 0) * item.quantity;
                    else if (val === "ves") payments.ves = getDynamicVes(item.product, item.vesBaseCurrency) * item.quantity;
                }
                return { ...item, autoPaymentMethod: val, payments };
            }
            return item;
        }));
    }

    const updateCartQuantity = (productId: string, newQuantity: string) => {
        const qty = parseInt(newQuantity, 10);
        if (isNaN(qty) || qty < 1) return;

        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const safeQty = Math.min(qty, item.product.stock);
                // Recalculate payments based on the item's local auto payment method
                const updatedPayments = { ...item.payments };
                if (item.autoPaymentMethod && item.autoPaymentMethod !== "none") {
                    const p = item.product.price || { usdTarjeta: 0, usdFisico: 0, cop: 0, ves: 0 };
                    if (item.autoPaymentMethod === "usdFisico") updatedPayments.usdFisico = (p.usdFisico || 0) * safeQty;
                    else if (item.autoPaymentMethod === "usdTarjeta") updatedPayments.usdTarjeta = (p.usdTarjeta || 0) * safeQty;
                    else if (item.autoPaymentMethod === "cop") updatedPayments.cop = (p.cop || 0) * safeQty;
                    else if (item.autoPaymentMethod === "ves") updatedPayments.ves = getDynamicVes(item.product, item.vesBaseCurrency) * safeQty;
                }
                return { ...item, quantity: safeQty, payments: updatedPayments };
            }
            return item;
        }))
    }

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    }

    const updateItemVesBaseCurrency = (productId: string, val: "usd" | "cop") => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const updatedItem = { ...item, vesBaseCurrency: val };
                // Also recalculate ves default payment if needed
                const updatedPayments = { ...updatedItem.payments };
                if (defaultCurrency === "ves") {
                    updatedPayments.ves = getDynamicVes(updatedItem.product, val) * updatedItem.quantity;
                }
                return { ...updatedItem, payments: updatedPayments };
            }
            return item;
        }));
    }

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setIsSubmitting(true);
        setCheckoutError(null);

        try {
            await api.createSale({
                items: cart.map(c => {
                    const safePrice = c.product.price || { usdTarjeta: 0, usdFisico: 0, cop: 0, ves: 0, exchangeType: 'usd' as const };
                    return {
                        productId: c.product.id,
                        quantity: c.quantity,
                        unitPrice: {
                            ...safePrice,
                            ves: getDynamicVes(c.product, c.vesBaseCurrency)
                        },
                        totalPrice: {
                            usdTarjeta: (safePrice.usdTarjeta || 0) * c.quantity,
                            usdFisico: (safePrice.usdFisico || 0) * c.quantity,
                            cop: (safePrice.cop || 0) * c.quantity,
                            ves: getDynamicVes(c.product, c.vesBaseCurrency) * c.quantity,
                            exchangeType: safePrice.exchangeType
                        },
                        payments: c.payments
                    }
                }),
                receivedTotals: receivedTotals,
                status: saleStatus
            });

            await loadData();
            setRefreshTrigger(prev => prev + 1);
            resetForm();
        } catch (error: any) {
            console.error("Error creating sale", error);
            setCheckoutError(error.message || "Ocurrió un error al procesar la venta. Por favor, revisa los datos ingresados.");
        } finally {
            setIsSubmitting(false);
        }
    }

    const openDetails = async (sale: Sale) => {
        setSelectedSale(sale);
        setIsDetailsOpen(true);
        setIsLoadingDetails(true);
        setDetailProductNames({});

        try {
            // Fetch product names for all items in the sale
            const productIds = sale.items.map(item => item.productId);
            const uniqueIds = [...new Set(productIds)];
            const nameMap: Record<string, string> = {};

            // Try to resolve names from already loaded products first
            const missingIds: string[] = [];
            for (const id of uniqueIds) {
                const found = products.find(p => p.id === id);
                if (found) {
                    nameMap[id] = found.name;
                } else {
                    missingIds.push(id);
                }
            }

            // Fetch missing products from the API
            if (missingIds.length > 0) {
                const res = await api.getProducts({ limit: 50 });
                for (const p of res.data) {
                    if (missingIds.includes(p.id)) {
                        nameMap[p.id] = p.name;
                    }
                }
            }

            setDetailProductNames(nameMap);
        } catch (error) {
            console.error("Error loading product details", error);
        } finally {
            setIsLoadingDetails(false);
        }
    }

    // Validation for checkout
    const hasItemsWithoutPrice = React.useMemo(() => {
        return cart.some(item => {
            const p = item.product.price;
            if (!p) return true;
            return (p.usdTarjeta || 0) === 0 && (p.usdFisico || 0) === 0 && (p.cop || 0) === 0 && (p.ves || 0) === 0;
        });
    }, [cart]);

    const canCheckout = cart.length > 0 && !isSubmitting && (saleStatus === "fiado" || !hasItemsWithoutPrice);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 w-full sm:w-auto flex-1">
                    <h2 className="text-xl font-semibold hidden sm:block">Historial de Ventas</h2>
                    <Input
                        placeholder="Buscar por estado (ej. pagado)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-xs"
                    />
                </div>
                <Dialog open={isCreateOpen} onOpenChange={(val) => {
                    setIsCreateOpen(val);
                    if (!val) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button size="lg" className="text-md">
                            <Plus className="w-4 h-4 mr-2" />
                            Nueva Venta
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[100vw] sm:max-w-[95vw] w-full sm:w-[95vw] h-[100dvh] sm:h-auto sm:max-h-[95vh] flex flex-col overflow-hidden p-4 sm:p-6 rounded-none sm:rounded-lg">
                        <DialogHeader className="shrink-0">
                            <DialogTitle>Registrar Nueva Venta</DialogTitle>
                            <DialogDescription>
                                Agrega los productos al carrito, ajusta cantidades y procesa el pago.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-1 space-y-4">
                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end mt-2">
                                <div className="flex-1 space-y-2 w-full">
                                    <label className="text-sm font-medium">Agregar Producto al Carrito</label>
                                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openCombobox}
                                                className="w-full justify-between"
                                            >
                                                Selecciona un producto en stock...
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="w-[300px] sm:w-[500px] p-0 pointer-events-auto"
                                            align="start"
                                        >
                                            <Command shouldFilter={false}>
                                                <CommandInput
                                                    placeholder="Buscar producto..."
                                                    value={searchCombobox}
                                                    onValueChange={setSearchCombobox}
                                                />
                                                <CommandList
                                                    className="max-h-[300px] overflow-y-auto"
                                                    onWheel={(e) => {
                                                        // Prevent Radix dialog from hijacking the wheel scroll
                                                        e.stopPropagation();
                                                    }}
                                                >
                                                    <CommandEmpty>
                                                        {isLoadMoreProds ? "Buscando..." : "No se encontró ningún producto libre."}
                                                    </CommandEmpty>
                                                    <CommandGroup>
                                                        {products
                                                            .filter(p => p.stock > 0 && !cart.find(c => c.product.id === p.id))
                                                            .map((p) => (
                                                                <CommandItem
                                                                    key={p.id}
                                                                    value={p.id}
                                                                    onSelect={(currentValue) => {
                                                                        handleAddToCart(currentValue)
                                                                    }}
                                                                >
                                                                    <div className="flex items-center justify-between w-full">
                                                                        <span>{p.name}</span>
                                                                        <span className="font-mono text-muted-foreground mr-2 text-xs">Stock: {p.stock}</span>
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                    </CommandGroup>
                                                    {/* Intersection trigger */}
                                                    {(hasMoreProds || isLoadMoreProds) && (
                                                        <div ref={observerTarget} className="flex justify-center p-4">
                                                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                                        </div>
                                                    )}
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2 w-full sm:w-auto">
                                    <label className="text-sm font-medium">Metodo de pago automático</label>
                                    <Select value={defaultCurrency} onValueChange={(val: any) => setDefaultCurrency(val)}>
                                        <SelectTrigger className="w-[160px]">
                                            <SelectValue placeholder="Sin auto-pago" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Sin auto-pago</SelectItem>
                                            <SelectItem value="usdFisico">USD Físico</SelectItem>
                                            <SelectItem value="usdTarjeta">USD Tarjeta</SelectItem>
                                            <SelectItem value="cop">COP</SelectItem>
                                            <SelectItem value="ves">Bolívares</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 w-full pb-2">
                                {cart.length === 0 ? (
                                    <div className="h-24 flex items-center justify-center text-muted-foreground border border-dashed rounded-md">
                                        El carrito está vacío.
                                    </div>
                                ) : (
                                    <Accordion type="multiple" className="w-full space-y-2">
                                        {cart.map((item) => {
                                            const p = item.product;
                                            const unitVes = getDynamicVes(p, item.vesBaseCurrency);
                                            return (
                                                <AccordionItem key={p.id} value={p.id} className="border rounded-lg bg-card px-3 shadow-sm data-[state=open]:pb-3 data-[state=closed]:py-1">
                                                    <AccordionTrigger className="hover:no-underline py-2 pr-2">
                                                        <div className="w-full text-left">
                                                            {/* Mobile Version Wrapper */}
                                                            <div className="flex sm:hidden justify-between items-start w-full gap-2 pr-1">
                                                                <div className="flex flex-col gap-3 flex-1 min-w-0 mt-1">
                                                                    <span className="font-semibold text-sm leading-tight truncate pr-2" title={p.name}>{p.name}</span>
                                                                    <div className="flex items-center z-10 shrink-0 w-max" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                                                                        <div className="flex items-center">
                                                                            <Button asChild variant="outline" size="icon" className="h-7 w-7 rounded-r-none border-r-0 cursor-pointer">
                                                                                <div role="button" tabIndex={0} onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateCartQuantity(p.id, String(Math.max(1, item.quantity - 1))) }}>
                                                                                    <Minus className="h-3 w-3" />
                                                                                </div>
                                                                            </Button>
                                                                            <Input type="number" value={item.quantity} onChange={(e) => updateCartQuantity(p.id, e.target.value)} min="1" max={p.stock} className="w-12 h-7 text-xs font-medium text-center rounded-none px-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                                                            <Button asChild variant="outline" size="icon" className="h-7 w-7 rounded-l-none border-l-0 cursor-pointer">
                                                                                <div role="button" tabIndex={0} onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateCartQuantity(p.id, String(Math.min(p.stock, item.quantity + 1))) }}>
                                                                                    <Plus className="h-3 w-3" />
                                                                                </div>
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-2 shrink-0 mt-1">
                                                                    <span className="font-bold text-sm text-green-600 truncate max-w-[150px] text-right">
                                                                        {item.autoPaymentMethod === "usdFisico" && `$${((p.price?.usdFisico || 0) * item.quantity).toFixed(2)} USD (F)`}
                                                                        {item.autoPaymentMethod === "usdTarjeta" && `$${((p.price?.usdTarjeta || 0) * item.quantity).toFixed(2)} USD (T)`}
                                                                        {item.autoPaymentMethod === "cop" && `$${((p.price?.cop || 0) * item.quantity).toLocaleString('es-CO')} COP`}
                                                                        {item.autoPaymentMethod === "ves" && `Bs. ${(unitVes * item.quantity).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`}
                                                                        {(!item.autoPaymentMethod || item.autoPaymentMethod === "none") && `Bs. ${(unitVes * item.quantity).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`}
                                                                    </span>
                                                                    <div className="z-10 shrink-0" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                                                                        <Button asChild variant="ghost" size="icon" className="text-destructive h-8 w-8 bg-destructive/10 hover:bg-destructive/20 rounded-md cursor-pointer" title="Eliminar producto">
                                                                            <div role="button" tabIndex={0} onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFromCart(p.id); }}>
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </div>
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Desktop Version Wrapper */}
                                                            <div className="hidden sm:flex items-center justify-between w-full gap-4 pr-2">
                                                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                                                    <span className="font-semibold text-sm leading-tight w-[240px] shrink-0 truncate" title={p.name}>{p.name}</span>
                                                                    <div className="flex items-center z-10 shrink-0" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                                                                        <label className="text-[10px] text-muted-foreground uppercase font-semibold mr-1.5">Cant:</label>
                                                                        <div className="flex items-center">
                                                                            <Button asChild variant="outline" size="icon" className="h-7 w-7 rounded-r-none border-r-0 cursor-pointer">
                                                                                <div role="button" tabIndex={0} onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateCartQuantity(p.id, String(Math.max(1, item.quantity - 1))) }}>
                                                                                    <Minus className="h-3 w-3" />
                                                                                </div>
                                                                            </Button>
                                                                            <Input type="number" value={item.quantity} onChange={(e) => updateCartQuantity(p.id, e.target.value)} min="1" max={p.stock} className="w-12 h-7 text-xs font-medium text-center rounded-none px-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                                                            <Button asChild variant="outline" size="icon" className="h-7 w-7 rounded-l-none border-l-0 cursor-pointer">
                                                                                <div role="button" tabIndex={0} onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateCartQuantity(p.id, String(Math.min(p.stock, item.quantity + 1))) }}>
                                                                                    <Plus className="h-3 w-3" />
                                                                                </div>
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                    <span className="ml-4 font-bold text-sm text-green-600 truncate flex-1 min-w-0 pl-2 text-left">
                                                                        {item.autoPaymentMethod === "usdFisico" && `$${((p.price?.usdFisico || 0) * item.quantity).toFixed(2)} USD (F)`}
                                                                        {item.autoPaymentMethod === "usdTarjeta" && `$${((p.price?.usdTarjeta || 0) * item.quantity).toFixed(2)} USD (T)`}
                                                                        {item.autoPaymentMethod === "cop" && `$${((p.price?.cop || 0) * item.quantity).toLocaleString('es-CO')} COP`}
                                                                        {item.autoPaymentMethod === "ves" && `Bs. ${(unitVes * item.quantity).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`}
                                                                        {(!item.autoPaymentMethod || item.autoPaymentMethod === "none") && `Bs. ${(unitVes * item.quantity).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center shrink-0">
                                                                    <div className="z-10 ml-1" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                                                                        <Button asChild variant="ghost" size="icon" className="text-destructive h-9 w-9 bg-destructive/10 hover:bg-destructive/20 rounded-md cursor-pointer" title="Eliminar producto">
                                                                            <div role="button" tabIndex={0} onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFromCart(p.id); }}>
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </div>
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="pt-2 pb-0">
                                                        <div className="space-y-4">
                                                            {/* Row 1: Configurations */}
                                                            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 w-full">
                                                                <div className="space-y-1 shrink-0 w-full sm:w-auto flex-1">
                                                                    <label className="text-[10px] text-muted-foreground uppercase font-semibold">Moneda Base</label>
                                                                    <Select value={item.vesBaseCurrency} onValueChange={(val: "usd" | "cop") => updateItemVesBaseCurrency(p.id, val)}>
                                                                        <SelectTrigger className="h-8 w-full text-xs">
                                                                            <SelectValue placeholder="Base..." />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="usd" className="text-xs">Base: USD Tarjeta</SelectItem>
                                                                            <SelectItem value="cop" className="text-xs">Base: COP</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                                <div className="space-y-1 flex-1 w-full flex-[2]">
                                                                    <label className="text-[10px] text-muted-foreground uppercase font-semibold text-primary/80">Método de Pago (Item)</label>
                                                                    <Select value={item.autoPaymentMethod} onValueChange={(val: any) => updateItemAutoPaymentMethod(p.id, val)}>
                                                                        <SelectTrigger className="h-8 w-full text-xs border-primary/50 focus:ring-primary/30">
                                                                            <SelectValue placeholder="Manual / Variado" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="none">Manual / Variado</SelectItem>
                                                                            <SelectItem value="usdFisico">USD Físico</SelectItem>
                                                                            <SelectItem value="usdTarjeta">USD Tarjeta</SelectItem>
                                                                            <SelectItem value="cop">COP</SelectItem>
                                                                            <SelectItem value="ves">Bolívares</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            </div>

                                                            {/* Calculated Totals (Debt) */}
                                                            <div className="bg-muted/30 p-2 rounded-md grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2 text-xs border">
                                                                <div className="text-muted-foreground flex flex-col">USD(T)<span className="text-foreground font-medium">${((p.price?.usdTarjeta || 0) * item.quantity).toFixed(2)}</span></div>
                                                                <div className="text-muted-foreground flex flex-col">USD(F)<span className="text-foreground font-medium">${((p.price?.usdFisico || 0) * item.quantity).toFixed(2)}</span></div>
                                                                <div className="text-muted-foreground flex flex-col">COP<span className="text-foreground font-medium">${((p.price?.cop || 0) * item.quantity).toLocaleString('es-CO')}</span></div>
                                                                <div className="text-muted-foreground flex flex-col">VES<span className="text-foreground font-medium">Bs. {(unitVes * item.quantity).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span></div>
                                                            </div>

                                                            {/* Customer Payments */}
                                                            <div className="space-y-2 pt-2 border-t mt-2">
                                                                <label className="text-[10px] text-muted-foreground uppercase font-semibold">Pagos ingresados para este item</label>
                                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs w-full">
                                                                    <div className="space-y-1">
                                                                        <label className="text-[10px] text-muted-foreground uppercase font-semibold text-center block w-full">USD Físico</label>
                                                                        <div className="flex items-center">
                                                                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-r-none border-r-0 shrink-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateItemPayment(p.id, "usdFisico", String(Math.max(0, (item.payments.usdFisico || 0) - 1))) }}><Minus className="h-3 w-3" /></Button>
                                                                            <Input type="number" step="0.01" className="h-8 w-full text-xs text-center rounded-none px-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-10" value={item.payments.usdFisico || ""} onChange={(e) => updateItemPayment(p.id, "usdFisico", e.target.value)} placeholder="0.00" />
                                                                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-l-none border-l-0 shrink-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateItemPayment(p.id, "usdFisico", String((item.payments.usdFisico || 0) + 1)) }}><Plus className="h-3 w-3" /></Button>
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <label className="text-[10px] text-muted-foreground uppercase font-semibold text-center block w-full">USD Tarjeta</label>
                                                                        <div className="flex items-center">
                                                                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-r-none border-r-0 shrink-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateItemPayment(p.id, "usdTarjeta", String(Math.max(0, (item.payments.usdTarjeta || 0) - 1))) }}><Minus className="h-3 w-3" /></Button>
                                                                            <Input type="number" step="0.01" className="h-8 w-full text-xs text-center rounded-none px-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-10" value={item.payments.usdTarjeta || ""} onChange={(e) => updateItemPayment(p.id, "usdTarjeta", e.target.value)} placeholder="0.00" />
                                                                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-l-none border-l-0 shrink-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateItemPayment(p.id, "usdTarjeta", String((item.payments.usdTarjeta || 0) + 1)) }}><Plus className="h-3 w-3" /></Button>
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <label className="text-[10px] text-muted-foreground uppercase font-semibold text-center block w-full">COP</label>
                                                                        <div className="flex items-center">
                                                                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-r-none border-r-0 shrink-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateItemPayment(p.id, "cop", String(Math.max(0, (item.payments.cop || 0) - 1000))) }}><Minus className="h-3 w-3" /></Button>
                                                                            <Input type="number" step="100" className="h-8 w-full text-xs text-center rounded-none px-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-10" value={item.payments.cop || ""} onChange={(e) => updateItemPayment(p.id, "cop", e.target.value)} placeholder="0" />
                                                                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-l-none border-l-0 shrink-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateItemPayment(p.id, "cop", String((item.payments.cop || 0) + 1000)) }}><Plus className="h-3 w-3" /></Button>
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <label className="text-[10px] text-muted-foreground uppercase font-semibold text-center block w-full">Bolívares</label>
                                                                        <div className="flex items-center">
                                                                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-r-none border-r-0 shrink-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateItemPayment(p.id, "ves", String(Math.max(0, (item.payments.ves || 0) - 10))) }}><Minus className="h-3 w-3" /></Button>
                                                                            <Input type="number" step="0.01" className="h-8 w-full text-xs text-center rounded-none px-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-10" value={item.payments.ves || ""} onChange={(e) => updateItemPayment(p.id, "ves", e.target.value)} placeholder="0.00" />
                                                                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-l-none border-l-0 shrink-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateItemPayment(p.id, "ves", String((item.payments.ves || 0) + 10)) }}><Plus className="h-3 w-3" /></Button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            )
                                        })}
                                    </Accordion>
                                )}
                            </div>

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
                                    <div className="space-y-2 pt-2 border-t mt-4">
                                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Calculadora de Vuelto</h4>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs pr-2">Billete/Monto USD Recibido:</label>
                                                <Input
                                                    type="number"
                                                    step="any"
                                                    placeholder="Ej. 10.00"
                                                    value={receivedUsdForChange}
                                                    onChange={(e) => setReceivedUsdForChange(e.target.value)}
                                                    className="w-[180px]"
                                                />
                                            </div>
                                            {parseFloat(receivedUsdForChange) > cartTotals.usdFisico && (
                                                <div className="space-y-1">
                                                    <label className="text-xs text-green-600 font-semibold">Vuelto a entregar (COP):</label>
                                                    <div className="text-xl font-bold text-green-600 bg-green-50 px-3 py-1 rounded-md border border-green-200">
                                                        {((parseFloat(receivedUsdForChange) - cartTotals.usdFisico) * rates.copUsd).toLocaleString('es-CO')} COP
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="min-w-[250px] border-l pl-8 space-y-2 self-end md:self-stretch flex flex-col justify-center">
                                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1 border-b pb-1">Recibido (Total Depositado)</h4>
                                    <div className={cn("text-2xl font-bold tracking-tight text-green-600 rounded-md transition-all duration-200", defaultCurrency === "usdFisico" && "bg-green-100 dark:bg-green-900/30 p-2 shadow-sm border border-green-200 dark:border-green-800")}>
                                        ${receivedTotals.usdFisico.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">USD (Físico)</span>
                                    </div>
                                    <div className={cn("text-2xl font-bold tracking-tight text-green-600 rounded-md transition-all duration-200", defaultCurrency === "usdTarjeta" && "bg-green-100 dark:bg-green-900/30 p-2 shadow-sm border border-green-200 dark:border-green-800")}>
                                        ${receivedTotals.usdTarjeta.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">USD (Tarjeta)</span>
                                    </div>
                                    <div className={cn("text-xl font-medium tracking-tight text-green-600 rounded-md transition-all duration-200", defaultCurrency === "cop" && "bg-green-100 dark:bg-green-900/30 p-2 shadow-sm border border-green-200 dark:border-green-800")}>
                                        ${receivedTotals.cop.toLocaleString('es-CO')} <span className="text-sm font-normal text-muted-foreground">COP</span>
                                    </div>
                                    <div className={cn("text-xl font-medium tracking-tight text-green-600 rounded-md transition-all duration-200", defaultCurrency === "ves" && "bg-green-100 dark:bg-green-900/30 p-2 shadow-sm border border-green-200 dark:border-green-800")}>
                                        Bs. {receivedTotals.ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>

                            {hasItemsWithoutPrice && saleStatus !== "fiado" && cart.length > 0 && (
                                <div className="mt-2 text-sm text-destructive font-medium border border-destructive/50 bg-destructive/10 p-3 rounded-md">
                                    Hay productos en el carrito sin precio asignado (con valor 0). Para poder procesar esta venta, el estado de la venta debe ser "Fiado".
                                </div>
                            )}

                            {checkoutError && (
                                <div className="mt-2 text-sm text-destructive font-medium border border-destructive/50 bg-destructive/10 p-3 rounded-md">
                                    {checkoutError}
                                </div>
                            )}
                        </div>
                        <DialogFooter className="mt-4 shrink-0">
                            <Button variant="outline" onClick={resetForm} disabled={isSubmitting}>Cancelar</Button>
                            <Button onClick={handleCheckout} disabled={!canCheckout} className="w-full sm:w-auto">
                                {isSubmitting ? "Procesando..." : "Confirmar Venta"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Mobile Card View */}
            {isMobile ? (
                <div className="space-y-3">
                    {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-28 w-full rounded-lg" />
                        ))
                    ) : sales.length === 0 ? (
                        <div className="h-24 flex items-center justify-center text-muted-foreground">
                            {debouncedSearch ? "No se encontraron ventas." : "No hay ventas registradas."}
                        </div>
                    ) : (
                        sales.map((sale) => (
                            <div key={sale.id} className="border rounded-lg p-4 space-y-3 bg-card" onClick={() => openDetails(sale)}>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                        {new Date(sale.date).toLocaleDateString()} {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <Badge variant={sale.status === 'pagado' ? 'default' : sale.status === 'fiado' ? 'secondary' : 'destructive'} className="capitalize">
                                        {sale.status}
                                    </Badge>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {sale.receivedTotals.usdFisico > 0 && (
                                        <Badge variant="outline" className="text-xs">${sale.receivedTotals.usdFisico.toFixed(2)} USD F</Badge>
                                    )}
                                    {sale.receivedTotals.usdTarjeta > 0 && (
                                        <Badge variant="outline" className="text-xs">${sale.receivedTotals.usdTarjeta.toFixed(2)} USD T</Badge>
                                    )}
                                    {sale.receivedTotals.cop > 0 && (
                                        <Badge variant="outline" className="text-xs">${sale.receivedTotals.cop.toLocaleString('es-CO')} COP</Badge>
                                    )}
                                    {sale.receivedTotals.ves > 0 && (
                                        <Badge variant="outline" className="text-xs">Bs. {sale.receivedTotals.ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</Badge>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
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
                                Array.from({ length: 6 }).map((_, i) => (
                                    <TableRow key={i}>
                                        {Array.from({ length: 7 }).map((_, j) => (
                                            <TableCell key={j}>
                                                <Skeleton className="h-4 w-full" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : sales.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        {debouncedSearch ? "No se encontraron ventas." : "No hay ventas registradas."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sales.map((sale) => {
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
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground w-full sm:w-auto text-center sm:text-left justify-center sm:justify-start">
                    <span>Mostrar</span>
                    <Select
                        value={limit.toString()}
                        onValueChange={(val) => {
                            setLimit(Number(val));
                            localStorage.setItem("invenda_sales_limit", val)
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

            {/* Sale Details Dialog */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="sm:max-w-2xl">
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
                                            const name = detailProductNames[item.productId] || "Producto";
                                            return (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-medium align-top py-3">
                                                        <div className="flex items-center gap-2">
                                                            {isLoadingDetails && !detailProductNames[item.productId] && <Loader2 className="w-3 h-3 animate-spin" />}
                                                            {name}
                                                        </div>
                                                    </TableCell>
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
                                    <div className="font-bold text-green-600">${selectedSale.receivedTotals.cop.toLocaleString('es-CO')} COP</div>
                                    <div className="font-bold text-green-600">Bs. {selectedSale.receivedTotals.ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div >
    )
}
