'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Receipt, Search, ChevronDown, ChevronUp, Loader2,
  ShoppingBag, CreditCard, Building2, FileText
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

const statusColors: Record<string, string> = {
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  REFUNDED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

const statusLabels: Record<string, string> = {
  COMPLETED: 'Completada',
  PENDING: 'Pendiente',
  CANCELLED: 'Cancelada',
  REFUNDED: 'Reembolsada',
}

const paymentLabels: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  CREDITO: 'Crédito',
  MIXTO: 'Mixto',
}

interface SaleItem {
  id: string
  productId: string
  quantity: number
  unitPrice: number
  discount: number
  taxRate: number
  total: number
  product: { id: string; name: string; sku: string }
}

interface SaleData {
  id: string
  folio: string
  branchId: string
  userId: string
  clientId: string | null
  subtotal: number
  taxRate: number
  tax: number
  discount: number
  total: number
  paymentMethod: string
  status: string
  notes: string | null
  createdAt: string
  branch: { id: string; name: string; code: string }
  user: { id: string; name: string }
  client: { id: string; name: string; rfc: string } | null
  items: SaleItem[]
  cfdi: { id: string; uuid: string; status: string } | null
}

export default function SalesHistory() {
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['sales', search, paymentFilter, statusFilter, branchFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (paymentFilter) params.set('paymentMethod', paymentFilter)
      if (statusFilter) params.set('status', statusFilter)
      if (branchFilter) params.set('branchId', branchFilter)
      const res = await fetch(`/api/sales?${params}`)
      return res.json()
    },
  })

  const { data: branches } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const res = await fetch('/api/branches')
      return res.json()
    },
  })

  const sales: SaleData[] = data?.sales || []
  const total = data?.total || 0

  // Quick stats
  const totalAmount = sales.reduce((s, sale) => s + (sale.status === 'COMPLETED' ? sale.total : 0), 0)
  const completedCount = sales.filter(s => s.status === 'COMPLETED').length
  const cancelledCount = sales.filter(s => s.status === 'CANCELLED').length

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 space-y-6"
    >
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                <Receipt className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Ventas</p>
                <p className="text-2xl font-bold">{MXN.format(totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Completadas</p>
                <p className="text-2xl font-bold text-emerald-600">{completedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <CreditCard className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Canceladas</p>
                <p className="text-2xl font-bold text-red-600">{cancelledCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-4 h-4" /> Historial de Ventas
              <Badge variant="secondary" className="text-[10px]">{total} registros</Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por folio o cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v === 'ALL' ? '' : v)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Método Pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                <SelectItem value="TARJETA">Tarjeta</SelectItem>
                <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                <SelectItem value="CREDITO">Crédito</SelectItem>
                <SelectItem value="MIXTO">Mixto</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === 'ALL' ? '' : v)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="COMPLETED">Completada</SelectItem>
                <SelectItem value="PENDING">Pendiente</SelectItem>
                <SelectItem value="CANCELLED">Cancelada</SelectItem>
                <SelectItem value="REFUNDED">Reembolsada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={branchFilter} onValueChange={(v) => setBranchFilter(v === 'ALL' ? '' : v)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Sucursal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                {(branches?.branches || []).map((b: { id: string; name: string }) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="hidden md:table-cell">Cliente</TableHead>
                  <TableHead className="hidden lg:table-cell">Sucursal</TableHead>
                  <TableHead className="hidden sm:table-cell">Cajero</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="hidden md:table-cell">Pago</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden lg:table-cell">CFDI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Cargando ventas...
                    </TableCell>
                  </TableRow>
                ) : sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No se encontraron ventas
                    </TableCell>
                  </TableRow>
                ) : (
                  sales.map((sale) => (
                    <>
                      <TableRow
                        key={sale.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedRow(expandedRow === sale.id ? null : sale.id)}
                      >
                        <TableCell className="font-mono text-xs font-medium">{sale.folio}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {new Date(sale.createdAt).toLocaleDateString('es-MX', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {sale.client?.name || 'Público General'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                            {sale.branch.name}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{sale.user.name}</TableCell>
                        <TableCell className="text-right font-medium">{MXN.format(sale.total)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className="text-[10px]">
                            {paymentLabels[sale.paymentMethod] || sale.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[sale.status] || ''} text-[10px]`}>
                            {statusLabels[sale.status] || sale.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {sale.cfdi ? (
                            <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 text-[10px] gap-1">
                              <FileText className="w-3 h-3" />
                              {sale.cfdi.status}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedRow === sale.id && (
                        <TableRow key={`${sale.id}-expanded`}>
                          <TableCell colSpan={9} className="bg-muted/30 p-4">
                            <div className="space-y-3">
                              <h4 className="font-semibold text-sm">Detalle de Venta {sale.folio}</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div><span className="text-muted-foreground">Subtotal:</span> {MXN.format(sale.subtotal)}</div>
                                <div><span className="text-muted-foreground">IVA ({(sale.taxRate * 100).toFixed(0)}%):</span> {MXN.format(sale.tax)}</div>
                                <div><span className="text-muted-foreground">Descuento:</span> {MXN.format(sale.discount)}</div>
                                <div><span className="text-muted-foreground font-medium">Total:</span> <span className="font-bold">{MXN.format(sale.total)}</span></div>
                              </div>
                              {sale.notes && (
                                <div className="text-sm"><span className="text-muted-foreground">Notas:</span> {sale.notes}</div>
                              )}
                              <div className="border rounded-lg overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Producto</TableHead>
                                      <TableHead>SKU</TableHead>
                                      <TableHead className="text-right">Cant.</TableHead>
                                      <TableHead className="text-right">Precio Unit.</TableHead>
                                      <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {sale.items.map((item) => (
                                      <TableRow key={item.id}>
                                        <TableCell className="text-sm">{item.product.name}</TableCell>
                                        <TableCell className="font-mono text-xs">{item.product.sku}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">{MXN.format(item.unitPrice)}</TableCell>
                                        <TableCell className="text-right font-medium">{MXN.format(item.total)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
