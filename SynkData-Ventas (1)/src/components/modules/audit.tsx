'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Search, RefreshCw, Download, ChevronDown, ChevronUp,
  Loader2, Filter, Clock, User, FileText
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'

const actionColors: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  CREATE_SALE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  CREATE_CLIENT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  UPDATE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  UPDATE_PRODUCT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  CANCEL_SALE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  LOGIN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ADJUST_INVENTORY: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  CHANGE_ROLE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  EXPORT_REPORT: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
}

function getActionColor(action: string): string {
  if (actionColors[action]) return actionColors[action]
  if (action.startsWith('CREATE')) return actionColors.CREATE
  if (action.startsWith('UPDATE')) return actionColors.UPDATE
  if (action.startsWith('DELETE')) return actionColors.DELETE
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
}

interface AuditLog {
  id: string
  userId: string
  action: string
  entity: string
  entityId: string | null
  details: string | null
  ipAddress: string | null
  createdAt: string
  user: { id: string; name: string; email: string; role: string }
}

export default function Audit() {
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['audit', actionFilter, entityFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (actionFilter) params.set('action', actionFilter)
      if (entityFilter) params.set('entity', entityFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      const res = await fetch(`/api/audit?${params}`)
      return res.json()
    },
    refetchInterval: 30000, // Auto-refresh every 30s
  })

  const logs: AuditLog[] = data?.logs || []
  const total = data?.total || 0

  // Stats
  const createActionCount = logs.filter(l => l.action.startsWith('CREATE')).length
  const updateActionCount = logs.filter(l => l.action.startsWith('UPDATE') || l.action === 'ADJUST_INVENTORY').length
  const deleteActionCount = logs.filter(l => l.action.startsWith('DELETE') || l.action.startsWith('CANCEL')).length
  const loginCount = logs.filter(l => l.action === 'LOGIN').length

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
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Creaciones</p>
                <p className="text-2xl font-bold text-emerald-600">{createActionCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Actualizaciones</p>
                <p className="text-2xl font-bold text-amber-600">{updateActionCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Eliminaciones</p>
                <p className="text-2xl font-bold text-red-600">{deleteActionCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Inicios de Sesión</p>
                <p className="text-2xl font-bold text-blue-600">{loginCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Log Viewer */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" /> Registro de Auditoría
              <Badge variant="secondary" className="text-[10px]">{total} registros</Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.info('Exportación en desarrollo')}>
                <Download className="w-3.5 h-3.5" /> Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Select value={actionFilter} onValueChange={(v) => setActionFilter(v === 'ALL' ? '' : v)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                <SelectItem value="CREATE">Crear</SelectItem>
                <SelectItem value="UPDATE">Actualizar</SelectItem>
                <SelectItem value="DELETE">Eliminar</SelectItem>
                <SelectItem value="LOGIN">Login</SelectItem>
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={(v) => setEntityFilter(v === 'ALL' ? '' : v)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Entidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                <SelectItem value="User">Usuario</SelectItem>
                <SelectItem value="Sale">Venta</SelectItem>
                <SelectItem value="Product">Producto</SelectItem>
                <SelectItem value="Client">Cliente</SelectItem>
                <SelectItem value="Inventory">Inventario</SelectItem>
                <SelectItem value="Report">Reporte</SelectItem>
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
                  <TableHead>Fecha/Hora</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead className="hidden md:table-cell">Entidad</TableHead>
                  <TableHead className="hidden lg:table-cell">Detalles</TableHead>
                  <TableHead className="hidden lg:table-cell">IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Cargando logs...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No se encontraron registros
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <>
                      <TableRow
                        key={log.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                      >
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('es-MX', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="text-sm font-medium">{log.user.name}</span>
                            <span className="block text-[10px] text-muted-foreground">{log.user.role}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getActionColor(log.action)} text-[10px] font-medium`}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{log.entity}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm max-w-[200px] truncate">{log.details || '—'}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs font-mono">{log.ipAddress || '—'}</TableCell>
                      </TableRow>
                      {expandedRow === log.id && (
                        <TableRow key={`${log.id}-expanded`}>
                          <TableCell colSpan={6} className="bg-muted/30 p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">ID Registro:</span>{' '}
                                <span className="font-mono text-xs">{log.id}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Usuario:</span>{' '}
                                {log.user.name} ({log.user.email})
                              </div>
                              <div>
                                <span className="text-muted-foreground">Acción:</span>{' '}
                                <Badge className={`${getActionColor(log.action)} text-[10px]`}>{log.action}</Badge>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Entidad:</span> {log.entity}
                                {log.entityId && <span className="font-mono text-xs ml-1">({log.entityId})</span>}
                              </div>
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Detalles:</span>
                                <pre className="mt-1 p-2 bg-background rounded text-xs font-mono whitespace-pre-wrap">
                                  {log.details || 'Sin detalles'}
                                </pre>
                              </div>
                              <div>
                                <span className="text-muted-foreground">IP:</span>{' '}
                                <span className="font-mono">{log.ipAddress || '—'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Fecha completa:</span>{' '}
                                {new Date(log.createdAt).toLocaleString('es-MX')}
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
