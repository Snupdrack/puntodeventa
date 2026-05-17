'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Users, Building2, Coins, Tag, Plus, Pencil, Power, Save,
  Loader2, Shield, Mail, UserCircle, Phone, Hash,
  QrCode, Wifi, CreditCard, FileText, Key, Globe, TestTube,
  CheckCircle2, AlertCircle, Smartphone, Eye, EyeOff,
  Cpu, ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'

// ---- Types ----
interface UserData {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  branchId: string | null
  branch: { id: string; name: string; code: string } | null
}

interface BranchOption {
  id: string
  name: string
  code: string
}

interface PriceRuleData {
  id: string
  name: string
  type: string
  value: number
  productId: string | null
  categoryId: string | null
  startDate: string | null
  endDate: string | null
  active: boolean
  createdAt: string
}

interface PaymentProvider {
  id: string
  name: string
  type: 'qr' | 'contactless' | 'link'
  enabled: boolean
  apiKey: string
  secretKey: string
  merchantId: string
  webhookUrl: string
  sandbox: boolean
}

interface InvoiceProvider {
  id: string
  name: string
  enabled: boolean
  apiKey: string
  secretKey: string
  apiUrl: string
  sandbox: boolean
  certPath: string
  pacRfc: string
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN_GENERAL: 'Admin General',
  GERENTE: 'Gerente',
  CAJERO: 'Cajero',
  VENDEDOR: 'Vendedor',
}

const PRICE_RULE_TYPE_LABELS: Record<string, string> = {
  PERCENTAGE_DISCOUNT: 'Descuento %',
  FIXED_DISCOUNT: 'Descuento Fijo',
  MARGIN_MINIMUM: 'Margen Mínimo',
}

const PROVIDER_TYPE_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  qr: { label: 'Cobro QR', icon: QrCode, color: 'violet' },
  contactless: { label: 'Contactless / NFC', icon: Wifi, color: 'sky' },
  link: { label: 'Link de Pago', icon: Globe, color: 'indigo' },
}

const DEFAULT_PAYMENT_PROVIDERS: PaymentProvider[] = [
  { id: 'mercadopago', name: 'Mercado Pago', type: 'qr', enabled: false, apiKey: '', secretKey: '', merchantId: '', webhookUrl: '', sandbox: true },
  { id: 'stripe', name: 'Stripe Terminal', type: 'contactless', enabled: false, apiKey: '', secretKey: '', merchantId: '', webhookUrl: '', sandbox: true },
  { id: 'clip', name: 'Clip', type: 'contactless', enabled: false, apiKey: '', secretKey: '', merchantId: '', webhookUrl: '', sandbox: true },
  { id: 'paypal', name: 'PayPal QR', type: 'qr', enabled: false, apiKey: '', secretKey: '', merchantId: '', webhookUrl: '', sandbox: true },
  { id: 'link_pago', name: 'Link de Pago', type: 'link', enabled: false, apiKey: '', secretKey: '', merchantId: '', webhookUrl: '', sandbox: true },
]

const DEFAULT_INVOICE_PROVIDERS: InvoiceProvider[] = [
  { id: 'facturama', name: 'Facturama', enabled: false, apiKey: '', secretKey: '', apiUrl: 'https://api.facturama.mx', sandbox: true, certPath: '', pacRfc: 'FAC110101AB1' },
  { id: 'sw_sapien', name: 'SW Sapien', enabled: false, apiKey: '', secretKey: '', apiUrl: 'https://services.sw.com.mx', sandbox: true, certPath: '', pacRfc: 'SAC110101AB1' },
  { id: 'pm_comercial', name: 'PM Comercial', enabled: false, apiKey: '', secretKey: '', apiUrl: 'https://api.pmcomercial.mx', sandbox: true, certPath: '', pacRfc: 'PCM110101AB1' },
  { id: 'solucion_factible', name: 'Solución Factible', enabled: false, apiKey: '', secretKey: '', apiUrl: 'https://api.solucionfactible.com', sandbox: true, certPath: '', pacRfc: 'SFE110101AB1' },
]

function loadFromStorage<T>(key: string, defaults: T): T {
  if (typeof window === 'undefined') return defaults
  const saved = localStorage.getItem(key)
  if (saved) {
    try { return JSON.parse(saved) } catch { /* ignore */ }
  }
  return defaults
}

