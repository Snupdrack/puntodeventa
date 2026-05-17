'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  FileText, Search, Plus, Loader2, CheckCircle, XCircle,
  Clock, ChevronDown, Code
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

const statusColors: Record<string, string> = {
  GENERATED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  STAMPED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const statusLabels: Record<string, string> = {
  GENERATED: 'Generado',
  STAMPED: 'Timbrado',
  CANCELLED: 'Cancelado',
}

const statusIcons: Record<string, React.ElementType> = {
  GENERATED: Clock,
  STAMPED: CheckCircle,
  CANCELLED: XCircle,
}

const cfdiTypeLabels: Record<string, string> = {
  INGRESO: 'Ingreso',
  EGRESO: 'Egreso',
  TRASLADO: 'Traslado',
  NOMINA: 'Nómina',
  PAGO: 'Pago',
}

const usoCFDIOptions = [
  { value: 'G01', label: 'G01 - Adquisición de mercancías' },
  { value: 'G02', label: 'G02 - Devoluciones, descuentos o bonificaciones' },
  { value: 'G03', label: 'G03 - Gastos en general' },
  { value: 'I01', label: 'I01 - Construcciones' },
  { value: 'I02', label: 'I02 - Mobiliario y equipo de oficina' },
  { value: 'I03', label: 'I03 - Equipo de transporte' },
  { value: 'I04', label: 'I04 - Equipo de cómputo y accesorios' },
  { value: 'I08', label: 'I08 - Otra maquinaria y equipo' },
  { value: 'D01', label: 'D01 - Honorarios médicos, dentales y gastos hospitalarios' },
  { value: 'D04', label: 'D04 - Donativos' },
  { value: 'P01', label: 'P01 - Por definir' },
]

const formaPagoOptions = [
  { value: '01', label: '01 - Efectivo' },
  { value: '02', label: '02 - Cheque nominativo' },
  { value: '03', label: '03 - Transferencia electrónica de fondos' },
  { value: '04', label: '04 - Tarjeta de crédito' },
  { value: '05', label: '05 - Monedero electrónico' },
  { value: '28', label: '28 - Tarjeta de débito' },
  { value: '99', label: '99 - Por definir' },
]

const metodoPagoOptions = [
  { value: 'PUE', label: 'PUE - Pago en una sola exhibición' },
  { value: 'PPD', label: 'PPD - Pago en parcialidades o diferido' },
]

interface CFDIRow {
  id: string
  uuid: string
  saleId: string | null
  clientRfc: string
  clientName: string
  cfdiType: string
  paymentForm: string
  paymentMethod: string
  useCFDI: string
  subtotal: number
  tax: number
  total: number
  status: string
  xmlContent: string | null
  createdAt: string
  sale: { id: string; folio: string; client: { name: string; rfc: string } | null } | null
}

export default function CFDI() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [generateOpen, setGenerateOpen] = useState(false)
  const [xmlViewOpen, setXmlViewOpen] = useState(false)
  const [selectedXml, setSelectedXml] = useState('')

  const [form, setForm] = useState({
    saleId: '',
    cfdiType: 'INGRESO',
    paymentForm: '01',
    paymentMethod: 'PUE',
    useCFDI: 'G01',
  })

  const { data: cfdiData, isLoading } = useQuery({
    queryKey: ['cfdi', statusFilter, typeFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (typeFilter) params.set('cfdiType', typeFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      const res = await fetch(`/api/cfdi?${params}`)
      return res.json()
    },
  })

  const { data: salesData } = useQuery({
    queryKey: ['sales-for-cfdi'],
    queryFn: async () => {
      const res = await fetch('/api/sales?status=COMPLETED&limit=50')
      return res.json()
    },
  })

  const generateMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch('/api/cfdi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Error al generar CFDI')
      return result
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cfdi'] })
      queryClient.invalidateQueries({ queryKey: ['sales-for-cfdi'] })
      setGenerateOpen(false)
      setForm({ saleId: '', cfdiType: 'INGRESO', paymentForm: '01', paymentMethod: 'PUE', useCFDI: 'G01' })
      toast.success('CFDI generado exitosamente')
      // Show XML
      if (data.xmlContent) {
        setSelectedXml(data.xmlContent)
        setXmlViewOpen(true)
      }
    },
    onError: (error) => toast.error(error.message),
  })

  const cfdiList: CFDIRow[] = cfdiData?.cfdi || []

  // Available sales (completed, without CFDI)
  const completedSales = (salesData?.sales || []).filter(
    (s: { cfdi: null; id: string; folio: string; client: { name: string; rfc: string } | null; total: number }) => !s.cfdi
  )

  const selectedSale = completedSales.find(
    (s: { id: string }) => s.id === form.saleId
  )

  // Stats
  const generatedCount = cfdiList.filter(c => c.status === 'GENERATED').length
  const stampedCount = cfdiList.filter(c => c.status === 'STAMPED').length
  const cancelledCount = cfdiList.filter(c => c.status === 'CANCELLED').length

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 space-y-6"
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total CFDI</p>
                <p className="text-2xl font-bold">{cfdiList.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Generados</p>
                <p className="text-2xl font-bold text-amber-600">{generatedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Timbrados</p>
                <p className="text-2xl font-bold text-emerald-600">{stampedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cancelados</p>
                <p className="text-2xl font-bold text-red-600">{cancelledCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CFDI Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-base">Facturación CFDI 4.0</CardTitle>
            <Button onClick={() => setGenerateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Generar CFDI
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v === 'ALL' ? '' : v)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Tipo CFDI" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="INGRESO">Ingreso</SelectItem>
                <SelectItem value="EGRESO">Egreso</SelectItem>
                <SelectItem value="TRASLADO">Traslado</SelectItem>
                <SelectItem value="NOMINA">Nómina</SelectItem>
                <SelectItem value="PAGO">Pago</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === 'ALL' ? '' : v)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="GENERATED">Generado</SelectItem>
                <SelectItem value="STAMPED">Timbrado</SelectItem>
                <SelectItem value="CANCELLED">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full sm:w-40" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full sm:w-40" />
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>UUID</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="hidden md:table-cell">RFC Cliente</TableHead>
                  <TableHead className="hidden lg:table-cell">Nombre</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                  <TableHead className="hidden lg:table-cell">XML</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Cargando CFDI...
                    </TableCell>
                  </TableRow>
                ) : cfdiList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No se encontraron CFDI
                    </TableCell>
                  </TableRow>
                ) : (
                  cfdiList.map((cfdi) => {
                    const StatusIcon = statusIcons[cfdi.status] || Clock
                    return (
                      <TableRow key={cfdi.id}>
                        <TableCell className="font-mono text-xs max-w-[120px] truncate">{cfdi.uuid.slice(0, 8)}...</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {cfdiTypeLabels[cfdi.cfdiType] || cfdi.cfdiType}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-xs">{cfdi.clientRfc}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{cfdi.clientName}</TableCell>
                        <TableCell className="text-right font-medium">{MXN.format(cfdi.total)}</TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[cfdi.status]} text-[10px] gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusLabels[cfdi.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">
                          {new Date(cfdi.createdAt).toLocaleDateString('es-MX')}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {cfdi.xmlContent ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 gap-1 text-xs"
                              onClick={() => { setSelectedXml(cfdi.xmlContent || ''); setXmlViewOpen(true) }}
                            >
                              <Code className="w-3 h-3" /> Ver XML
                            </Button>
                          ) : '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Generate CFDI Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Generar CFDI</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Venta *</Label>
              <Select value={form.saleId} onValueChange={(v) => setForm(f => ({ ...f, saleId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar venta completada..." />
                </SelectTrigger>
                <SelectContent>
                  {completedSales.length === 0 ? (
                    <SelectItem value="none" disabled>No hay ventas disponibles</SelectItem>
                  ) : (
                    completedSales.map((sale: { id: string; folio: string; client: { name: string } | null; total: number }) => (
                      <SelectItem key={sale.id} value={sale.id}>
                        {sale.folio} - {sale.client?.name || 'Público General'} ({MXN.format(sale.total)})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedSale && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                <div><span className="text-muted-foreground">Cliente:</span> {selectedSale.client?.name || 'Público General'}</div>
                <div><span className="text-muted-foreground">RFC:</span> <span className="font-mono">{selectedSale.client?.rfc || 'XAXX010101000'}</span></div>
                <div><span className="text-muted-foreground">Total:</span> <span className="font-bold">{MXN.format(selectedSale.total)}</span></div>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo CFDI</Label>
                <Select value={form.cfdiType} onValueChange={(v) => setForm(f => ({ ...f, cfdiType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INGRESO">Ingreso</SelectItem>
                    <SelectItem value="EGRESO">Egreso</SelectItem>
                    <SelectItem value="TRASLADO">Traslado</SelectItem>
                    <SelectItem value="PAGO">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Uso CFDI</Label>
                <Select value={form.useCFDI} onValueChange={(v) => setForm(f => ({ ...f, useCFDI: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {usoCFDIOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Forma de Pago</Label>
                <Select value={form.paymentForm} onValueChange={(v) => setForm(f => ({ ...f, paymentForm: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {formaPagoOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Método de Pago</Label>
                <Select value={form.paymentMethod} onValueChange={(v) => setForm(f => ({ ...f, paymentMethod: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {metodoPagoOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => generateMutation.mutate(form)}
              disabled={!form.saleId || generateMutation.isPending}
            >
              {generateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <FileText className="w-4 h-4 mr-2" /> Generar CFDI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* XML Viewer Dialog */}
      <Dialog open={xmlViewOpen} onOpenChange={setXmlViewOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="w-4 h-4" /> Contenido XML
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <pre className="p-4 bg-muted rounded-lg text-xs font-mono whitespace-pre-wrap overflow-x-auto">
              {selectedXml}
            </pre>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setXmlViewOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
