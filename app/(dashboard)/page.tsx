"use client"

import * as React from "react"
import { api, Sale, Product, ExchangeRates } from "@/lib/services/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DollarSign, Package, ShoppingCart, TrendingUp } from "lucide-react"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const chartConfig = {
  ventas: {
    label: "Ventas ($)",
    color: "hsl(var(--chart-1))",
  },
  pedidos: {
    label: "Pedidos",
    color: "hsl(var(--chart-2))",
  }
} satisfies ChartConfig

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function Home() {
  const [sales, setSales] = React.useState<Sale[]>([])
  const [products, setProducts] = React.useState<Product[]>([])
  const [rates, setRates] = React.useState<ExchangeRates | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [salesRes, prodsRes, ratesRes] = await Promise.all([
          api.getSales({ limit: 500 }),
          api.getProducts({ limit: 1000 }),
          api.getExchangeRates()
        ])
        setSales(salesRes.data)
        setProducts(prodsRes.data)
        setRates(ratesRes)
      } catch (error) {
        console.error("Error cargando dashboard:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // KPI Calculations
  const totalSalesUsd = sales.reduce((acc, sale) => acc + (sale.receivedTotals.usdFisico + sale.receivedTotals.usdTarjeta), 0)
  const todaySalesCount = sales.filter(s => new Date(s.date).toDateString() === new Date().toDateString()).length

  const lowStockThreshold = 10
  const lowStockProducts = products.filter(p => p.stock < lowStockThreshold && p.status === 1)
  const lowStockCount = lowStockProducts.length

  // Chart Data: Last 7 days of sales
  const last7DaysData = React.useMemo(() => {
    const data: Record<string, { date: string, totalUsd: number, count: number }> = {}

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      data[dateStr] = { date: dateStr, totalUsd: 0, count: 0 }
    }

    sales.forEach(sale => {
      const dateStr = new Date(sale.date).toISOString().split('T')[0]
      if (data[dateStr]) {
        data[dateStr].totalUsd += (sale.receivedTotals.usdFisico + sale.receivedTotals.usdTarjeta)
        data[dateStr].count += 1
      }
    })

    return Object.values(data).map(d => ({
      ...d,
      dateFormatted: new Date(d.date).toLocaleDateString("es-ES", { weekday: "short", day: "numeric" })
    }))
  }, [sales])

  // Chart Data: Products by Category (Top 5)
  const categoryData = React.useMemo(() => {
    const counts: Record<string, number> = {}
    products.forEach(p => {
      const catName = p.category?.name || "Sin Categoría"
      counts[catName] = (counts[catName] || 0) + p.stock
    })

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5) // Top 5 categories by stock volume
  }, [products])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Central</h1>
        <p className="text-muted-foreground mt-2">
          Resumen general de tu inventario y ventas.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Totales (USD)</CardTitle>
            <DollarSign className="h-6 w-6 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSalesUsd.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1 text-emerald-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Basado en histórico cargado
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas de Hoy</CardTitle>
            <ShoppingCart className="h-6 w-6 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaySalesCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Órdenes procesadas hoy</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-6 w-6 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground mt-1">En catálogo activo</p>
          </CardContent>
        </Card>

        {lowStockCount > 0 ? (
          <Dialog>
            <DialogTrigger asChild>
              <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-red-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Alertas de Stock</CardTitle>
                  <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse"></span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{lowStockCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">Productos con menos de {lowStockThreshold} uds.</p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Productos con Bajo Stock</DialogTitle>
                <CardDescription>Estos productos necesitan reabastecimiento pronto.</CardDescription>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                {lowStockProducts.map(product => (
                  <div key={product.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.category?.name || "Sin Categoría"}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-red-600 dark:text-red-400">{product.stock} uds.</span>
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alertas de Stock</CardTitle>
              <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse"></span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{lowStockCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Productos con menos de {lowStockThreshold} uds.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 flex flex-col">
          <CardHeader>
            <CardTitle>Ventas de los Últimos 7 Días</CardTitle>
            <CardDescription>Cobros totales en USD Físico y Tarjeta combinados.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={last7DaysData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="dateFormatted"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  className="text-xs"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                  className="text-xs"
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dashed" />}
                />
                <Bar
                  dataKey="totalUsd"
                  fill="var(--color-ventas)"
                  radius={[4, 4, 0, 0]}
                  name="Ventas ($)"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader>
            <CardTitle>Distribución de Inventario</CardTitle>
            <CardDescription>Top 5 categorías por volumen de items en stock.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-4">
            <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  strokeWidth={2}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            {/* Custom Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
              {categoryData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-xs text-muted-foreground">{entry.name} ({entry.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
