'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Building2, Plus, MapPin, Phone, Users, Package,
  Save, Loader2, DollarSign, Hash
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

interface BranchData {
  id: string
  name: string
  code: string
  address: string | null
  phone: string | null
  active: boolean
  createdAt: string
  _count: { users: number; inventory: number; sales: number }
  users: { id: string; name: string; role: string }[]
  inventoryValue: number
}

export default function Branches() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '', code: '', address: '', phone: '', active: true,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await fetch('/api/branches')
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Error al crear sucursal')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      setDialogOpen(false)
      resetForm()
      toast.success('Sucursal creada exitosamente')
    },
    onError: () => toast.error('Error al crear sucursal'),
  })

  const updateMutation = useMutation({
    mutationFn: async (data: typeof form & { id: string }) => {
      const res = await fetch(`/api/branches?id=${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Error al actualizar sucursal')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      setDialogOpen(false)
      resetForm()
      toast.success('Sucursal actualizada exitosamente')
    },
    onError: () => toast.error('Error al actualizar sucursal'),
  })

  const resetForm = () => {
    setForm({ name: '', code: '', address: '', phone: '', active: true })
    setEditingId(null)
  }

  const openEdit = (branch: BranchData) => {
    setForm({
      name: branch.name,
      code: branch.code,
      address: branch.address || '',
      phone: branch.phone || '',
      active: branch.active,
    })
    setEditingId(branch.id)
    setDialogOpen(true)
  }

  const handleSubmit = () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('Nombre y código son requeridos')
      return
    }
    if (editingId) {
      updateMutation.mutate({ ...form, id: editingId })
    } else {
      createMutation.mutate(form)
    }
  }

  const branches: BranchData[] = data?.branches || []

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Sucursales</h2>
          <p className="text-sm text-muted-foreground">{branches.length} sucursales registradas</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true) }} className="gap-2">
          <Plus className="w-4 h-4" /> Nueva Sucursal
        </Button>
      </div>

      {/* Branch Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded w-1/3 mb-4" />
                <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches.map((branch) => (
            <motion.div
              key={branch.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEdit(branch)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                        <Building2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{branch.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            <Hash className="w-2.5 h-2.5 mr-0.5" />{branch.code}
                          </Badge>
                          <Badge
                            className={`text-[10px] ${
                              branch.active
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                          >
                            {branch.active ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Contact Info */}
                  <div className="space-y-1.5">
                    {branch.address && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{branch.address}</span>
                      </div>
                    )}
                    {branch.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">{branch.phone}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-lg font-bold">{branch._count.users}</p>
                      <p className="text-[10px] text-muted-foreground">Usuarios</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <Package className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-lg font-bold">{branch._count.inventory}</p>
                      <p className="text-[10px] text-muted-foreground">Productos</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <DollarSign className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-sm font-bold">{MXN.format(branch.inventoryValue)}</p>
                      <p className="text-[10px] text-muted-foreground">Valor Inv.</p>
                    </div>
                  </div>

                  {/* Users */}
                  {branch.users.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {branch.users.slice(0, 4).map(user => (
                        <Badge key={user.id} variant="secondary" className="text-[10px]">
                          {user.name.split(' ').slice(0, 2).join(' ')}
                        </Badge>
                      ))}
                      {branch.users.length > 4 && (
                        <Badge variant="secondary" className="text-[10px]">
                          +{branch.users.length - 4} más
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Sucursal' : 'Nueva Sucursal'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nombre *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Sucursal Centro"
                />
              </div>
              <div>
                <Label>Código *</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="Ej: CTR"
                  className="uppercase"
                  maxLength={5}
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={form.active} onCheckedChange={(v) => setForm(f => ({ ...f, active: v }))} />
                <Label>Activa</Label>
              </div>
              <div className="col-span-2">
                <Label>Dirección</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Calle, número, colonia, ciudad"
                />
              </div>
              <div className="col-span-2">
                <Label>Teléfono</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+52 55 1234 5678"
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
