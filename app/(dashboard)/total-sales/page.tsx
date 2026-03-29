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
import { CalendarIcon, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProductSummary {
    productId: string;
    name: string;
    totalSold: number;
}

export default function TotalSalesPage() {
    const isMobile = useIsMobile()
    const [data, setData] = React.useState<ProductSummary[]>([])
    const [loading, setLoading] = React.useState(true)

    const [dateFrom, setDateFrom] = React.useState<Date | undefined>()
    const [dateTo, setDateTo] = React.useState<Date | undefined>()

    const loadData = async () => {
        setLoading(true)
        try {
            const from = dateFrom ? format(dateFrom, "yyyy-MM-dd") : undefined
            const to = dateTo ? format(dateTo, "yyyy-MM-dd") : undefined
            const res = await api.getProductsSummary(from, to)
            setData(res)
        } catch (error) {
            console.error("Error loading product summary", error)
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        loadData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateFrom, dateTo])

    return (
        <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8">
            <div className="flex flex-col gap-4">
                <h1 className="text-2xl font-bold tracking-tight">Ventas Totales por Producto</h1>
                <div className="flex flex-wrap items-end gap-4 bg-muted/30 p-3 rounded-lg border">
                    <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                        <label className="text-xs font-semibold uppercase text-muted-foreground ml-1 ">Desde</label>
                        <div className="flex items-center gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full sm:w-[180px] justify-start text-left font-normal bg-background",
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
                                            "w-full sm:w-[180px] justify-start text-left font-normal bg-background",
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
            </div>

            <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead className="text-right">Cantidad Vendida</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={2} className="h-24 text-center">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                                </TableCell>
                            </TableRow>
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                                    No hay datos de ventas para este período.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((item) => (
                                <TableRow key={item.productId}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell className="text-right font-bold text-green-600">{item.totalSold}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
