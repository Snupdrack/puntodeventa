'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Package,
  Plus,
  Search,
  Edit3,
  ToggleLeft,
  ToggleRight,
  ChevronUp,
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Loader2,
  Filter,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
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
  barcode: string | null
  name: string
  description: string | null
  categoryId: string
  costPrice: number
  salePrice: number
  unit: string
  trackStock: boolean
  active: boolean
  imageUrl: string | null
  createdAt: string
  updatedAt: string
  category: Category
  totalStock: number
}

interface ProductsResponse {
  products: Product[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ---- Zod Schema ----
const productSchema = z.object({
  sku: z.string().optional(),
  barcode: z.string().optional(),
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'La categoría es requerida'),
  costPrice: z.coerce.number().min(0, 'El precio de costo debe ser mayor o igual a 0'),
  salePrice: z.coerce.number().min(0, 'El precio de venta debe ser mayor o igual a 0'),
  unit: z.string().min(1, 'La unidad es requerida'),
  trackStock: z.boolean().default(true),
  imageUrl: z.string().optional(),
})

type ProductFormValues = z.infer<typeof productSchema>

// ---- Helpers ----
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)

const UNITS = ['pieza', 'kg', 'lt', 'metro', 'caja', 'paquete']

// ---- Sort Icon (declared outside render) ----
function SortIcon({ column, sortby, sortOrder }: { column: string; sortby: string; sortOrder: 'asc' | 'desc' }) {
  return (
    <span className="inline-flex ml-1">
      {sortby === column ? (
        sortOrder === 'asc' ? (
          <ChevronUp className="size-3.5" />
        ) : (
          <ChevronDown className="size-3.5" />
        )
      ) : (
        <ChevronUp className="size-3.5 opacity-30" />
      )}
    </span>
  )
}

