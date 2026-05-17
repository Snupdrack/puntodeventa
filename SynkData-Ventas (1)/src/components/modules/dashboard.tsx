'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  DollarSign,
  Receipt,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'

// ---- Types ----
interface DashboardData {
  kpis: {
    ventasHoy: { total: number; trend: number }
    ticketsHoy: { count: number; trend: number }
    utilidadNeta: { total: number; trend: number }
    inventarioBajo: { count: number; trend: number }
  }
  dailySales: { date: string; total: number; count: number }[]
  topProducts: {
    productId: string
    name: string
    sku: string
    quantity: number
    revenue: number
  }[]
  recentSales: {
    id: string
    folio: string
    clientName: string
    total: number
    paymentMethod: string
    createdAt: string
    status: string
  }[]
  expenseBreakdown: { category: string; amount: number }[]
}

// ---- Helpers ----
function formatMXN(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatCompactMXN(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`
  }
  return formatMXN(value)
}

const expenseCategoryLabels: Record<string, string> = {
  ALQUILER: 'Alquiler',
  SERVICIOS: 'Servicios',
  SUELDOS: 'Sueldos',
  MANTENIMIENTO: 'Mantenimiento',
  PUBLICIDAD: 'Publicidad',
  TRANSPORTE: 'Transporte',
  OTROS: 'Otros',
}

const expenseCategoryColors: Record<string, string> = {
  ALQUILER: '#14b8a6',
  SERVICIOS: '#f59e0b',
  SUELDOS: '#6366f1',
  MANTENIMIENTO: '#ef4444',
  PUBLICIDAD: '#8b5cf6',
  TRANSPORTE: '#06b6d4',
  OTROS: '#6b7280',
}

const paymentMethodLabels: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  CREDITO: 'Crédito',
  MIXTO: 'Mixto',
}

const statusConfig: Record<string, { label: string; className: string }> = {
  COMPLETED: {
    label: 'Completada',
    className:
      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  },
  PENDING: {
    label: 'Pendiente',
    className:
      'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
  },
  CANCELLED: {
    label: 'Cancelada',
    className:
      'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20',
  },
  REFUNDED: {
    label: 'Reembolsada',
    className:
      'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20',
  },
}

// ---- Animation variants ----
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

// ---- Sub-components ----

function KPICard({
  title,
  value,
  trend,
  icon: Icon,
  iconBg,
  isCurrency = false,
}: {
  title: string
  value: number
  trend: number
  icon: React.ElementType
  iconBg: string
  isCurrency?: boolean
}) {
  const isPositive = trend >= 0
  return (
    <motion.div variants={itemVariants}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-medium">{title}</p>
              <p className="text-2xl font-bold tracking-tight">
                {isCurrency ? formatMXN(value) : value.toLocaleString('es-MX')}
              </p>
              <div className="flex items-center gap-1 text-xs">
                {isPositive ? (
                  <ArrowUpRight className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <ArrowDownRight className="size-3.5 text-red-600 dark:text-red-400" />
                )}
                <span
                  className={
                    isPositive
                      ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                      : 'text-red-600 dark:text-red-400 font-medium'
                  }
                >
                  {isPositive ? '+' : ''}
                  {trend.toFixed(1)}%
                </span>
                <span className="text-muted-foreground">vs anterior</span>
              </div>
            </div>
            <div
              className={`flex items-center justify-center size-12 rounded-xl ${iconBg}`}
            >
              <Icon className="size-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function KPISkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="size-12 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  )
}

function SalesChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[280px] w-full rounded-lg" />
      </CardContent>
    </Card>
  )
}

function TopProductsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function RecentSalesSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ExpenseBreakdownSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[280px] w-full rounded-lg" />
      </CardContent>
    </Card>
  )
}

// ---- Custom Tooltip for Sales Chart ----
function SalesChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number; name: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const dateStr = label ? format(parseISO(label), "d 'de' MMM", { locale: es }) : ''
  return (
    <div className="rounded-lg border bg-background/95 backdrop-blur-sm px-3 py-2 shadow-xl text-xs">
      <p className="font-medium mb-1">{dateStr}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <div
            className="size-2 rounded-full"
            style={{ backgroundColor: entry.name === 'total' ? '#14b8a6' : '#f59e0b' }}
          />
          <span className="text-muted-foreground">
            {entry.name === 'total' ? 'Ventas' : 'Transacciones'}:
          </span>
          <span className="font-semibold">
            {entry.name === 'total' ? formatMXN(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ---- Main Dashboard Component ----
export default function Dashboard() {
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error('Error al cargar datos')
      return res.json()
    },
    staleTime: 30_000,
  })

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4"
      >
        <div className="flex items-center justify-center size-16 rounded-2xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="size-8 text-red-500" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="font-semibold text-lg">Error al cargar datos</h3>
          <p className="text-sm text-muted-foreground">
            No se pudo obtener la información del dashboard. Intenta de nuevo.
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 md:p-6 space-y-6"
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <KPISkeleton />
            <KPISkeleton />
            <KPISkeleton />
            <KPISkeleton />
          </>
        ) : (
          data && (
            <>
              <KPICard
                title="Ventas Hoy"
                value={data.kpis.ventasHoy.total}
                trend={data.kpis.ventasHoy.trend}
                icon={DollarSign}
                iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                isCurrency
              />
              <KPICard
                title="Tickets Hoy"
                value={data.kpis.ticketsHoy.count}
                trend={data.kpis.ticketsHoy.trend}
                icon={Receipt}
                iconBg="bg-amber-500/10 text-amber-600 dark:text-amber-400"
              />
              <KPICard
                title="Utilidad Neta"
                value={data.kpis.utilidadNeta.total}
                trend={data.kpis.utilidadNeta.trend}
                icon={TrendingUp}
                iconBg="bg-teal-500/10 text-teal-600 dark:text-teal-400"
                isCurrency
              />
              <KPICard
                title="Inventario Bajo"
                value={data.kpis.inventarioBajo.count}
                trend={data.kpis.inventarioBajo.trend}
                icon={AlertTriangle}
                iconBg="bg-red-500/10 text-red-600 dark:text-red-400"
              />
            </>
          )
        )}
      </div>

      {/* Middle Row: Sales Chart + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Chart - 2/3 */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          {isLoading ? (
            <SalesChartSkeleton />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ventas de los últimos 30 días</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Ingresos diarios y número de transacciones
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data?.dailySales ?? []}
                      margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(v) => format(parseISO(v), 'd MMM', { locale: es })}
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tickFormatter={(v) => formatCompactMXN(v)}
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                        width={60}
                      />
                      <Tooltip content={<SalesChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="total"
                        name="total"
                        stroke="#14b8a6"
                        strokeWidth={2}
                        fill="url(#salesGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Top Products - 1/3 */}
        <motion.div variants={itemVariants}>
          {isLoading ? (
            <TopProductsSkeleton />
          ) : (
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base">Top Productos</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Más vendidos este mes por cantidad
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {data?.topProducts.map((product, idx) => {
                  const maxQty = data.topProducts[0]?.quantity ?? 1
                  const pct = (product.quantity / maxQty) * 100
                  return (
                    <div key={product.productId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-semibold text-muted-foreground w-5 shrink-0">
                            {idx + 1}
                          </span>
                          <span className="truncate font-medium">{product.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                          {product.quantity} uds
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: idx * 0.1, ease: 'easeOut' }}
                            className="h-full rounded-full bg-emerald-500"
                          />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground shrink-0 w-20 text-right">
                          {formatMXN(product.revenue)}
                        </span>
                      </div>
                    </div>
                  )
                })}
                {(!data?.topProducts || data.topProducts.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Sin datos de productos vendidos
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>

      {/* Bottom Row: Recent Sales + Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Sales */}
        <motion.div variants={itemVariants}>
          {isLoading ? (
            <RecentSalesSkeleton />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ventas Recientes</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Últimas 10 transacciones registradas
                </p>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="max-h-[340px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6">Folio</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.recentSales.map((sale) => {
                        const status = statusConfig[sale.status] ?? statusConfig.PENDING
                        return (
                          <TableRow key={sale.id}>
                            <TableCell className="pl-6 font-mono text-xs">
                              {sale.folio}
                            </TableCell>
                            <TableCell className="max-w-[120px] truncate text-sm">
                              {sale.clientName}
                            </TableCell>
                            <TableCell className="text-right font-medium text-sm">
                              {formatMXN(sale.total)}
                            </TableCell>
                            <TableCell className="text-xs">
                              {paymentMethodLabels[sale.paymentMethod] ?? sale.paymentMethod}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(parseISO(sale.createdAt), 'HH:mm', { locale: es })}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 ${status.className}`}
                              >
                                {status.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {(!data?.recentSales || data.recentSales.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Sin ventas recientes
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Expense Breakdown */}
        <motion.div variants={itemVariants}>
          {isLoading ? (
            <ExpenseBreakdownSkeleton />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gastos del Mes</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Desglose por categoría
                </p>
              </CardHeader>
              <CardContent>
                {data?.expenseBreakdown && data.expenseBreakdown.length > 0 ? (
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="h-[240px] w-[240px] shrink-0 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.expenseBreakdown}
                            dataKey="amount"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            strokeWidth={2}
                            stroke="hsl(var(--background))"
                          >
                            {data.expenseBreakdown.map((entry) => (
                              <Cell
                                key={entry.category}
                                fill={expenseCategoryColors[entry.category] ?? '#6b7280'}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => formatMXN(value)}
                            labelFormatter={(label: string) =>
                              expenseCategoryLabels[label] ?? label
                            }
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Center total */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          Total
                        </span>
                        <span className="text-sm font-bold">
                          {formatMXN(
                            data.expenseBreakdown.reduce((s, e) => s + e.amount, 0)
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2 w-full">
                      {data.expenseBreakdown.map((entry) => (
                        <div
                          key={entry.category}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="size-3 rounded-sm shrink-0"
                              style={{
                                backgroundColor:
                                  expenseCategoryColors[entry.category] ?? '#6b7280',
                              }}
                            />
                            <span className="text-muted-foreground">
                              {expenseCategoryLabels[entry.category] ?? entry.category}
                            </span>
                          </div>
                          <span className="font-medium">
                            {formatMXN(entry.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">
                    Sin gastos registrados este mes
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}
