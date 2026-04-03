"use client"

import * as React from "react"
import { api } from "@/lib/services/api"
import { useIsMobile } from "@/hooks/use-mobile"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, Loader2, Search, X, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { SmartPagination } from "@/components/ui/smart-pagination"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ProductSummary {
    productId: string;
    name: string;
    totalSold: number;
    totalUsdFisico: number;
    totalUsdTarjeta: number;
    totalCop: number;
    totalVes: number;
}

export default function TotalSalesPage() {
    const isMobile = useIsMobile()
    const [data, setData] = React.useState<ProductSummary[]>([])
    const [loading, setLoading] = React.useState(true)

    const [dateFrom, setDateFrom] = React.useState<Date | undefined>()
    const [dateTo, setDateTo] = React.useState<Date | undefined>()

    // Pagination & Search states
    const [currentPage, setCurrentPage] = React.useState(1)
    const [totalPages, setTotalPages] = React.useState(1)
    const [searchTerm, setSearchTerm] = React.useState("")
    const [debouncedSearch, setDebouncedSearch] = React.useState("")
    const [limit, setLimit] = React.useState<number>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("invenda_totalsales_limit")
            if (saved) return Number(saved)
        }
        return 10
    })

    // Inspector states
    const [inspectData, setInspectData] = React.useState<ProductSummary | null>(null)

    // Debounce search
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm)
            setCurrentPage(1)
        }, 500)
        return () => clearTimeout(timer)
    }, [searchTerm])

    const loadData = async () => {
        setLoading(true)
        try {
            const from = dateFrom ? format(dateFrom, "yyyy-MM-dd") : undefined
            const to = dateTo ? format(dateTo, "yyyy-MM-dd") : undefined
            const res = await api.getProductsSummary({
                page: currentPage,
                limit,
                search: debouncedSearch || undefined,
                dateFrom: from,
                dateTo: to
            })
            setData(res.data)
            setTotalPages(res.meta.totalPages)
            if (currentPage > 1 && res.data.length === 0 && res.meta.total > 0) {
                setCurrentPage(res.meta.totalPages);
            }
        } catch (error) {
            console.error("Error loading product summary", error)
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        loadData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateFrom, dateTo, currentPage, debouncedSearch, limit])

    return (
        <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8">
            <div className="flex flex-col gap-4">
                <h1 className="text-2xl font-bold tracking-tight">Ventas Totales por Producto</h1>

                <Card>
                    <CardContent className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-end">
                        <div className="flex flex-col space-y-1.5 w-full xl:w-auto">
                            <label className="text-xs text-muted-foreground uppercase font-semibold">Buscar</label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar producto..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 w-full sm:w-[300px]"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-end gap-4 w-full xl:w-auto">
                            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                                <label className="text-xs font-semibold uppercase text-muted-foreground ml-1">Desde</label>
                                <div className="flex items-center gap-2">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full sm:w-[150px] justify-start text-left font-normal",
                                                    !dateFrom && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {dateFrom ? format(dateFrom, "PP", { locale: es }) : <span>Seleccionar</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={dateFrom}
                                                onSelect={setDateFrom}
                                                initialFocus
                                                locale={es}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    {dateFrom && (
                                        <Button variant="ghost" size="icon" onClick={() => setDateFrom(undefined)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                                <label className="text-xs font-semibold uppercase text-muted-foreground ml-1">Hasta</label>
                                <div className="flex items-center gap-2">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full sm:w-[150px] justify-start text-left font-normal",
                                                    !dateTo && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {dateTo ? format(dateTo, "PP", { locale: es }) : <span>Seleccionar</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={dateTo}
                                                onSelect={setDateTo}
                                                initialFocus
                                                locale={es}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    {dateTo && (
                                        <Button variant="ghost" size="icon" onClick={() => setDateTo(undefined)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead className="text-left">Cantidades Vendidas</TableHead>
                            <TableHead className="text-right">Inspeccionar</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: limit }).map((_, i) => (
                                <TableRow key={i}>
                                    {Array.from({ length: 3 }).map((_, j) => (
                                        <TableCell key={j}>
                                            <Skeleton className="h-4 w-full" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                    No hay datos de ventas para este período o búsqueda.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((item) => (
                                <TableRow key={item.productId}>
                                    <TableCell className="font-medium align-middle">{item.name}</TableCell>
                                    <TableCell className="text-center font-bold text-green-600 align-middle">
                                        <div className="flex flex-col gap-1 items-start">
                                            <Badge variant='success' className="capitalize">
                                                {item.totalSold} Unidades
                                            </Badge>
                                        </div>



                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" onClick={() => setInspectData(item)}>
                                            <Eye className="w-4 h-4 mr-2" />
                                            Ver Monedas
                                        </Button>
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
                            localStorage.setItem("invenda_totalsales_limit", val)
                            setCurrentPage(1);
                        }}
                    >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={limit} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[10, 20, 50, 100].map((pageSize) => (
                                <SelectItem key={pageSize} value={`${pageSize}`}>
                                    {pageSize}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <span>registros</span>
                </div>

                {totalPages > 0 && (
                    <SmartPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        maxVisiblePages={10}
                    />
                )}
            </div>

            {/* Inspector Modal */}
            <Dialog open={!!inspectData} onOpenChange={(open) => !open && setInspectData(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Detalles de Venta: {inspectData?.name}</DialogTitle>
                        <DialogDescription>
                            Sumatorio de los pagos recibidos por moneda para {inspectData?.totalSold} unidades.
                        </DialogDescription>
                    </DialogHeader>
                    {inspectData && (
                        <div className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="border rounded-lg flex flex-col items-center justify-center p-4 bg-muted/20">
                                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Bs</span>
                                    <span className="text-xl font-bold">{inspectData.totalVes.toLocaleString('es-VE')}</span>
                                </div>
                                <div className="border rounded-lg flex flex-col items-center justify-center p-4 bg-muted/20">
                                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">COP</span>
                                    <span className="text-xl font-bold">{inspectData.totalCop.toLocaleString('es-CO')}</span>
                                </div>
                                <div className="border rounded-lg flex flex-col items-center justify-center p-4 bg-muted/20">
                                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">USD Físico</span>
                                    <span className="text-xl font-bold">${inspectData.totalUsdFisico.toFixed(2)}</span>
                                </div>
                                <div className="border rounded-lg flex flex-col items-center justify-center p-4 bg-muted/20">
                                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">USD Tarjeta</span>
                                    <span className="text-xl font-bold">${inspectData.totalUsdTarjeta.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
