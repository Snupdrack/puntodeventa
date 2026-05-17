'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ReceiptText, Plus, Search, TrendingDown, TrendingUp, RefreshCw,
  Save, Loader2, DollarSign, Repeat
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
import { Switch } from '@/components/ui/switch'
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { toast } from 'sonner'

const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

const EXPENSE_CATEGORIES = ['ALQUILER', 'SERVICIOS', 'SUELDOS', 'MANTENIMIENTO', 'PUBLICIDAD', 'TRANSPORTE', 'OTROS'] as const

const categoryLabels: Record<string, string> = {
  ALQUILER: 'Alquiler',
  SERVICIOS: 'Servicios',
  SUELDOS: 'Sueldos',
  MANTENIMIENTO: 'Mantenimiento',
  PUBLICIDAD: 'Publicidad',
  TRANSPORTE: 'Transporte',
  OTROS: 'Otros',
}

const categoryColors: Record<string, string> = {
  ALQUILER: '#14b8a6',
  SERVICIOS: '#f59e0b',
  SUELDOS: '#8b5cf6',
  MANTENIMIENTO: '#ef4444',
  PUBLICIDAD: '#3b82f6',
  TRANSPORTE: '#ec4899',
  OTROS: '#6b7280',
}

interface ExpenseData {
  id: string
  category: string
  description: string
  amount: number
  date: string
  branchId: string | null
  isRecurring: boolean
  receiptUrl: string | null
  branch: { id: string; name: string; code: string } | null
  user: { id: string; name: string }
}

export default function Expenses() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    category: 'ALQUILER',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    branchId: '',
    isRecurring: false,
    receiptUrl: '',
  })

  const { data: expensesData, isLoading } = useQuery({
    queryKey: ['expenses', categoryFilter, branchFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (categoryFilter) params.set('category', categoryFilter)
      if (branchFilter) params.set('branchId', branchFilter)
      const res = await fetch(`/api/expenses?${params}`)
      return res.json()
    },
  })

  const { data: summary } = useQuery({
    queryKey: ['expenses-summary', branchFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (branchFilter) params.set('branchId', branchFilter)
      const res = await fetch(`/api/expenses/summary?${params}`)
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

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Error al crear gasto')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] })
      setDialogOpen(false)
      resetForm()
      toast.success('Gasto registrado exitosamente')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: typeof form & { id: string }) => {
      const res = await fetch(`/api/expenses?id=${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Error al actualizar gasto')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] })
      setDialogOpen(false)
      resetForm()
      toast.success('Gasto actualizado exitosamente')
    },
  })

  const resetForm = () => {
    setForm({
      category: 'ALQUILER', description: '', amount: 0,
      date: new Date().toISOString().split('T')[0],
      branchId: '', isRecurring: false, receiptUrl: '',
    })
    setEditingId(null)
  }

  const openEdit = (expense: ExpenseData) => {
    setForm({
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      date: new Date(expense.date).toISOString().split('T')[0],
      branchId: expense.branchId || '',
      isRecurring: expense.isRecurring,
      receiptUrl: expense.receiptUrl || '',
    })
    setEditingId(expense.id)
    setDialogOpen(true)
  }

  const handleSubmit = () => {
    if (!form.description.trim() || form.amount <= 0) {
      toast.error('Descripción y monto son requeridos')
      return
    }
    if (editingId) {
      updateMutation.mutate({ ...form, id: editingId })
    } else {
      createMutation.mutate(form)
    }
  }

  const expenses: ExpenseData[] = expensesData?.expenses || []
  const totalExpenses = expensesData?.total || 0

  // Chart data
  const byCategory = summary?.byCategory || {}
  const pieData = Object.entries(byCategory).map(([key, value]) => ({
    name: categoryLabels[key] || key,
    value: value as number,
    color: categoryColors[key] || '#6b7280',
  }))

  const trendData = (summary?.trend || []).map((t: { month: string; total: number }) => ({
    name: t.month,
    gastos: t.total,
  }))

  // Filter by search on description
  const filteredExpenses = search
    ? expenses.filter(e => e.description.toLowerCase().includes(search.toLowerCase()))
    : expenses

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 space-y-6"
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gastos del Mes</p>
                <p className="text-2xl font-bold">{MXN.format(summary?.totalMonth || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Repeat className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gastos Recurrentes</p>
                <p className="text-2xl font-bold">{MXN.format(summary?.totalRecurring || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Utilidad Neta</p>
                <p className={`text-2xl font-bold ${(summary?.netProfit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {MXN.format(summary?.netProfit || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gastos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => MXN.format(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {pieData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">{MXN.format(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                Sin datos de gastos
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tendencia Mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => MXN.format(value)} />
                <Line type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 4 }} name="Gastos" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Expense List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-base">Registro de Gastos</CardTitle>
            <Button onClick={() => { resetForm(); setDialogOpen(true) }} className="gap-2">
              <Plus className="w-4 h-4" /> Nuevo Gasto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descripción..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v === 'ALL' ? '' : v)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                {EXPENSE_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{categoryLabels[cat]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={branchFilter} onValueChange={(v) => setBranchFilter(v === 'ALL' ? '' : v)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Sucursal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                {(branches?.branches || []).map((b: { id: string; name: string; code: string }) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                  <TableHead className="hidden md:table-cell">Sucursal</TableHead>
                  <TableHead className="hidden lg:table-cell">Recurrente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Cargando gastos...
                    </TableCell>
                  </TableRow>
                ) : filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No se encontraron gastos
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense) => (
                    <TableRow
                      key={expense.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openEdit(expense)}
                    >
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-[10px]"
                          style={{
                            borderColor: categoryColors[expense.category],
                            color: categoryColors[expense.category],
                          }}
                        >
                          {categoryLabels[expense.category] || expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{expense.description}</TableCell>
                      <TableCell className="text-right font-medium text-red-600 dark:text-red-400">
                        {MXN.format(expense.amount)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {new Date(expense.date).toLocaleDateString('es-MX')}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {expense.branch?.name || '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {expense.isRecurring ? (
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <Repeat className="w-3 h-3" /> Sí
                          </Badge>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
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
            <DialogTitle>{editingId ? 'Editar Gasto' : 'Nuevo Gasto'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoría *</Label>
                <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{categoryLabels[cat]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Monto *</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                  min={0}
                  step={0.01}
                />
              </div>
              <div className="col-span-2">
                <Label>Descripción *</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Descripción del gasto"
                />
              </div>
              <div>
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div>
                <Label>Sucursal</Label>
                <Select value={form.branchId} onValueChange={(v) => setForm(f => ({ ...f, branchId: v === 'NONE' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Sin sucursal</SelectItem>
                    {(branches?.branches || []).map((b: { id: string; name: string }) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.isRecurring} onCheckedChange={(v) => setForm(f => ({ ...f, isRecurring: v }))} />
                <Label>Recurrente</Label>
              </div>
              <div>
                <Label>Comprobante URL</Label>
                <Input
                  value={form.receiptUrl}
                  onChange={(e) => setForm(f => ({ ...f, receiptUrl: e.target.value }))}
                  placeholder="https://..."
                />
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
    </motion.div>
  )
}
