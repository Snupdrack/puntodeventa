'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import {
  Warehouse,
  AlertTriangle,
  PackageX,
  DollarSign,
  Package,
  ArrowUpDown,
  Search,
  PlusCircle,
  MinusCircle,
  ArrowRightLeft,
  Loader2,
  Filter,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/lib/store'

// ---- Types ----
interface Category {
  id: string
  name: string
  color: string | null
}

interface Product {
  id: string
  sku: string
  name: string
  category: Category
}

interface Branch {
  id: string
  name: string
  code: string
}

interface InventoryItem {
  id: string
  productId: string
  branchId: string
  quantity: number
  minStock: number
  updatedAt: string
  product: Product
  branch: Branch
}

interface InventoryKpis {
  totalProducts: number
  lowStockItems: number
  outOfStock: number
  totalValue: number
}

interface InventoryResponse {
  inventory: InventoryItem[]
  total: number
  page: number
  limit: number
  totalPages: number
  kpis: InventoryKpis
}

interface AlertItem {
  id: string
  productId: string
  branchId: string
  quantity: number
  minStock: number
  product: Product & { category: Category }
  branch: Branch
}

interface AlertsResponse {
  alerts: AlertItem[]
  outOfStock: AlertItem[]
  lowStock: AlertItem[]
  total: number
}

// ---- Adjustment Schema ----
const adjustmentSchema = z.object({
  type: z.enum(['IN', 'OUT', 'TRANSFER']),
  quantity: z.coerce.number().min(1, 'La cantidad debe ser mayor a 0'),
  reason: z.string().optional(),
  targetBranchId: z.string().optional(),
})

type AdjustmentFormValues = z.infer<typeof adjustmentSchema>

// ---- Helpers ----
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)

const getStockStatus = (quantity: number, minStock: number) => {
  if (quantity === 0) return { label: 'Sin Stock', color: 'destructive', dot: 'bg-red-500' }
  if (quantity <= minStock) return { label: 'Stock Bajo', color: 'warning', dot: 'bg-amber-500' }
  return { label: 'En Stock', color: 'success', dot: 'bg-emerald-500' }
}