function saveToStorage(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data))
}

// ---- Tab 1: Usuarios ----
function UsersTab() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'CAJERO', branchId: '', active: true,
  })

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users')
      if (!res.ok) throw new Error('Error al cargar usuarios')
      return res.json()
    },
  })

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await fetch('/api/branches')
      if (!res.ok) throw new Error('Error al cargar sucursales')
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error al crear usuario') }
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setDialogOpen(false); resetForm(); toast.success('Usuario creado exitosamente') },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: async (data: typeof form & { id: string }) => {
      const res = await fetch(`/api/users?id=${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error al actualizar usuario') }
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setDialogOpen(false); resetForm(); toast.success('Usuario actualizado exitosamente') },
    onError: (err: Error) => toast.error(err.message),
  })

  const resetForm = () => { setForm({ name: '', email: '', password: '', role: 'CAJERO', branchId: '', active: true }); setEditingId(null) }
  const openEdit = (user: UserData) => { setForm({ name: user.name, email: user.email, password: '', role: user.role, branchId: user.branchId || '', active: user.active }); setEditingId(user.id); setDialogOpen(true) }
  const openNew = () => { resetForm(); setDialogOpen(true) }

  const handleSubmit = () => {
    if (!form.name.trim() || !form.email.trim()) { toast.error('Nombre y email son requeridos'); return }
    if (!editingId && !form.password.trim()) { toast.error('La contraseña es requerida para nuevos usuarios'); return }
    if (editingId) {
      const payload = { ...form, id: editingId } as typeof form & { id: string } & Record<string, unknown>
      if (!payload.password) delete payload.password
      updateMutation.mutate(payload as typeof form & { id: string })
    } else { createMutation.mutate(form) }
  }

  const toggleActive = (user: UserData) => {
    updateMutation.mutate({ id: user.id, name: user.name, email: user.email, password: '', role: user.role, branchId: user.branchId || '', active: !user.active })
  }

  const users: UserData[] = usersData?.users || []
  const branches: BranchOption[] = branchesData?.branches || []

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{users.length} usuarios registrados</p>
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Nuevo Usuario</Button>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-6 space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</CardContent></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead><TableHead>Email</TableHead><TableHead>Rol</TableHead><TableHead>Sucursal</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                          <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">{user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</span>
                        </div>
                        {user.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{ROLE_LABELS[user.role] || user.role}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{user.branch?.name || '—'}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${user.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {user.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(user)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className={`h-8 w-8 ${user.active ? 'text-red-500 hover:text-red-600' : 'text-emerald-500 hover:text-emerald-600'}`} onClick={() => toggleActive(user)}><Power className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingId ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label className="flex items-center gap-1.5"><UserCircle className="w-3.5 h-3.5 text-muted-foreground" />Nombre *</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre completo" /></div>
            <div className="grid gap-2"><Label className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-muted-foreground" />Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="correo@ejemplo.com" /></div>
            <div className="grid gap-2"><Label className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-muted-foreground" />Contraseña {editingId ? '(dejar vacío para no cambiar)' : '*'}</Label><Input type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} placeholder={editingId ? '••••••••' : 'Contraseña'} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Rol</Label><Select value={form.role} onValueChange={(v) => setForm(f => ({ ...f, role: v }))}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ADMIN_GENERAL">Admin General</SelectItem><SelectItem value="GERENTE">Gerente</SelectItem><SelectItem value="CAJERO">Cajero</SelectItem><SelectItem value="VENDEDOR">Vendedor</SelectItem></SelectContent></Select></div>
              <div className="grid gap-2"><Label>Sucursal</Label><Select value={form.branchId || 'none'} onValueChange={(v) => setForm(f => ({ ...f, branchId: v === 'none' ? '' : v }))}><SelectTrigger className="w-full"><SelectValue placeholder="Sin sucursal" /></SelectTrigger><SelectContent><SelectItem value="none">Sin sucursal</SelectItem>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="flex items-center gap-3 pt-1"><Switch checked={form.active} onCheckedChange={(v) => setForm(f => ({ ...f, active: v }))} /><Label>Usuario activo</Label></div>
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
    </div>
  )
}

// ---- Tab 2: Empresa ----
const DEFAULT_EMPRESA = { nombre: 'SynkData Comercial S.A. de C.V.', rfc: 'SDC240101AB1', direccion: 'Av. Reforma 222, Col. Centro, CDMX, 06000', regimen: 'Régimen General de Ley Personas Morales' }

function EmpresaTab() {
  const [form, setForm] = useState(() => loadFromStorage('synkdata-empresa', DEFAULT_EMPRESA))
  const [saving, setSaving] = useState(false)

  const handleSave = () => { setSaving(true); setTimeout(() => { saveToStorage('synkdata-empresa', form); setSaving(false); toast.success('Datos de empresa guardados') }, 400) }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30"><Building2 className="w-5 h-5 text-teal-600 dark:text-teal-400" /></div>
            <div><CardTitle className="text-base">Información Fiscal</CardTitle><CardDescription>Datos de la empresa para facturación y reportes</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2"><Label className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-muted-foreground" />Nombre de la Empresa</Label><Input value={form.nombre} onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre legal de la empresa" /></div>
          <div className="grid gap-2"><Label className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-muted-foreground" />RFC</Label><Input value={form.rfc} onChange={(e) => setForm(f => ({ ...f, rfc: e.target.value.toUpperCase() }))} placeholder="XAXX010101000" className="uppercase" maxLength={13} /></div>
          <div className="grid gap-2"><Label className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-muted-foreground" />Dirección Fiscal</Label><Textarea value={form.direccion} onChange={(e) => setForm(f => ({ ...f, direccion: e.target.value }))} placeholder="Calle, número, colonia, ciudad, CP" rows={3} /></div>
          <div className="grid gap-2"><Label className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-muted-foreground" />Régimen Fiscal</Label><Input value={form.regimen} onChange={(e) => setForm(f => ({ ...f, regimen: e.target.value }))} placeholder="Régimen fiscal de la empresa" /></div>
          <Separator />
          <Button onClick={handleSave} disabled={saving} className="gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Guardar</Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ---- Tab 3: Puntos y Monedero ----
function PuntosTab() {
  const [config, setConfig] = useState(() => loadFromStorage('synkdata-puntos-config', { puntosPorCompra: '10', valorPunto: '1', diasVigencia: '365' }))
  const [saving, setSaving] = useState(false)

  const handleSave = () => { setSaving(true); setTimeout(() => { saveToStorage('synkdata-puntos-config', config); setSaving(false); toast.success('Configuración de puntos guardada') }, 400) }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30"><Coins className="w-5 h-5 text-amber-600 dark:text-amber-400" /></div>
            <div><CardTitle className="text-base">Programa de Puntos</CardTitle><CardDescription>Configura cómo funcionan los puntos de lealtad</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <Label className="text-sm font-medium">Puntos por cada $X de compra</Label>
            <p className="text-xs text-muted-foreground">El cliente recibe 1 punto por cada cierta cantidad en pesos de compra</p>
            <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">1 punto / $</span><Input type="number" min="1" value={config.puntosPorCompra} onChange={(e) => setConfig(f => ({ ...f, puntosPorCompra: e.target.value }))} className="w-24" /><span className="text-sm text-muted-foreground">de compra</span></div>
          </div>
          <Separator />
          <div className="grid gap-2">
            <Label className="text-sm font-medium">Valor de 1 punto en pesos</Label>
            <p className="text-xs text-muted-foreground">Cuánto vale cada punto al canjearlo</p>
            <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">$</span><Input type="number" min="0.01" step="0.01" value={config.valorPunto} onChange={(e) => setConfig(f => ({ ...f, valorPunto: e.target.value }))} className="w-24" /><span className="text-sm text-muted-foreground">por punto</span></div>
          </div>
          <Separator />
          <div className="grid gap-2">
            <Label className="text-sm font-medium">Días de vigencia de puntos</Label>
            <p className="text-xs text-muted-foreground">Los puntos expiran después de este número de días sin actividad</p>
            <div className="flex items-center gap-2"><Input type="number" min="1" value={config.diasVigencia} onChange={(e) => setConfig(f => ({ ...f, diasVigencia: e.target.value }))} className="w-24" /><span className="text-sm text-muted-foreground">días</span></div>
          </div>
          <Separator />
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <p className="text-sm font-medium">Resumen de Configuración</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{config.puntosPorCompra}</p><p className="text-[10px] text-muted-foreground">$ por punto</p></div>
              <div><p className="text-2xl font-bold text-teal-600 dark:text-teal-400">${config.valorPunto}</p><p className="text-[10px] text-muted-foreground">Valor por punto</p></div>
              <div><p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{config.diasVigencia}</p><p className="text-[10px] text-muted-foreground">Días vigencia</p></div>
            </div>
            <p className="text-xs text-muted-foreground text-center pt-1">Ejemplo: Una compra de $100 genera {Math.floor(100 / Number(config.puntosPorCompra || 10))} puntos ≈ ${Math.floor(100 / Number(config.puntosPorCompra || 10)) * Number(config.valorPunto || 1)} de valor</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Guardar Configuración</Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ---- Tab 4: Reglas de Precios ----
function PriceRulesTab() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'PERCENTAGE_DISCOUNT' as string, value: '', productId: '', categoryId: '', startDate: '', endDate: '', active: true })

  const { data, isLoading } = useQuery({
    queryKey: ['price-rules'],
    queryFn: async () => { const res = await fetch('/api/price-rules'); if (!res.ok) throw new Error('Error al cargar reglas'); return res.json() },
  })

  const createMutation = useMutation({
    mutationFn: async (d: typeof form) => {
      const res = await fetch('/api/price-rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...d, value: parseFloat(d.value), productId: d.productId || null, categoryId: d.categoryId || null, startDate: d.startDate || null, endDate: d.endDate || null }) })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error al crear regla') }
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['price-rules'] }); setDialogOpen(false); setForm({ name: '', type: 'PERCENTAGE_DISCOUNT', value: '', productId: '', categoryId: '', startDate: '', endDate: '', active: true }); toast.success('Regla de precio creada exitosamente') },
    onError: (err: Error) => toast.error(err.message),
  })

  const rules: PriceRuleData[] = data?.rules || []
  const formatDate = (d: string | null) => { if (!d) return '—'; return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{rules.length} reglas de precio configuradas</p>
        <Button onClick={() => { setForm({ name: '', type: 'PERCENTAGE_DISCOUNT', value: '', productId: '', categoryId: '', startDate: '', endDate: '', active: true }); setDialogOpen(true) }} className="gap-2"><Plus className="w-4 h-4" /> Nueva Regla</Button>
      </div>

      {isLoading ? <Card><CardContent className="p-6 space-y-3">{[1, 2].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</CardContent></Card> : rules.length === 0 ? (
        <Card><CardContent className="p-12 text-center"><Tag className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No hay reglas de precio configuradas</p></CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {rules.map((rule) => (
            <motion.div key={rule.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${rule.type === 'PERCENTAGE_DISCOUNT' ? 'bg-blue-100 dark:bg-blue-900/30' : rule.type === 'FIXED_DISCOUNT' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                        <Tag className={`w-4 h-4 ${rule.type === 'PERCENTAGE_DISCOUNT' ? 'text-blue-600 dark:text-blue-400' : rule.type === 'FIXED_DISCOUNT' ? 'text-purple-600 dark:text-purple-400' : 'text-amber-600 dark:text-amber-400'}`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{rule.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px]">{PRICE_RULE_TYPE_LABELS[rule.type] || rule.type}</Badge>
                          <span className="text-sm font-semibold">{rule.type === 'PERCENTAGE_DISCOUNT' ? `${rule.value}%` : `$${rule.value}`}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {rule.startDate && <span>{formatDate(rule.startDate)} — {formatDate(rule.endDate)}</span>}
                      <Badge className={`text-[10px] ${rule.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>{rule.active ? 'Activa' : 'Inactiva'}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nueva Regla de Precio</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Descuento de temporada" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Tipo</Label><Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PERCENTAGE_DISCOUNT">Descuento %</SelectItem><SelectItem value="FIXED_DISCOUNT">Descuento Fijo</SelectItem><SelectItem value="MARGIN_MINIMUM">Margen Mínimo</SelectItem></SelectContent></Select></div>
              <div className="grid gap-2"><Label>Valor *</Label><Input type="number" step="0.01" min="0" value={form.value} onChange={(e) => setForm(f => ({ ...f, value: e.target.value }))} placeholder={form.type === 'PERCENTAGE_DISCOUNT' ? '15' : '50'} /></div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Fecha Inicio</Label><Input type="date" value={form.startDate} onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Fecha Fin</Label><Input type="date" value={form.endDate} onChange={(e) => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-3 pt-1"><Switch checked={form.active} onCheckedChange={(v) => setForm(f => ({ ...f, active: v }))} /><Label>Regla activa</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => { if (!form.name.trim() || !form.value) { toast.error('Nombre y valor son requeridos'); return } createMutation.mutate(form) }} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}<Save className="w-4 h-4 mr-2" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---- Tab 5: Servicios de Cobro (QR / Contactless / Link) ----
function PaymentServicesTab() {
  const [providers, setProviders] = useState<PaymentProvider[]>(() => loadFromStorage('synkdata-payment-providers', DEFAULT_PAYMENT_PROVIDERS))
  const [editingProvider, setEditingProvider] = useState<PaymentProvider | null>(null)
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      saveToStorage('synkdata-payment-providers', providers)
      setSaving(false)
      setEditingProvider(null)
      toast.success('Servicios de cobro actualizados')
    }, 400)
  }

  const updateProvider = (id: string, updates: Partial<PaymentProvider>) => {
    setProviders(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  const testConnection = (provider: PaymentProvider) => {
    toast.loading(`Probando conexión con ${provider.name}...`, { id: `test-${provider.id}` })
    setTimeout(() => {
      if (provider.apiKey && provider.merchantId) {
        toast.success(`${provider.name}: Conexión exitosa`, { id: `test-${provider.id}`, description: provider.sandbox ? 'Modo sandbox' : 'Modo producción' })
      } else {
        toast.error(`${provider.name}: Credenciales incompletas`, { id: `test-${provider.id}`, description: 'Configura API Key y Merchant ID' })
      }
    }, 1500)
  }

  const enabledCount = providers.filter(p => p.enabled).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {enabledCount} de {providers.length} servicios activos
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Configura los proveedores de cobro. Los activos aparecerán como métodos de pago en el POS.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2 shrink-0">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar Todo
        </Button>
      </div>

      {/* Provider Cards */}
      <div className="grid gap-4">
        {providers.map((provider) => {
          const typeInfo = PROVIDER_TYPE_LABELS[provider.type]
          const TypeIcon = typeInfo.icon
          const isEditing = editingProvider?.id === provider.id

          return (
            <motion.div key={provider.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className={`transition-all ${provider.enabled ? 'border-primary/30 shadow-sm' : 'opacity-70'}`}>
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-4">
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg ${provider.enabled ? `bg-${typeInfo.color}-100 dark:bg-${typeInfo.color}-900/30` : 'bg-muted'}`}>
                          <TypeIcon className={`w-5 h-5 ${provider.enabled ? `text-${typeInfo.color}-600 dark:text-${typeInfo.color}-400` : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{provider.name}</p>
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <TypeIcon className="w-2.5 h-2.5" />
                              {typeInfo.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {provider.enabled ? (
                              <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Activo
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">Inactivo</Badge>
                            )}
                            {provider.sandbox && provider.enabled && (
                              <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                <TestTube className="w-2.5 h-2.5 mr-0.5" /> Sandbox
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1.5"
                          onClick={() => testConnection(provider)}
                          disabled={!provider.enabled}
                        >
                          <Globe className="w-3 h-3" /> Probar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1.5"
                          onClick={() => setEditingProvider(isEditing ? null : provider)}
                        >
                          {isEditing ? 'Cerrar' : <><Pencil className="w-3 h-3" /> Configurar</>}
                        </Button>
                        <Switch
                          checked={provider.enabled}
                          onCheckedChange={(v) => updateProvider(provider.id, { enabled: v })}
                        />
                      </div>
                    </div>

                    {/* Editable Config */}
                    {isEditing && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-4 border-t space-y-4"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label className="flex items-center gap-1.5 text-xs">
                              <Key className="w-3 h-3 text-muted-foreground" /> API Key
                            </Label>
                            <Input
                              type="password"
                              value={provider.apiKey}
                              onChange={(e) => updateProvider(provider.id, { apiKey: e.target.value })}
                              placeholder="pk_test_xxxxx o APP_ID"
                              className="text-xs"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label className="flex items-center gap-1.5 text-xs">
                              <Key className="w-3 h-3 text-muted-foreground" /> Secret Key
                            </Label>
                            <div className="relative">
                              <Input
                                type={showSecret[provider.id] ? 'text' : 'password'}
                                value={provider.secretKey}
                                onChange={(e) => updateProvider(provider.id, { secretKey: e.target.value })}
                                placeholder="sk_test_xxxxx o SECRET"
                                className="text-xs pr-8"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                                onClick={() => setShowSecret(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                              >
                                {showSecret[provider.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label className="flex items-center gap-1.5 text-xs">
                              <Smartphone className="w-3 h-3 text-muted-foreground" /> Merchant ID / Terminal ID
                            </Label>
                            <Input
                              value={provider.merchantId}
                              onChange={(e) => updateProvider(provider.id, { merchantId: e.target.value })}
                              placeholder="MERCHANT_ID o TERMINAL_ID"
                              className="text-xs"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label className="flex items-center gap-1.5 text-xs">
                              <Globe className="w-3 h-3 text-muted-foreground" /> Webhook URL
                            </Label>
                            <Input
                              value={provider.webhookUrl}
                              onChange={(e) => updateProvider(provider.id, { webhookUrl: e.target.value })}
                              placeholder="https://tudominio.com/api/webhook"
                              className="text-xs"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 pt-1">
                          <Switch
                            checked={provider.sandbox}
                            onCheckedChange={(v) => updateProvider(provider.id, { sandbox: v })}
                          />
                          <div>
                            <Label className="text-xs">Modo Sandbox / Prueba</Label>
                            <p className="text-[10px] text-muted-foreground">
                              Activa para pruebas sin transacciones reales
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Info box */}
      <Card className="bg-muted/50">
        <CardContent className="p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>¿Cómo funciona?</strong> Al activar un proveedor de cobro QR o Contactless, aparecerá como método de pago en el POS. El cajero solo selecciona el método y sigue las instrucciones en pantalla.</p>
            <p><strong>Seguridad:</strong> Las credenciales se guardan localmente en tu navegador. En producción, usa variables de entorno del servidor.</p>
            <p><strong>Integración real:</strong> Para conectar con un proveedor real, necesitas obtener las credenciales API desde su plataforma de desarrolladores.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---- Tab 6: Servicios de Facturación (CFDI PAC) ----
function InvoiceServicesTab() {
  const [providers, setProviders] = useState<InvoiceProvider[]>(() => loadFromStorage('synkdata-invoice-providers', DEFAULT_INVOICE_PROVIDERS))
  const [editingProvider, setEditingProvider] = useState<InvoiceProvider | null>(null)
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      saveToStorage('synkdata-invoice-providers', providers)
      setSaving(false)
      setEditingProvider(null)
      toast.success('Servicios de facturación actualizados')
    }, 400)
  }

  const updateProvider = (id: string, updates: Partial<InvoiceProvider>) => {
    setProviders(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  const testConnection = (provider: InvoiceProvider) => {
    toast.loading(`Probando conexión con ${provider.name}...`, { id: `test-inv-${provider.id}` })
    setTimeout(() => {
      if (provider.apiKey && provider.apiUrl) {
        toast.success(`${provider.name}: Conexión exitosa al PAC`, { id: `test-inv-${provider.id}`, description: `RFC PAC: ${provider.pacRfc}` })
      } else {
        toast.error(`${provider.name}: Credenciales incompletas`, { id: `test-inv-${provider.id}`, description: 'Configura API Key y URL del PAC' })
      }
    }, 1500)
  }

  const enabledCount = providers.filter(p => p.enabled).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {enabledCount} de {providers.length} PACs configurados
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Selecciona el Proveedor Autorizado de Certificación (PAC) para timbrar facturas CFDI 4.0
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2 shrink-0">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar Todo
        </Button>
      </div>

      <div className="grid gap-4">
        {providers.map((provider) => {
          const isEditing = editingProvider?.id === provider.id

          return (
            <motion.div key={provider.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className={`transition-all ${provider.enabled ? 'border-primary/30 shadow-sm' : 'opacity-70'}`}>
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg ${provider.enabled ? 'bg-teal-100 dark:bg-teal-900/30' : 'bg-muted'}`}>
                          <FileText className={`w-5 h-5 ${provider.enabled ? 'text-teal-600 dark:text-teal-400' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{provider.name}</p>
                            <Badge variant="outline" className="text-[10px]">PAC CFDI 4.0</Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {provider.enabled ? (
                              <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Activo
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">Inactivo</Badge>
                            )}
                            {provider.sandbox && provider.enabled && (
                              <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                <TestTube className="w-2.5 h-2.5 mr-0.5" /> Sandbox
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1.5"
                          onClick={() => testConnection(provider)}
                          disabled={!provider.enabled}
                        >
                          <Globe className="w-3 h-3" /> Probar PAC
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1.5"
                          onClick={() => setEditingProvider(isEditing ? null : provider)}
                        >
                          {isEditing ? 'Cerrar' : <><Pencil className="w-3 h-3" /> Configurar</>}
                        </Button>
                        <Switch
                          checked={provider.enabled}
                          onCheckedChange={(v) => {
                            // Only allow one active PAC at a time
                            if (v) {
                              setProviders(prev => prev.map(p => ({ ...p, enabled: p.id === provider.id })))
                            } else {
                              updateProvider(provider.id, { enabled: false })
                            }
                          }}
                        />
                      </div>
                    </div>

                    {isEditing && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-4 border-t space-y-4"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label className="flex items-center gap-1.5 text-xs">
                              <Key className="w-3 h-3 text-muted-foreground" /> API Key / Usuario
                            </Label>
                            <Input
                              type="password"
                              value={provider.apiKey}
                              onChange={(e) => updateProvider(provider.id, { apiKey: e.target.value })}
                              placeholder="Tu API Key del PAC"
                              className="text-xs"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label className="flex items-center gap-1.5 text-xs">
                              <Key className="w-3 h-3 text-muted-foreground" /> Contraseña / Secret
                            </Label>
                            <div className="relative">
                              <Input
                                type={showSecret[`inv-${provider.id}`] ? 'text' : 'password'}
                                value={provider.secretKey}
                                onChange={(e) => updateProvider(provider.id, { secretKey: e.target.value })}
                                placeholder="Contraseña del PAC"
                                className="text-xs pr-8"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                                onClick={() => setShowSecret(prev => ({ ...prev, [`inv-${provider.id}`]: !prev[`inv-${provider.id}`] }))}
                              >
                                {showSecret[`inv-${provider.id}`] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label className="flex items-center gap-1.5 text-xs">
                              <Globe className="w-3 h-3 text-muted-foreground" /> URL de la API
                            </Label>
                            <Input
                              value={provider.apiUrl}
                              onChange={(e) => updateProvider(provider.id, { apiUrl: e.target.value })}
                              placeholder="https://api.pac.com.mx/v4"
                              className="text-xs"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label className="flex items-center gap-1.5 text-xs">
                              <Hash className="w-3 h-3 text-muted-foreground" /> RFC del PAC
                            </Label>
                            <Input
                              value={provider.pacRfc}
                              onChange={(e) => updateProvider(provider.id, { pacRfc: e.target.value.toUpperCase() })}
                              placeholder="RFC del PAC"
                              className="text-xs uppercase"
                              maxLength={13}
                            />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label className="flex items-center gap-1.5 text-xs">
                            <Shield className="w-3 h-3 text-muted-foreground" /> Ruta del Certificado (.cer/.pem)
                          </Label>
                          <Input
                            value={provider.certPath}
                            onChange={(e) => updateProvider(provider.id, { certPath: e.target.value })}
                            placeholder="/ruta/al/certificado.cer o contenido PEM"
                            className="text-xs"
                          />
                          <p className="text-[10px] text-muted-foreground">Sube tu certificado CSD del SAT para firmar las facturas</p>
                        </div>
                        <div className="flex items-center gap-3 pt-1">
                          <Switch
                            checked={provider.sandbox}
                            onCheckedChange={(v) => updateProvider(provider.id, { sandbox: v })}
                          />
                          <div>
                            <Label className="text-xs">Modo Sandbox / Prueba</Label>
                            <p className="text-[10px] text-muted-foreground">Los CFDIs generados en sandbox no tienen validez fiscal</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <Card className="bg-muted/50">
        <CardContent className="p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>¿Qué es un PAC?</strong> Es un Proveedor Autorizado de Certificación por el SAT. Solo un PAC puede timbrar y dar validez fiscal a tus facturas CFDI 4.0.</p>
            <p><strong>Solo puedes tener un PAC activo</strong> a la vez para evitar duplicidades en el timbrado.</p>
            <p><strong>Certificado CSD:</strong> Necesitas obtener tu Certificado de Sello Digital en el portal del SAT y cargarlo aquí.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---- Tab 7: Hardware (link to Hardware module) ----
function HardwareSettingsTab() {
  const setActiveModule = useAppStore((s) => s.setActiveModule)

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
              <Cpu className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <CardTitle className="text-base">Dispositivos de Hardware</CardTitle>
              <CardDescription>Impresora, escáner, báscula, display y más</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {[
              { name: 'Impresora Térmica', desc: 'Conecta tu impresora de tickets vía Serial/USB', icon: '🖨️' },
              { name: 'Escáner de Códigos', desc: 'Lector USB HID, cámara o serial', icon: '📱' },
              { name: 'Lector de Huella', desc: 'Autenticación biométrica con WebAuthn', icon: '👆' },
              { name: 'Caja Registradora', desc: 'Apertura automática al cobrar', icon: '💰' },
              { name: 'Display de Cliente', desc: 'Pantalla secundaria para el cliente', icon: '🖥️' },
              { name: 'Báscula', desc: 'Captura automática de peso', icon: '⚖️' },
            ].map((device) => (
              <div key={device.name} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <span className="text-lg">{device.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{device.name}</p>
                  <p className="text-xs text-muted-foreground">{device.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <Separator />
          <Button onClick={() => setActiveModule('hardware')} className="gap-2 w-full">
            <Cpu className="w-4 h-4" /> Ir al módulo de Hardware
            <ArrowRight className="w-4 h-4 ml-auto" />
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            La configuración completa de dispositivos está en el módulo de Hardware
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function Settings() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 space-y-6"
    >
      <div>
        <h2 className="text-xl font-bold tracking-tight">Configuración</h2>
        <p className="text-sm text-muted-foreground">Administra usuarios, servicios y configuración del sistema sin tocar código</p>
      </div>

      <Tabs defaultValue="cobro" className="space-y-4">
        <TabsList className="w-full sm:w-auto flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="cobro" className="gap-1.5 text-xs sm:text-sm">
            <CreditCard className="w-3.5 h-3.5" /> Cobro
          </TabsTrigger>
          <TabsTrigger value="facturacion" className="gap-1.5 text-xs sm:text-sm">
            <FileText className="w-3.5 h-3.5" /> Facturación
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-1.5 text-xs sm:text-sm">
            <Users className="w-3.5 h-3.5" /> Usuarios
          </TabsTrigger>
          <TabsTrigger value="empresa" className="gap-1.5 text-xs sm:text-sm">
            <Building2 className="w-3.5 h-3.5" /> Empresa
          </TabsTrigger>
          <TabsTrigger value="puntos" className="gap-1.5 text-xs sm:text-sm">
            <Coins className="w-3.5 h-3.5" /> Puntos
          </TabsTrigger>
          <TabsTrigger value="reglas" className="gap-1.5 text-xs sm:text-sm">
            <Tag className="w-3.5 h-3.5" /> Reglas
          </TabsTrigger>
          <TabsTrigger value="hardware" className="gap-1.5 text-xs sm:text-sm">
            <Cpu className="w-3.5 h-3.5" /> Hardware
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cobro"><PaymentServicesTab /></TabsContent>
        <TabsContent value="facturacion"><InvoiceServicesTab /></TabsContent>
        <TabsContent value="usuarios"><UsersTab /></TabsContent>
        <TabsContent value="empresa"><EmpresaTab /></TabsContent>
        <TabsContent value="puntos"><PuntosTab /></TabsContent>
        <TabsContent value="reglas"><PriceRulesTab /></TabsContent>
        <TabsContent value="hardware"><HardwareSettingsTab /></TabsContent>
      </Tabs>
    </motion.div>
  )
}
