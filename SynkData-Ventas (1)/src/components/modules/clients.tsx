'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Users, Search, Plus, Phone, Mail, MapPin, CreditCard, Star,
  Award, TrendingUp, UserCheck, UserX, ChevronDown, ChevronUp,
  X, Save, Loader2, Gift
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

type ClientType = 'GENERAL' | 'MAYORISTA' | 'VIP' | 'EMPRESARIAL'

const typeColors: Record<ClientType, string> = {
  GENERAL: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  MAYORISTA: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  VIP: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  EMPRESARIAL: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
}

const typeLabels: Record<ClientType, string> = {
  GENERAL: 'General',
  MAYORISTA: 'Mayorista',
  VIP: 'VIP',
  EMPRESARIAL: 'Empresarial',
}

interface ClientData {
  id: string
  name: string
  email: string | null
  phone: string | null
  rfc: string | null
  address: string | null
  type: ClientType
  creditLimit: number
  creditUsed: number
  points: number
  active: boolean
  createdAt: string
  _count: { sales: number }
  sales: { id: string; folio: string; total: number; createdAt: string; status: string }[]
  pointsHistory: { id: string; points: number; type: string; description: string | null; createdAt: string }[]
}

export default function Clients() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [segment, setSegment] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null)
  const [pointsDialogOpen, setPointsDialogOpen] = useState(false)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState({
    name: '', email: '', phone: '', rfc: '', address: '',
    type: 'GENERAL' as ClientType, creditLimit: 0, active: true,
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pointsForm, setPointsForm] = useState({ points: 0, type: 'EARNED', description: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search, typeFilter, segment],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (typeFilter) params.set('type', typeFilter)
      if (segment !== 'all') params.set('segment', segment)
      const res = await fetch(`/api/clients?${params}`)
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Error al crear cliente')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setDialogOpen(false)
      resetForm()
      toast.success('Cliente creado exitosamente')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: typeof form & { id: string }) => {
      const res = await fetch(`/api/clients?id=${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Error al actualizar cliente')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setDialogOpen(false)
      resetForm()
      toast.success('Cliente actualizado exitosamente')
    },
  })

  const pointsMutation = useMutation({
    mutationFn: async (data: typeof pointsForm & { clientId: string }) => {
      const res = await fetch('/api/clients/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Error al ajustar puntos')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setPointsDialogOpen(false)
      setPointsForm({ points: 0, type: 'EARNED', description: '' })
      toast.success('Puntos ajustados exitosamente')
    },
  })

  const resetForm = () => {
    setForm({ name: '', email: '', phone: '', rfc: '', address: '', type: 'GENERAL', creditLimit: 0, active: true })
    setEditingId(null)
  }

  const openEdit = (client: ClientData) => {
    setForm({
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      rfc: client.rfc || '',
      address: client.address || '',
      type: client.type,
      creditLimit: client.creditLimit,
      active: client.active,
    })
    setEditingId(client.id)
    setDialogOpen(true)
  }

  const openDetail = (client: ClientData) => {
    setSelectedClient(client)
    setDetailOpen(true)
  }

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error('El nombre es requerido')
      return
    }
    if (editingId) {
      updateMutation.mutate({ ...form, id: editingId })
    } else {
      createMutation.mutate(form)
    }
  }

  const clients: ClientData[] = data?.clients || []
  const total = data?.total || 0

  // Stats
  const totalClients = total
  const vipCount = clients.filter(c => c.type === 'VIP').length
  const creditCount = clients.filter(c => c.creditUsed > 0).length
  const totalPoints = clients.reduce((s, c) => s + c.points, 0)

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
                <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Clientes</p>
                <p className="text-2xl font-bold">{totalClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Star className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Clientes VIP</p>
                <p className="text-2xl font-bold">{vipCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <CreditCard className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Con Crédito</p>
                <p className="text-2xl font-bold">{creditCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Puntos</p>
                <p className="text-2xl font-bold">{totalPoints.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs + Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Tabs value={segment} onValueChange={setSegment}>
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="vip">VIP</TabsTrigger>
                <TabsTrigger value="credit">Con Crédito</TabsTrigger>
                <TabsTrigger value="inactive30">Inactivos 30d</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={() => { resetForm(); setDialogOpen(true) }} className="gap-2">
              <Plus className="w-4 h-4" /> Nuevo Cliente
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, RFC, teléfono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v === 'ALL' ? '' : v)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Tipo de cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los tipos</SelectItem>
                <SelectItem value="GENERAL">General</SelectItem>
                <SelectItem value="MAYORISTA">Mayorista</SelectItem>
                <SelectItem value="VIP">VIP</SelectItem>
                <SelectItem value="EMPRESARIAL">Empresarial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">RFC</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
                  <TableHead className="text-right">Crédito</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Puntos</TableHead>
                  <TableHead className="hidden lg:table-cell">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Cargando clientes...
                    </TableCell>
                  </TableRow>
                ) : clients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No se encontraron clientes
                    </TableCell>
                  </TableRow>
                ) : (
                  clients.map((client) => (
                    <>
                      <TableRow
                        key={client.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedRow(expandedRow === client.id ? null : client.id)}
                      >
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-xs">{client.rfc || '—'}</TableCell>
                        <TableCell>
                          <Badge className={`${typeColors[client.type]} text-[10px] font-medium`}>
                            {typeLabels[client.type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{client.phone || '—'}</TableCell>
                        <TableCell className="text-right text-sm">
                          {client.creditUsed > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400">
                              {MXN.format(client.creditUsed)} / {MXN.format(client.creditLimit)}
                            </span>
                          ) : client.creditLimit > 0 ? (
                            <span className="text-muted-foreground">{MXN.format(client.creditLimit)}</span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell text-sm">
                          {client.points > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              {client.points.toLocaleString()} pts
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant={client.active ? 'default' : 'secondary'} className="text-[10px]">
                            {client.active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      {expandedRow === client.id && (
                        <TableRow key={`${client.id}-expanded`}>
                          <TableCell colSpan={7} className="bg-muted/30 p-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Contact Info */}
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Contacto</h4>
                                {client.email && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                    {client.email}
                                  </div>
                                )}
                                {client.phone && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                                    {client.phone}
                                  </div>
                                )}
                                {client.address && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                                    {client.address}
                                  </div>
                                )}
                                <div className="flex gap-2 pt-2">
                                  <Button size="sm" variant="outline" onClick={() => openDetail(client)}>
                                    Ver Detalle
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => openEdit(client)}>
                                    Editar
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => { setSelectedClient(client); setPointsDialogOpen(true) }}>
                                    <Gift className="w-3.5 h-3.5 mr-1" /> Puntos
                                  </Button>
                                </div>
                              </div>
                              {/* Credit */}
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Crédito</h4>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span>Usado</span>
                                    <span className="font-medium">{MXN.format(client.creditUsed)}</span>
                                  </div>
                                  <Progress
                                    value={client.creditLimit > 0 ? (client.creditUsed / client.creditLimit) * 100 : 0}
                                    className="h-2"
                                  />
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Límite: {MXN.format(client.creditLimit)}</span>
                                    <span>Disponible: {MXN.format(client.creditLimit - client.creditUsed)}</span>
                                  </div>
                                </div>
                              </div>
                              {/* Recent Sales */}
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Ventas Recientes ({client._count.sales})</h4>
                                <ScrollArea className="max-h-28">
                                  {client.sales.length > 0 ? client.sales.map(sale => (
                                    <div key={sale.id} className="flex justify-between text-sm py-0.5">
                                      <span className="font-mono text-xs">{sale.folio}</span>
                                      <span>{MXN.format(sale.total)}</span>
                                    </div>
                                  )) : (
                                    <p className="text-xs text-muted-foreground">Sin ventas</p>
                                  )}
                                </ScrollArea>
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nombre *</Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre completo o razón social" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="correo@ejemplo.com" type="email" />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+52 55 1234 5678" />
              </div>
              <div>
                <Label>RFC</Label>
                <Input value={form.rfc} onChange={(e) => setForm(f => ({ ...f, rfc: e.target.value }))} placeholder="XAXX010101000" className="uppercase" />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v as ClientType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">General</SelectItem>
                    <SelectItem value="MAYORISTA">Mayorista</SelectItem>
                    <SelectItem value="VIP">VIP</SelectItem>
                    <SelectItem value="EMPRESARIAL">Empresarial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Dirección</Label>
                <Input value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Calle, número, colonia, ciudad" />
              </div>
              <div>
                <Label>Límite de Crédito</Label>
                <Input type="number" value={form.creditLimit} onChange={(e) => setForm(f => ({ ...f, creditLimit: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={form.active} onCheckedChange={(v) => setForm(f => ({ ...f, active: v }))} />
                <Label>Activo</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" /> {editingId ? 'Actualizar' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedClient?.name}</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-6">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Tipo:</span> <Badge className={typeColors[selectedClient.type]}>{typeLabels[selectedClient.type]}</Badge></div>
                <div><span className="text-muted-foreground">RFC:</span> <span className="font-mono">{selectedClient.rfc || '—'}</span></div>
                <div><span className="text-muted-foreground">Email:</span> {selectedClient.email || '—'}</div>
                <div><span className="text-muted-foreground">Teléfono:</span> {selectedClient.phone || '—'}</div>
                {selectedClient.address && <div className="col-span-2"><span className="text-muted-foreground">Dirección:</span> {selectedClient.address}</div>}
              </div>

              <Separator />

              {/* Credit */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Crédito</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Utilizado</span>
                    <span className="font-medium">{MXN.format(selectedClient.creditUsed)}</span>
                  </div>
                  <Progress value={selectedClient.creditLimit > 0 ? (selectedClient.creditUsed / selectedClient.creditLimit) * 100 : 0} className="h-3" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Límite: {MXN.format(selectedClient.creditLimit)}</span>
                    <span>Disponible: {MXN.format(selectedClient.creditLimit - selectedClient.creditUsed)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Points */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2"><Award className="w-4 h-4" /> Puntos: {selectedClient.points.toLocaleString()}</h4>
                {selectedClient.pointsHistory.length > 0 ? (
                  <ScrollArea className="max-h-36">
                    <div className="space-y-1">
                      {selectedClient.pointsHistory.map(pt => (
                        <div key={pt.id} className="flex justify-between text-sm">
                          <span className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {pt.type === 'EARNED' ? '+' : pt.type === 'REDEEMED' ? '-' : '~'}
                              {pt.type}
                            </Badge>
                            {pt.description}
                          </span>
                          <span className={pt.type === 'EARNED' ? 'text-emerald-600' : 'text-red-500'}>
                            {pt.type === 'EARNED' ? '+' : '-'}{pt.points}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin historial de puntos</p>
                )}
              </div>

              <Separator />

              {/* Sales */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Ventas ({selectedClient._count.sales})</h4>
                {selectedClient.sales.length > 0 ? (
                  <div className="space-y-1">
                    {selectedClient.sales.map(s => (
                      <div key={s.id} className="flex justify-between text-sm py-0.5">
                        <span className="font-mono text-xs">{s.folio}</span>
                        <span>{MXN.format(s.total)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin ventas registradas</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Points Adjustment Dialog */}
      <Dialog open={pointsDialogOpen} onOpenChange={setPointsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar Puntos - {selectedClient?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Puntos</Label>
              <Input type="number" value={pointsForm.points} onChange={(e) => setPointsForm(f => ({ ...f, points: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={pointsForm.type} onValueChange={(v) => setPointsForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EARNED">Ganados</SelectItem>
                  <SelectItem value="REDEEMED">Canjeados</SelectItem>
                  <SelectItem value="ADJUSTED">Ajuste Manual</SelectItem>
                  <SelectItem value="EXPIRED">Expirados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descripción</Label>
              <Input value={pointsForm.description} onChange={(e) => setPointsForm(f => ({ ...f, description: e.target.value }))} placeholder="Motivo del ajuste" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPointsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => selectedClient && pointsMutation.mutate({ ...pointsForm, clientId: selectedClient.id })} disabled={pointsMutation.isPending}>
              {pointsMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Gift className="w-4 h-4 mr-2" /> Ajustar Puntos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