// ---- KPI Card ----
function KpiCard({
  title,
  value,
  icon: Icon,
  description,
  variant = 'default',
}: {
  title: string
  value: string | number
  icon: React.ElementType
  description?: string
  variant?: 'default' | 'warning' | 'danger' | 'success'
}) {
  const variantStyles = {
    default: 'border-l-emerald-500',
    warning: 'border-l-amber-500',
    danger: 'border-l-red-500',
    success: 'border-l-emerald-600',
  }

  const iconStyles = {
    default: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-500',
  }

  return (
    <Card className={`border-l-4 ${variantStyles[variant]}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          <div className={`size-10 rounded-lg flex items-center justify-center ${iconStyles[variant]}`}>
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---- Adjustment Dialog ----
function AdjustmentDialog({
  open,
  onOpenChange,
  inventoryItem,
  branches,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  inventoryItem: InventoryItem | null
  branches: Branch[]
}) {
  const queryClient = useQueryClient()

  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      type: 'IN',
      quantity: 1,
      reason: '',
      targetBranchId: '',
    },
  })

  const watchType = useWatch({ control: form.control, name: 'type' })
  const watchQuantity = useWatch({ control: form.control, name: 'quantity' })

  const newStock = useMemo(() => {
    if (!inventoryItem) return 0
    const qty = isNaN(watchQuantity) ? 0 : watchQuantity
    switch (watchType) {
      case 'IN':
        return inventoryItem.quantity + qty
      case 'OUT':
        return Math.max(0, inventoryItem.quantity - qty)
      case 'TRANSFER':
        return Math.max(0, inventoryItem.quantity - qty)
      default:
        return inventoryItem.quantity
    }
  }, [inventoryItem, watchType, watchQuantity])

  const adjustMutation = useMutation({
    mutationFn: async (data: AdjustmentFormValues) => {
      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventoryId: inventoryItem!.id,
          ...data,
          userId: 'demo-admin',
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al ajustar inventario')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] })
      onOpenChange(false)
      form.reset()
    },
  })

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      form.reset({ type: 'IN', quantity: 1, reason: '', targetBranchId: '' })
    }
    onOpenChange(newOpen)
  }

  if (!inventoryItem) return null

  const status = getStockStatus(inventoryItem.quantity, inventoryItem.minStock)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpDown className="size-5 text-primary" />
            Ajustar Inventario
          </DialogTitle>
          <DialogDescription>
            Registrar movimiento de inventario para este producto.
          </DialogDescription>
        </DialogHeader>

        {/* Product Info */}
        <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{inventoryItem.product.name}</p>
              <p className="text-xs text-muted-foreground">SKU: {inventoryItem.product.sku}</p>
            </div>
            <Badge
              className={`${status.dot === 'bg-red-500' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : status.dot === 'bg-amber-500' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'} border-0`}
            >
              <span className={`size-1.5 rounded-full ${status.dot} mr-1.5`} />
              {status.label}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              Sucursal: <span className="font-medium text-foreground">{inventoryItem.branch.name}</span>
            </span>
            <span className="text-muted-foreground">
              Stock actual: <span className="font-bold text-foreground">{inventoryItem.quantity}</span>
            </span>
            <span className="text-muted-foreground">
              Mínimo: <span className="font-medium text-foreground">{inventoryItem.minStock}</span>
            </span>
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => adjustMutation.mutate(data))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de ajuste</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="IN">
                        <span className="flex items-center gap-2">
                          <PlusCircle className="size-4 text-emerald-600" />
                          ENTRADA
                        </span>
                      </SelectItem>
                      <SelectItem value="OUT">
                        <span className="flex items-center gap-2">
                          <MinusCircle className="size-4 text-red-600" />
                          SALIDA
                        </span>
                      </SelectItem>
                      <SelectItem value="TRANSFER">
                        <span className="flex items-center gap-2">
                          <ArrowRightLeft className="size-4 text-amber-600" />
                          TRANSFERENCIA
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchType === 'TRANSFER' && (
              <FormField
                control={form.control}
                name="targetBranchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sucursal destino</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar sucursal destino" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches
                          .filter((b) => b.id !== inventoryItem.branchId)
                          .map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Razón del ajuste..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preview */}
            <div className="rounded-lg border p-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Nuevo stock estimado:</span>
              <span
                className={`text-lg font-bold ${
                  newStock === 0
                    ? 'text-red-600'
                    : newStock <= (inventoryItem?.minStock || 5)
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                }`}
              >
                {newStock}
              </span>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={adjustMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {adjustMutation.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                Aplicar Ajuste
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ---- Main Inventory Component ----
export default function Inventory() {
  const { currentBranch } = useAppStore()
  const [branchFilter, setBranchFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const limit = 10

  // Fetch branches
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await fetch('/api/branches')
      if (!res.ok) throw new Error('Error al cargar sucursales')
      return res.json() as Promise<{ branches: Branch[] }>
    },
  })

  const branches = branchesData?.branches || []

  // Fetch inventory
  const { data, isLoading } = useQuery({
    queryKey: ['inventory', branchFilter, search, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      })
      if (branchFilter && branchFilter !== 'all') params.set('branchId', branchFilter)
      if (search) params.set('search', search)

      const res = await fetch(`/api/inventory?${params}`)
      if (!res.ok) throw new Error('Error al cargar inventario')
      return res.json() as Promise<InventoryResponse>
    },
  })

  // Fetch alerts
  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['inventory-alerts', branchFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (branchFilter && branchFilter !== 'all') params.set('branchId', branchFilter)
      const res = await fetch(`/api/inventory/alerts?${params}`)
      if (!res.ok) throw new Error('Error al cargar alertas')
      return res.json() as Promise<AlertsResponse>
    },
  })

  const kpis = data?.kpis || { totalProducts: 0, lowStockItems: 0, outOfStock: 0, totalValue: 0 }
  const inventory = data?.inventory || []
  const totalPages = data?.totalPages || 1
  const alerts = alertsData?.alerts || []
  const outOfStockItems = alertsData?.outOfStock || []
  const lowStockItems = alertsData?.lowStock || []

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="p-4 md:p-6 space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Warehouse className="size-5 text-emerald-600" />
            Inventario
          </h2>
          <p className="text-sm text-muted-foreground">
            Control de existencias, ajustes y alertas de stock
            {currentBranch && (
              <span className="ml-1">· {currentBranch.name}</span>
            )}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Total Productos"
          value={kpis.totalProducts}
          icon={Package}
          variant="default"
        />
        <KpiCard
          title="Stock Bajo"
          value={kpis.lowStockItems}
          icon={TrendingDown}
          variant="warning"
          description="Requiere reabastecimiento"
        />
        <KpiCard
          title="Sin Stock"
          value={kpis.outOfStock}
          icon={PackageX}
          variant="danger"
          description="Productos agotados"
        />
        <KpiCard
          title="Valor Total"
          value={formatCurrency(kpis.totalValue)}
          icon={DollarSign}
          variant="success"
          description="A precio de costo"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="overview">Inventario</TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1.5">
            Alertas
            {alerts.length > 0 && (
              <Badge variant="destructive" className="ml-1 size-5 p-0 text-[10px] flex items-center justify-center">
                {alerts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Inventory Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o SKU..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                    className="pl-9"
                  />
                </div>
                <Select value={branchFilter} onValueChange={(v) => { setBranchFilter(v); setPage(1) }}>
                  <SelectTrigger className="w-[200px]">
                    <Filter className="size-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las sucursales</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="size-8 animate-spin text-emerald-600" />
                  <span className="ml-3 text-muted-foreground">Cargando inventario...</span>
                </div>
              ) : inventory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Warehouse className="size-12 mb-3 opacity-30" />
                  <p className="font-medium">No se encontraron registros</p>
                  <p className="text-sm">Ajusta los filtros de búsqueda</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead>Producto</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Sucursal</TableHead>
                          <TableHead className="text-center">Stock Actual</TableHead>
                          <TableHead className="text-center">Stock Mínimo</TableHead>
                          <TableHead className="text-center">Estado</TableHead>
                          <TableHead className="text-center">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventory.map((item, idx) => {
                          const status = getStockStatus(item.quantity, item.minStock)
                          return (
                            <motion.tr
                              key={item.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.03, duration: 0.2 }}
                              className="hover:bg-muted/30 transition-colors border-b"
                            >
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm">{item.product.name}</p>
                                  {item.product.category && (
                                    <p className="text-xs text-muted-foreground">
                                      {item.product.category.name}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {item.product.sku}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {item.branch.name}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-bold text-sm">{item.quantity}</span>
                              </TableCell>
                              <TableCell className="text-center text-sm text-muted-foreground">
                                {item.minStock}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  className={`${
                                    status.dot === 'bg-red-500'
                                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
                                      : status.dot === 'bg-amber-500'
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                  }`}
                                  variant="outline"
                                >
                                  <span className={`size-1.5 rounded-full ${status.dot} mr-1.5`} />
                                  {status.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1.5 text-xs"
                                  onClick={() => {
                                    setSelectedItem(item)
                                    setAdjustDialogOpen(true)
                                  }}
                                >
                                  <ArrowUpDown className="size-3.5" />
                                  Ajustar
                                </Button>
                              </TableCell>
                            </motion.tr>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {(page - 1) * limit + 1}-{Math.min(page * limit, data?.total || 0)} de{' '}
                      {data?.total || 0} registros
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                      >
                        <ChevronLeft className="size-4" />
                      </Button>
                      <span className="px-3 text-sm font-medium">
                        {page} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        disabled={page >= totalPages}
                        onClick={() => setPage(page + 1)}
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="mt-4 space-y-4">
          {alertsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-8 animate-spin text-amber-500" />
              <span className="ml-3 text-muted-foreground">Cargando alertas...</span>
            </div>
          ) : alerts.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <TrendingUp className="size-12 mb-3 mx-auto opacity-30 text-emerald-500" />
                <p className="font-medium">Todo en orden</p>
                <p className="text-sm">No hay productos con stock bajo o agotado</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Out of Stock */}
              {outOfStockItems.length > 0 && (
                <Card className="border-red-200 dark:border-red-900">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-red-700 dark:text-red-400">
                      <PackageX className="size-5" />
                      Sin Stock ({outOfStockItems.length})
                    </CardTitle>
                    <CardDescription>Productos completamente agotados que requieren reabastecimiento urgente</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-red-50/50 dark:bg-red-950/20">
                            <TableHead>Producto</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Sucursal</TableHead>
                            <TableHead className="text-center">Stock</TableHead>
                            <TableHead className="text-center">Mínimo</TableHead>
                            <TableHead className="text-center">Diferencia</TableHead>
                            <TableHead className="text-center">Acción</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {outOfStockItems.map((item) => (
                            <TableRow key={item.id} className="hover:bg-red-50/30 dark:hover:bg-red-950/10">
                              <TableCell className="font-medium text-sm">{item.product.name}</TableCell>
                              <TableCell className="font-mono text-xs">{item.product.sku}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{item.branch.name}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="destructive" className="text-xs">0</Badge>
                              </TableCell>
                              <TableCell className="text-center text-sm">{item.minStock}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="destructive" className="text-xs">-{item.minStock}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1 text-xs text-red-700 dark:text-red-400"
                                  onClick={() => {
                                    setSelectedItem(item as unknown as InventoryItem)
                                    setAdjustDialogOpen(true)
                                  }}
                                >
                                  <PlusCircle className="size-3.5" />
                                  Reabastecer
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Low Stock */}
              {lowStockItems.length > 0 && (
                <Card className="border-amber-200 dark:border-amber-900">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="size-5" />
                      Stock Bajo ({lowStockItems.length})
                    </CardTitle>
                    <CardDescription>Productos con existencias por debajo del mínimo requerido</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-amber-50/50 dark:bg-amber-950/20">
                            <TableHead>Producto</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Sucursal</TableHead>
                            <TableHead className="text-center">Stock</TableHead>
                            <TableHead className="text-center">Mínimo</TableHead>
                            <TableHead className="text-center">Diferencia</TableHead>
                            <TableHead className="text-center">Acción</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lowStockItems.map((item) => (
                            <TableRow key={item.id} className="hover:bg-amber-50/30 dark:hover:bg-amber-950/10">
                              <TableCell className="font-medium text-sm">{item.product.name}</TableCell>
                              <TableCell className="font-mono text-xs">{item.product.sku}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{item.branch.name}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-xs">
                                  {item.quantity}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center text-sm">{item.minStock}</TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-xs">
                                  -{item.minStock - item.quantity}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1 text-xs text-amber-700 dark:text-amber-400"
                                  onClick={() => {
                                    setSelectedItem(item as unknown as InventoryItem)
                                    setAdjustDialogOpen(true)
                                  }}
                                >
                                  <PlusCircle className="size-3.5" />
                                  Ajustar
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Adjustment Dialog */}
      <AdjustmentDialog
        open={adjustDialogOpen}
        onOpenChange={setAdjustDialogOpen}
        inventoryItem={selectedItem}
        branches={branches}
      />
    </motion.div>
  )
}