// ---- Product Form Dialog ----
function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
  categories: Category[]
}) {
  const queryClient = useQueryClient()
  const isEditing = !!product

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: '',
      barcode: '',
      name: '',
      description: '',
      categoryId: '',
      costPrice: 0,
      salePrice: 0,
      unit: 'pieza',
      trackStock: true,
      imageUrl: '',
    },
  })

  // Reset form when product changes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (newOpen && product) {
        form.reset({
          sku: product.sku,
          barcode: product.barcode || '',
          name: product.name,
          description: product.description || '',
          categoryId: product.categoryId,
          costPrice: product.costPrice,
          salePrice: product.salePrice,
          unit: product.unit,
          trackStock: product.trackStock,
          imageUrl: product.imageUrl || '',
        })
      } else if (newOpen) {
        form.reset({
          sku: '',
          barcode: '',
          name: '',
          description: '',
          categoryId: '',
          costPrice: 0,
          salePrice: 0,
          unit: 'pieza',
          trackStock: true,
          imageUrl: '',
        })
      }
      onOpenChange(newOpen)
    },
    [form, onOpenChange, product]
  )

  const createMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al crear producto')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      onOpenChange(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      const res = await fetch(`/api/products?id=${product!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al actualizar producto')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      onOpenChange(false)
    },
  })

  const onSubmit = (data: ProductFormValues) => {
    if (isEditing) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="size-5 text-primary" />
            {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica los datos del producto.'
              : 'Completa los datos para registrar un nuevo producto.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input placeholder="Auto-generado" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código de barras</FormLabel>
                    <FormControl>
                      <Input placeholder="Escanear código" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del producto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripción del producto"
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidad *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Unidad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UNITS.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="costPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio de Costo *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="salePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio de Venta *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imagen URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://ejemplo.com/imagen.jpg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trackStock"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-medium">Rastrear inventario</FormLabel>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700">
                {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                {isEditing ? 'Guardar Cambios' : 'Crear Producto'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ---- Main Products Component ----
export default function Products() {
  const queryClient = useQueryClient()
  const { currentBranch } = useAppStore()

  // State
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [sortby, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const limit = 10

  // Fetch categories for filter and form
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories')
      if (!res.ok) throw new Error('Error al cargar categorías')
      return res.json() as Promise<{ categories: Category[] }>
    },
  })

  const categories = categoriesData?.categories || []

  // Fetch products
  const { data, isLoading } = useQuery({
    queryKey: ['products', search, categoryFilter, page, sortby, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy: sortby,
        sortOrder,
      })
      if (search) params.set('search', search)
      if (categoryFilter && categoryFilter !== 'all') params.set('categoryId', categoryFilter)

      const res = await fetch(`/api/products?${params}`)
      if (!res.ok) throw new Error('Error al cargar productos')
      return res.json() as Promise<ProductsResponse>
    },
  })

  // Toggle active status
  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/products?id=${id}`, { method: 'PATCH' })
      if (!res.ok) throw new Error('Error al cambiar estado')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  const handleSort = (column: string) => {
    if (sortby === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  const products = data?.products || []
  const totalPages = data?.totalPages || 1

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
            <Package className="size-5 text-emerald-600" />
            Productos
          </h2>
          <p className="text-sm text-muted-foreground">
            Gestión del catálogo de productos y precios
            {currentBranch && (
              <span className="ml-1">· {currentBranch.name}</span>
            )}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingProduct(null)
            setDialogOpen(true)
          }}
          className="bg-emerald-600 hover:bg-emerald-700 gap-2"
        >
          <Plus className="size-4" />
          Nuevo Producto
        </Button>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, SKU, código de barras..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="size-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-8 animate-spin text-emerald-600" />
              <span className="ml-3 text-muted-foreground">Cargando productos...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Package className="size-12 mb-3 opacity-30" />
              <p className="font-medium">No se encontraron productos</p>
              <p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('sku')}
                      >
                        SKU <SortIcon column="sku" sortby={sortby} sortOrder={sortOrder} />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('name')}
                      >
                        Nombre <SortIcon column="name" sortby={sortby} sortOrder={sortOrder} />
                      </TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead
                        className="cursor-pointer select-none text-right"
                        onClick={() => handleSort('costPrice')}
                      >
                        P. Costo <SortIcon column="costPrice" sortby={sortby} sortOrder={sortOrder} />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none text-right"
                        onClick={() => handleSort('salePrice')}
                      >
                        P. Venta <SortIcon column="salePrice" sortby={sortby} sortOrder={sortOrder} />
                      </TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product, idx) => (
                      <motion.tr
                        key={product.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03, duration: 0.2 }}
                        className="hover:bg-muted/30 transition-colors border-b"
                      >
                        <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{product.name}</p>
                            {product.barcode && (
                              <p className="text-xs text-muted-foreground">{product.barcode}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="text-xs"
                            style={{
                              backgroundColor: product.category.color
                                ? `${product.category.color}20`
                                : undefined,
                              color: product.category.color || undefined,
                              borderColor: product.category.color
                                ? `${product.category.color}40`
                                : undefined,
                            }}
                          >
                            {product.category.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(product.costPrice)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatCurrency(product.salePrice)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              product.totalStock === 0
                                ? 'destructive'
                                : product.totalStock <= 5
                                  ? 'secondary'
                                  : 'outline'
                            }
                            className="text-xs"
                          >
                            {product.totalStock}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={
                              product.active
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
                            }
                            variant="outline"
                          >
                            {product.active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => {
                                setEditingProduct(product)
                                setDialogOpen(true)
                              }}
                            >
                              <Edit3 className="size-3.5 text-muted-foreground hover:text-emerald-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => toggleMutation.mutate(product.id)}
                            >
                              {product.active ? (
                                <ToggleRight className="size-4 text-emerald-600" />
                              ) : (
                                <ToggleLeft className="size-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  Mostrando {(page - 1) * limit + 1}-{Math.min(page * limit, data?.total || 0)} de{' '}
                  {data?.total || 0} productos
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    disabled={page <= 1}
                    onClick={() => setPage(1)}
                  >
                    <ChevronsLeft className="size-4" />
                  </Button>
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
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    disabled={page >= totalPages}
                    onClick={() => setPage(totalPages)}
                  >
                    <ChevronsRight className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Product Form Dialog */}
      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editingProduct}
        categories={categories}
      />
    </motion.div>
  )
}
