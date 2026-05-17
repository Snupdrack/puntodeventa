'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  ScanBarcode,
  Plus,
  Minus,
  X,
  Trash2,
  ShoppingCart,
  User,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  Receipt,
  FileText,
  ChevronDown,
  Loader2,
  CheckCircle2,
  Package,
  QrCode,
  Wifi,
  WifiOff,
  Smartphone,
  Clock,
  Check,
  AlertCircle,
} from 'lucide-react'
import QRCode from 'qrcode'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore, type CartItem } from '@/lib/store'
import { useHardwareStore } from '@/lib/hardware/store'
import { addToOfflineQueue, isOnline, onConnectionChange, processOfflineQueue, getOfflineQueue } from '@/lib/offline'

// ---- Types ----
interface ProductItem {
  id: string
  sku: string
  barcode: string | null
  name: string
  description: string | null
  costPrice: number
  salePrice: number
  unit: string
  trackStock: boolean
  imageUrl: string | null
  category: { id: string; name: string; color: string | null; icon: string | null }
  stock: number
  minStock: number
  lowStock: boolean
  outOfStock: boolean
}

interface ClientItem {
  id: string
  name: string
  email: string | null
  phone: string | null
  rfc: string | null
  type: string
  creditLimit: number
  creditUsed: number
  points: number
}

interface SaleResponse {
  sale: {
    id: string
    folio: string
    subtotal: number
    tax: number
    taxRate: number
    discount: number
    total: number
    paymentMethod: string
    cashReceived: number | null
    change: number | null
    createdAt: string
    items: { id: string; productId: string; quantity: number; unitPrice: number; discount: number; total: number; product: { id: string; name: string; sku: string } }[]
    client: { id: string; name: string; rfc: string | null; email: string | null } | null
    branch: { id: string; name: string; code: string }
    user: { id: string; name: string }
  }
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

type PaymentMethod = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO' | 'QR' | 'CONTACTLESS'

// ---- Load payment providers from localStorage ----
function loadPaymentProviders(): PaymentProvider[] {
  if (typeof window === 'undefined') return []
  const saved = localStorage.getItem('synkdata-payment-providers')
  if (saved) {
    try { return JSON.parse(saved) } catch { /* ignore */ }
  }
  return [
    {
      id: 'mercadopago',
      name: 'Mercado Pago',
      type: 'qr',
      enabled: false,
      apiKey: '',
      secretKey: '',
      merchantId: '',
      webhookUrl: '',
      sandbox: true,
    },
    {
      id: 'stripe',
      name: 'Stripe Terminal',
      type: 'contactless',
      enabled: false,
      apiKey: '',
      secretKey: '',
      merchantId: '',
      webhookUrl: '',
      sandbox: true,
    },
    {
      id: 'clip',
      name: 'Clip',
      type: 'contactless',
      enabled: false,
      apiKey: '',
      secretKey: '',
      merchantId: '',
      webhookUrl: '',
      sandbox: true,
    },
    {
      id: 'paypal',
      name: 'PayPal QR',
      type: 'qr',
      enabled: false,
      apiKey: '',
      secretKey: '',
      merchantId: '',
      webhookUrl: '',
      sandbox: true,
    },
    {
      id: 'link_pago',
      name: 'Link de Pago',
      type: 'link',
      enabled: false,
      apiKey: '',
      secretKey: '',
      merchantId: '',
      webhookUrl: '',
      sandbox: true,
    },
  ]
}

const paymentMethods: { value: PaymentMethod; label: string; icon: React.ElementType; color?: string }[] = [
  { value: 'EFECTIVO', label: 'Efectivo', icon: Banknote },
  { value: 'TARJETA', label: 'Tarjeta', icon: CreditCard },
  { value: 'TRANSFERENCIA', label: 'Transferencia', icon: ArrowRightLeft },
  { value: 'QR', label: 'QR / Cobro Digital', icon: QrCode, color: 'text-violet-600' },
  { value: 'CONTACTLESS', label: 'Contactless', icon: Wifi, color: 'text-sky-600' },
  { value: 'CREDITO', label: 'Crédito', icon: FileText },
]

// ---- Helpers ----
function formatMXN(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount)
}

function getProductInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}

function getCategoryColor(color: string | null): string {
  return color || '#6b7280'
}

// ---- QR Payment Dialog ----
function QRPaymentDialog({
  open,
  onOpenChange,
  total,
  onComplete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  total: number
  onComplete: (providerId: string) => void
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'checking' | 'confirmed' | 'expired'>('pending')
  const [countdown, setCountdown] = useState(300) // 5 minutes
  const providers = loadPaymentProviders().filter(p => p.enabled && p.type === 'qr')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Generate QR code when dialog opens with a provider selected
  useEffect(() => {
    if (!open || !selectedProvider) return

    const provider = providers.find(p => p.id === selectedProvider)
    if (!provider) return

    // Generate a payment QR URL (in production this would call the provider's API)
    const paymentData = `https://pay.synkdata.com/${provider.id}/${Date.now()}?amount=${total.toFixed(2)}&currency=MXN`

    QRCode.toDataURL(paymentData, {
      width: 280,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).then(url => setQrDataUrl(url)).catch(() => {
      // Fallback simple QR
      QRCode.toDataURL(paymentData, { width: 200, margin: 1 })
        .then(url => setQrDataUrl(url))
    })

    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setPaymentStatus('expired')
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [open, selectedProvider, total, providers])

  // Simulate payment checking (in production this would poll the provider's webhook)
  const checkPayment = useCallback(() => {
    setPaymentStatus('checking')
    // Simulate a 2-second check
    setTimeout(() => {
      // In production, this would verify with the provider's API
      // For demo, we simulate a successful payment
      setPaymentStatus('confirmed')
      toast.success('Pago QR recibido', {
        description: `Pago de ${formatMXN(total)} confirmado`,
      })
    }, 2000)
  }, [total])

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="size-5 text-violet-600" />
            Cobro con QR / Cobro Digital
          </DialogTitle>
          <DialogDescription>
            Muestra el código QR al cliente para que escanee y pague desde su app bancaria
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Provider selection */}
          {!selectedProvider ? (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Selecciona el proveedor de cobro</Label>
              <div className="grid gap-2">
                {providers.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <AlertCircle className="size-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay proveedores QR configurados</p>
                    <p className="text-xs mt-1">Ve a Configuración → Servicios de Cobro para activarlos</p>
                  </div>
                ) : (
                  providers.map(provider => (
                    <Button
                      key={provider.id}
                      variant="outline"
                      className="justify-start h-14 gap-3"
                      onClick={() => setSelectedProvider(provider.id)}
                    >
                      <Smartphone className="size-5 text-violet-500" />
                      <div className="text-left">
                        <p className="font-medium text-sm">{provider.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {provider.sandbox ? 'Modo prueba' : 'Modo producción'}
                        </p>
                      </div>
                    </Button>
                  ))
                )}
              </div>
            </div>
          ) : paymentStatus === 'confirmed' ? (
            /* Payment confirmed */
            <div className="text-center py-6 space-y-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.5 }}
              >
                <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                  <Check className="size-8 text-emerald-600 dark:text-emerald-400" />
                </div>
              </motion.div>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">¡Pago Confirmado!</p>
              <p className="text-2xl font-bold">{formatMXN(total)}</p>
            </div>
          ) : (
            /* QR Code display */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {providers.find(p => p.id === selectedProvider)?.name}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  <span className={countdown < 60 ? 'text-destructive font-medium' : ''}>
                    {formatCountdown(countdown)}
                  </span>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-xl shadow-inner">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="Código QR de pago" className="size-64" />
                  ) : (
                    <div className="size-64 flex items-center justify-center">
                      <Loader2 className="size-8 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>

              {/* Amount */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Monto a pagar</p>
                <p className="text-3xl font-bold tracking-tight">{formatMXN(total)}</p>
              </div>

              {/* Status indicator */}
              <div className="flex items-center justify-center gap-2 py-2">
                {paymentStatus === 'pending' && (
                  <>
                    <Loader2 className="size-4 animate-spin text-amber-500" />
                    <span className="text-sm text-amber-600 dark:text-amber-400">Esperando pago del cliente...</span>
                  </>
                )}
                {paymentStatus === 'checking' && (
                  <>
                    <Loader2 className="size-4 animate-spin text-primary" />
                    <span className="text-sm text-primary">Verificando pago...</span>
                  </>
                )}
                {paymentStatus === 'expired' && (
                  <>
                    <AlertCircle className="size-4 text-destructive" />
                    <span className="text-sm text-destructive">Código QR expirado</span>
                  </>
                )}
              </div>

              {/* Progress bar for countdown */}
              <Progress value={(countdown / 300) * 100} className="h-1" />

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedProvider('')
                    setQrDataUrl('')
                  }}
                >
                  Cambiar proveedor
                </Button>
                {paymentStatus === 'pending' && (
                  <Button
                    className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
                    onClick={checkPayment}
                  >
                    <Check className="size-4 mr-1.5" />
                    Confirmar pago
                  </Button>
                )}
                {paymentStatus === 'expired' && (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setPaymentStatus('pending')
                      setCountdown(300)
                      // Regenerate QR
                      const provider = providers.find(p => p.id === selectedProvider)
                      if (provider) {
                        const paymentData = `https://pay.synkdata.com/${provider.id}/${Date.now()}?amount=${total.toFixed(2)}&currency=MXN`
                        QRCode.toDataURL(paymentData, {
                          width: 280, margin: 2, color: { dark: '#0f172a', light: '#ffffff' }
                        }).then(url => setQrDataUrl(url))
                      }
                    }}
                  >
                    Generar nuevo QR
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {paymentStatus === 'confirmed' ? (
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                onComplete(selectedProvider)
                onOpenChange(false)
              }}
            >
              Continuar con la venta
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
              Cancelar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- Contactless Payment Dialog ----
function ContactlessPaymentDialog({
  open,
  onOpenChange,
  total,
  onComplete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  total: number
  onComplete: (providerId: string) => void
}) {
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [paymentStatus, setPaymentStatus] = useState<'waiting' | 'processing' | 'approved' | 'declined'>('waiting')
  const providers = loadPaymentProviders().filter(p => p.enabled && p.type === 'contactless')

  const processPayment = useCallback(() => {
    setPaymentStatus('processing')
    // Simulate card reading and processing
    setTimeout(() => {
      // In production, this would communicate with the card reader via the provider's SDK
      setPaymentStatus('approved')
      toast.success('Pago contactless aprobado', {
        description: `Pago de ${formatMXN(total)} aprobado`,
      })
    }, 3000)
  }, [total])

  // Reset state when provider changes or dialog opens - use QR generation as the trigger
  // Initial state is already set correctly via useState defaults

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="size-5 text-sky-600" />
            Cobro Contactless / NFC
          </DialogTitle>
          <DialogDescription>
            Aproxima la tarjeta o dispositivo del cliente al terminal para cobrar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedProvider ? (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Selecciona el terminal de cobro</Label>
              <div className="grid gap-2">
                {providers.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <AlertCircle className="size-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay terminales contactless configurados</p>
                    <p className="text-xs mt-1">Ve a Configuración → Servicios de Cobro para activarlos</p>
                  </div>
                ) : (
                  providers.map(provider => (
                    <Button
                      key={provider.id}
                      variant="outline"
                      className="justify-start h-14 gap-3"
                      onClick={() => setSelectedProvider(provider.id)}
                    >
                      <CreditCard className="size-5 text-sky-500" />
                      <div className="text-left">
                        <p className="font-medium text-sm">{provider.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {provider.sandbox ? 'Modo prueba' : 'Modo producción'}
                          {provider.merchantId ? ` · Terminal: ${provider.merchantId.slice(-4)}` : ''}
                        </p>
                      </div>
                    </Button>
                  ))
                )}
              </div>
            </div>
          ) : paymentStatus === 'approved' ? (
            <div className="text-center py-6 space-y-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.5 }}
              >
                <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                  <Check className="size-8 text-emerald-600 dark:text-emerald-400" />
                </div>
              </motion.div>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">¡Pago Aprobado!</p>
              <p className="text-2xl font-bold">{formatMXN(total)}</p>
              <Badge variant="outline" className="text-xs">
                {providers.find(p => p.id === selectedProvider)?.name}
              </Badge>
            </div>
          ) : paymentStatus === 'declined' ? (
            <div className="text-center py-6 space-y-3">
              <div className="size-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
                <X className="size-8 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">Pago Rechazado</p>
              <p className="text-sm text-muted-foreground">La tarjeta fue declinada. Intenta con otro método.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setPaymentStatus('waiting')
                }}
              >
                Reintentar
              </Button>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              {/* Contactless animation */}
              <div className="flex justify-center py-4">
                <motion.div
                  animate={paymentStatus === 'processing' ? {
                    scale: [1, 1.1, 1],
                    opacity: [1, 0.7, 1],
                  } : {}}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <div className="relative">
                    <div className="size-32 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                      <CreditCard className="size-12 text-sky-600 dark:text-sky-400" />
                    </div>
                    {/* NFC waves */}
                    {paymentStatus === 'waiting' && (
                      <>
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-sky-400/30"
                          animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                          transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
                        />
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-sky-400/30"
                          animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
                          transition={{ repeat: Infinity, duration: 2, ease: 'easeOut', delay: 0.5 }}
                        />
                      </>
                    )}
                  </div>
                </motion.div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  {paymentStatus === 'waiting'
                    ? 'Aproxima la tarjeta o dispositivo al terminal'
                    : 'Procesando pago...'
                  }
                </p>
                <p className="text-3xl font-bold tracking-tight mt-2">{formatMXN(total)}</p>
                <Badge variant="outline" className="text-xs mt-2">
                  {providers.find(p => p.id === selectedProvider)?.name}
                </Badge>
              </div>

              {paymentStatus === 'waiting' && (
                <Button
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white"
                  onClick={processPayment}
                >
                  <Wifi className="size-4 mr-1.5" />
                  Simular lectura de tarjeta
                </Button>
              )}

              {paymentStatus === 'processing' && (
                <div className="flex items-center justify-center gap-2 text-sky-600 dark:text-sky-400">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="text-sm">Procesando transacción...</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {paymentStatus === 'approved' ? (
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                onComplete(selectedProvider)
                onOpenChange(false)
              }}
            >
              Continuar con la venta
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
              Cancelar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- Main Component ----
export default function POS() {
  const queryClient = useQueryClient()
  const { cart, addToCart, removeFromCart, updateCartQuantity, clearCart, currentBranch, currentUser } = useAppStore()
  const hw = useHardwareStore()

  // Local state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [includeIva, setIncludeIva] = useState(true)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [selectedClient, setSelectedClient] = useState<ClientItem | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('EFECTIVO')
  const [cashReceived, setCashReceived] = useState<number>(0)
  const [clientSearchOpen, setClientSearchOpen] = useState(false)
  const [clientSearchTerm, setClientSearchTerm] = useState('')
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false)
  const [lastSale, setLastSale] = useState<SaleResponse['sale'] | null>(null)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [contactlessDialogOpen, setContactlessDialogOpen] = useState(false)
  const [qrPaymentConfirmed, setQrPaymentConfirmed] = useState(false)
  const [contactlessPaymentConfirmed, setContactlessPaymentConfirmed] = useState(false)
  const [connectionOnline, setConnectionOnline] = useState(true)
  const [offlinePendingCount, setOfflinePendingCount] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // ---- Offline Connection Tracking ----
  useEffect(() => {
    setConnectionOnline(navigator.onLine)
    getOfflineQueue().then(q => setOfflinePendingCount(q.length))

    const unsubscribe = onConnectionChange((online) => {
      setConnectionOnline(online)
      if (online) {
        // Process offline queue when coming back online
        processOfflineQueue().then((result) => {
          setOfflinePendingCount(result.remaining)
          if (result.processed > 0) {
            queryClient.invalidateQueries({ queryKey: ['pos-products'] })
            toast.success(`${result.processed} venta${result.processed > 1 ? 's' : ''} sincronizada${result.processed > 1 ? 's' : ''}`, {
              description: 'Las ventas pendientes se procesaron correctamente',
              icon: <CheckCircle2 className="size-4 text-emerald-500" />,
            })
          }
        })
      }
    })

    // Poll pending count periodically
    const interval = setInterval(async () => {
      const q = await getOfflineQueue()
      setOfflinePendingCount(q.length)
    }, 5000)

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [])

  // ---- Data Fetching ----
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['pos-products', searchTerm, selectedCategory, currentBranch?.id],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchTerm) params.set('search', searchTerm)
      if (selectedCategory) params.set('categoryId', selectedCategory)
      if (currentBranch?.id) params.set('branchId', currentBranch.id)
      const res = await fetch(`/api/pos/products?${params.toString()}`)
      if (!res.ok) throw new Error('Error fetching products')
      return res.json() as Promise<{ products: ProductItem[] }>
    },
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['pos-categories'],
    queryFn: async () => {
      const res = await fetch('/api/pos/products')
      if (!res.ok) throw new Error('Error fetching categories')
      const data = await res.json() as { products: ProductItem[] }
      const cats = new Map<string, { id: string; name: string; color: string | null }>()
      data.products.forEach((p) => {
        if (!cats.has(p.category.id)) {
          cats.set(p.category.id, { id: p.category.id, name: p.category.name, color: p.category.color })
        }
      })
      return Array.from(cats.values())
    },
  })

  const { data: clientsData } = useQuery({
    queryKey: ['pos-clients', clientSearchTerm],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (clientSearchTerm) params.set('search', clientSearchTerm)
      const res = await fetch(`/api/pos/clients?${params.toString()}`)
      if (!res.ok) throw new Error('Error fetching clients')
      return res.json() as Promise<{ clients: ClientItem[] }>
    },
    enabled: clientSearchOpen,
  })

  // ---- Sale Mutation ----
  const saleMutation = useMutation({
    mutationFn: async (saleData: Record<string, unknown>) => {
      const res = await fetch('/api/pos/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Error al procesar la venta')
      }
      return res.json() as Promise<SaleResponse>
    },
    onSuccess: (data) => {
      setLastSale(data.sale)
      setReceiptDialogOpen(true)
      clearCart()
      setDiscountAmount(0)
      setCashReceived(0)
      setSelectedClient(null)
      setQrPaymentConfirmed(false)
      setContactlessPaymentConfirmed(false)
      queryClient.invalidateQueries({ queryKey: ['pos-products'] })
      toast.success('Venta completada', {
        description: `Folio: ${data.sale.folio} — ${formatMXN(data.sale.total)}`,
      })

      // Auto-print receipt if printer connected
      if (hw.printer.connected) {
        import('@/lib/hardware/printer').then(({ getPrinterService }) => {
          getPrinterService().printReceipt(data.sale).catch(() => {})
        }).catch(() => {})
      }

      // Auto-open cash drawer on cash payment
      if (data.sale.paymentMethod === 'EFECTIVO' && hw.cashDrawer.config.trigger) {
        hw.openCashDrawer().catch(() => {})
      }

      // Update customer display
      if (hw.customerDisplay.connected) {
        import('@/lib/hardware/customer-display').then(({ getCustomerDisplayService }) => {
          getCustomerDisplayService().showTotal(data.sale.total)
        }).catch(() => {})
      }
    },
    onError: (error) => {
      // If offline, save sale to offline queue
      if (!isOnline() || error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError') || error.message?.includes('Network request failed')) {
        const saleData = saleMutation.variables as Record<string, unknown>
        if (saleData) {
          addToOfflineQueue({
            url: '/api/pos/sale',
            method: 'POST',
            body: saleData,
          })
          // Still treat as success for the UI - clear cart etc.
          setLastSale({
            id: `offline-${Date.now()}`,
            folio: `PEND-${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`,
            subtotal: subtotal,
            tax: tax,
            taxRate: taxRate,
            discount: discountAmount,
            total: total,
            paymentMethod: saleData.paymentMethod as string || 'EFECTIVO',
            cashReceived: saleData.cashReceived as number | null,
            change: saleData.cashReceived ? Math.max(0, (saleData.cashReceived as number) - total) : null,
            createdAt: new Date().toISOString(),
            items: (saleData.items as Array<Record<string, unknown>>)?.map((i) => ({
              id: `offline-item-${Date.now()}`,
              productId: i.productId as string,
              quantity: i.quantity as number,
              unitPrice: i.unitPrice as number,
              discount: i.discount as number,
              total: (i.quantity as number) * (i.unitPrice as number) * (1 - (i.discount as number) / 100),
              product: { id: i.productId as string, name: '', sku: '' },
            })) || [],
            client: null,
            branch: { id: saleData.branchId as string || 'branch-centro', name: 'Sucursal', code: 'CTR' },
            user: { id: saleData.userId as string || 'demo-admin', name: 'Usuario' },
          })
          setReceiptDialogOpen(true)
          clearCart()
          setDiscountAmount(0)
          setCashReceived(0)
          setSelectedClient(null)
          setQrPaymentConfirmed(false)
          setContactlessPaymentConfirmed(false)
          getOfflineQueue().then(q => setOfflinePendingCount(q.length))
          toast.warning('Venta guardada localmente', {
            description: 'Se sincronizará cuando vuelva la conexión',
            duration: 5000,
            icon: <WifiOff className="size-4" />,
          })
          return
        }
      }
      toast.error('Error al procesar venta', {
        description: error.message,
      })
    },
  })

  // ---- Computed Values ----
  const subtotal = cart.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice * (1 - item.discount / 100),
    0
  )
  const taxRate = includeIva ? 0.16 : 0
  const tax = subtotal * taxRate
  const total = subtotal + tax - discountAmount
  const change = paymentMethod === 'EFECTIVO' && cashReceived > 0 ? Math.max(0, cashReceived - total) : 0

  // Get active QR/contactless providers for showing payment method options
  const activeQrProviders = loadPaymentProviders().filter(p => p.enabled && p.type === 'qr')
  const activeContactlessProviders = loadPaymentProviders().filter(p => p.enabled && p.type === 'contactless')

  // ---- Handlers ----
  const handleAddProduct = useCallback(
    (product: ProductItem) => {
      if (product.outOfStock) {
        toast.error('Producto agotado', { description: product.name })
        return
      }
      const existingItem = cart.find((ci) => ci.productId === product.id)
      const currentQty = existingItem?.quantity || 0
      if (product.trackStock && currentQty + 1 > product.stock) {
        toast.warning('Stock insuficiente', {
          description: `Solo quedan ${product.stock} unidades de ${product.name}`,
        })
        return
      }

      const cartItem: CartItem = {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        quantity: 1,
        unitPrice: product.salePrice,
        discount: 0,
        total: product.salePrice,
      }
      addToCart(cartItem)
      toast.success('Producto añadido', {
        description: `${product.name} — ${formatMXN(product.salePrice)}`,
        duration: 1500,
      })
    },
    [addToCart, cart]
  )

  const handleCharge = useCallback(() => {
    if (cart.length === 0) {
      toast.error('Carrito vacío', { description: 'Agrega productos al carrito' })
      return
    }
    if (paymentMethod === 'EFECTIVO' && cashReceived < total) {
      toast.error('Efectivo insuficiente', {
        description: `Faltan ${formatMXN(total - cashReceived)}`,
      })
      return
    }
    if (paymentMethod === 'QR' && !qrPaymentConfirmed) {
      setQrDialogOpen(true)
      return
    }
    if (paymentMethod === 'CONTACTLESS' && !contactlessPaymentConfirmed) {
      setContactlessDialogOpen(true)
      return
    }
    if (paymentMethod === 'CREDITO' && selectedClient) {
      const availableCredit = selectedClient.creditLimit - selectedClient.creditUsed
      if (total > availableCredit) {
        toast.error('Crédito insuficiente', {
          description: `Crédito disponible: ${formatMXN(availableCredit)}`,
        })
        return
      }
    }

    // Map payment method for backend
    let backendPaymentMethod = paymentMethod
    if (paymentMethod === 'QR' || paymentMethod === 'CONTACTLESS') {
      backendPaymentMethod = 'TARJETA' // QR/Contactless map to card payment in the backend
    }

    saleMutation.mutate({
      items: cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
      })),
      clientId: selectedClient?.id || null,
      paymentMethod: backendPaymentMethod,
      cashReceived: paymentMethod === 'EFECTIVO' ? cashReceived : null,
      discount: discountAmount,
      branchId: currentBranch?.id || 'branch-centro',
      userId: currentUser?.id || 'demo-admin',
      includeIva,
      paymentSubtype: paymentMethod, // Pass original method for receipt
    })
  }, [cart, paymentMethod, cashReceived, total, discountAmount, selectedClient, currentBranch, currentUser, includeIva, saleMutation, qrPaymentConfirmed, contactlessPaymentConfirmed])

  const handleClearCart = useCallback(() => {
    clearCart()
    setDiscountAmount(0)
    setCashReceived(0)
    setQrPaymentConfirmed(false)
    setContactlessPaymentConfirmed(false)
    toast.info('Carrito vaciado')
  }, [clearCart])

  // ---- USB HID Barcode Scanner Integration ----
  // Start listening for barcode scanner input when POS is active
  useEffect(() => {
    if (hw.scanner.listening) {
      const scannerCallback = (code: string) => {
        // When a barcode is scanned, search for the product and add to cart
        setSearchTerm(code)
        toast.info('Código escaneado', { description: code, duration: 2000 })
      }

      // Register callback with hardware store
      const unsub = useHardwareStore.subscribe((state, prev) => {
        if (state.scanner.lastCodes !== prev.scanner.lastCodes && state.scanner.lastCodes.length > 0) {
          const newCode = state.scanner.lastCodes[0]
          if (newCode !== prev.scanner.lastCodes[0]) {
            scannerCallback(newCode)
          }
        }
      })

      return unsub
    }
  }, [hw.scanner.listening])

  // ---- Customer Display Update ----
  // Update customer display when cart changes
  useEffect(() => {
    if (hw.customerDisplay.connected) {
      import('@/lib/hardware/customer-display').then(({ getCustomerDisplayService }) => {
        const display = getCustomerDisplayService()
        if (cart.length > 0) {
          display.showItems(
            cart.map(item => ({ name: item.name, quantity: item.quantity, price: item.unitPrice, total: item.total })),
            total
          )
        } else {
          display.showWelcome()
        }
      }).catch(() => {})
    }
  }, [cart, total, hw.customerDisplay.connected])

  // ---- Keyboard Shortcuts ----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      if (e.key === 'F4') {
        e.preventDefault()
        handleCharge()
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClearCart()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleCharge, handleClearCart])

  // ---- Get categories from products data ----
  const categories = (() => {
    if (!productsData?.products) return []
    const cats = new Map<string, { id: string; name: string; color: string | null }>()
    productsData.products.forEach((p) => {
      if (!cats.has(p.category.id)) {
        cats.set(p.category.id, { id: p.category.id, name: p.category.name, color: p.category.color })
      }
    })
    return Array.from(cats.values())
  })()

  const filteredProducts = productsData?.products || []

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0">
      {/* ====== LEFT PANEL - Product Grid ====== */}
      <div className="flex-1 flex flex-col min-w-0 lg:border-r">
        {/* Hardware & Connection Status Bar */}
        {(hw.printer.connected || hw.scanner.listening || hw.customerDisplay.connected || hw.cashDrawer.config.trigger || !connectionOnline || offlinePendingCount > 0) && (
          <div className="flex items-center gap-3 px-3 py-1.5 border-b bg-muted/50 text-[10px] text-muted-foreground">
            {!connectionOnline && (
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <WifiOff className="size-3" />
                <span className="font-medium">Sin conexión</span>
              </div>
            )}
            {connectionOnline && offlinePendingCount > 0 && (
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>{offlinePendingCount} pendiente{offlinePendingCount > 1 ? 's' : ''} de sync</span>
              </div>
            )}
            {hw.printer.connected && (
              <div className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span>Impresora</span>
              </div>
            )}
            {hw.scanner.listening && (
              <div className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Escáner activo</span>
              </div>
            )}
            {hw.customerDisplay.connected && (
              <div className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span>Display cliente</span>
              </div>
            )}
            {hw.cashDrawer.config.trigger && (
              <div className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span>Caja</span>
              </div>
            )}
          </div>
        )}
        {/* Search Bar */}
        <div className="p-3 border-b bg-background/95">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Buscar producto, SKU o código de barras... (F2)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-10 h-10 text-sm"
            />
            <ScanBarcode className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          </div>
          {/* Category Pills */}
          <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
            <Button
              variant={selectedCategory === '' ? 'default' : 'outline'}
              size="sm"
              className="shrink-0 h-7 text-xs rounded-full"
              onClick={() => setSelectedCategory('')}
            >
              Todos
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                className="shrink-0 h-7 text-xs rounded-full"
                style={
                  selectedCategory === cat.id
                    ? { backgroundColor: getCategoryColor(cat.color), borderColor: getCategoryColor(cat.color) }
                    : {}
                }
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {productsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="h-32 rounded-lg bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Package className="size-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">No se encontraron productos</p>
              <p className="text-xs mt-1">Intenta con otro término de búsqueda</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              <AnimatePresence mode="popLayout">
                {filteredProducts.map((product) => (
                  <motion.button
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className={`group relative flex flex-col rounded-lg border bg-card p-2.5 text-left transition-all hover:shadow-md hover:border-primary/30 active:scale-[0.97] ${
                      product.outOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                    onClick={() => handleAddProduct(product)}
                    disabled={product.outOfStock}
                  >
                    <div
                      className="w-full aspect-square rounded-md flex items-center justify-center text-white font-bold text-xl mb-2"
                      style={{ backgroundColor: getCategoryColor(product.category.color) + '30', color: getCategoryColor(product.category.color) }}
                    >
                      {getProductInitial(product.name)}
                    </div>
                    <p className="text-xs font-medium truncate leading-tight">
                      {product.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {product.sku}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-sm font-bold text-foreground">
                        {formatMXN(product.salePrice)}
                      </p>
                      <div className="flex items-center gap-1">
                        {product.outOfStock ? (
                          <span className="size-2 rounded-full bg-red-500" title="Agotado" />
                        ) : product.lowStock ? (
                          <span className="size-2 rounded-full bg-amber-500" title="Stock bajo" />
                        ) : (
                          <span className="size-2 rounded-full bg-emerald-500" title="Disponible" />
                        )}
                        {product.trackStock && (
                          <span className="text-[10px] text-muted-foreground">{product.stock}</span>
                        )}
                      </div>
                    </div>
                    <div className="absolute inset-0 rounded-lg bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* ====== RIGHT PANEL - Cart & Checkout ====== */}
      <div className="w-full lg:w-[380px] xl:w-[420px] flex flex-col bg-card border-t lg:border-t-0 shrink-0">
        {/* Cart Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <ShoppingCart className="size-4 text-primary" />
            <h2 className="text-sm font-bold tracking-tight">Ticket de Venta</h2>
            {cart.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </Badge>
            )}
          </div>
          {cart.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleClearCart}
            >
              <Trash2 className="size-3 mr-1" />
              Limpiar
            </Button>
          )}
        </div>

        {/* Cart Items */}
        <ScrollArea className="flex-1 max-h-[280px] lg:max-h-none">
          <div className="p-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <ShoppingCart className="size-8 mb-2 opacity-20" />
                <p className="text-xs">Carrito vacío</p>
                <p className="text-[10px] mt-0.5">Haz clic en un producto para agregarlo</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {cart.map((item) => (
                  <motion.div
                    key={item.productId}
                    initial={{ opacity: 0, x: 20, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-start gap-2 py-2 border-b last:border-b-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatMXN(item.unitPrice)} × {item.quantity}
                        {item.discount > 0 && (
                          <span className="text-amber-500 ml-1">-{item.discount}%</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-6"
                        onClick={() =>
                          item.quantity > 1
                            ? updateCartQuantity(item.productId, item.quantity - 1)
                            : removeFromCart(item.productId)
                        }
                      >
                        {item.quantity > 1 ? <Minus className="size-3" /> : <X className="size-3" />}
                      </Button>
                      <span className="w-7 text-center text-xs font-semibold">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-6"
                        onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                    <p className="text-xs font-semibold w-20 text-right shrink-0">
                      {formatMXN(item.total)}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => removeFromCart(item.productId)}
                    >
                      <X className="size-3" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>

        {/* Cart Summary & Controls */}
        <div className="border-t p-3 space-y-3">
          {/* Subtotal */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMXN(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Switch
                  id="iva-toggle"
                  checked={includeIva}
                  onCheckedChange={setIncludeIva}
                  className="scale-75 origin-left"
                />
                <Label htmlFor="iva-toggle" className="text-muted-foreground cursor-pointer text-xs">
                  IVA (16%)
                </Label>
              </div>
              <span>{formatMXN(tax)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-amber-500 font-medium">Descuento</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">$</span>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="w-20 h-6 text-xs text-right px-1.5"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Total */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">TOTAL</span>
            <span className="text-xl font-bold tracking-tight">
              {formatMXN(total)}
            </span>
          </div>

          {/* Client Section */}
          <div className="space-y-1.5">
            <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                >
                  <User className="size-3.5 mr-1.5 shrink-0" />
                  {selectedClient ? (
                    <span className="truncate">{selectedClient.name}</span>
                  ) : (
                    <span className="text-muted-foreground">Cliente General</span>
                  )}
                  <ChevronDown className="size-3 ml-auto shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[340px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Buscar cliente por nombre, RFC, teléfono..."
                    value={clientSearchTerm}
                    onValueChange={setClientSearchTerm}
                  />
                  <CommandList>
                    <CommandEmpty>No se encontraron clientes</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setSelectedClient(null)
                          setClientSearchOpen(false)
                          setClientSearchTerm('')
                        }}
                        className="text-xs"
                      >
                        <User className="size-3.5 mr-2" />
                        <span>Cliente General</span>
                      </CommandItem>
                      {clientsData?.clients.map((client) => (
                        <CommandItem
                          key={client.id}
                          onSelect={() => {
                            setSelectedClient(client)
                            setClientSearchOpen(false)
                            setClientSearchTerm('')
                          }}
                          className="text-xs"
                        >
                          <User className="size-3.5 mr-2" />
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium">{client.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {client.rfc && `${client.rfc} · `}
                              {client.type}
                              {client.creditLimit > 0 && ` · Crédito: ${formatMXN(client.creditLimit - client.creditUsed)}`}
                            </p>
                          </div>
                          {client.points > 0 && (
                            <Badge variant="secondary" className="text-[10px] ml-1">
                              {client.points} pts
                            </Badge>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedClient && (
              <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
                <span>{selectedClient.rfc || 'Sin RFC'}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 text-[10px] text-destructive px-1"
                  onClick={() => setSelectedClient(null)}
                >
                  Cambiar
                </Button>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Método de pago
            </p>
            <div className="grid grid-cols-3 gap-1">
              {paymentMethods.map((pm) => {
                const Icon = pm.icon
                const isActive = paymentMethod === pm.value
                // Hide QR if no providers enabled
                if (pm.value === 'QR' && activeQrProviders.length === 0) return null
                if (pm.value === 'CONTACTLESS' && activeContactlessProviders.length === 0) return null

                return (
                  <Button
                    key={pm.value}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    className={`h-9 text-[10px] flex-col gap-0.5 p-1 ${
                      isActive
                        ? pm.value === 'QR'
                          ? 'bg-violet-600 hover:bg-violet-700 text-white'
                          : pm.value === 'CONTACTLESS'
                            ? 'bg-sky-600 hover:bg-sky-700 text-white'
                            : 'bg-primary text-primary-foreground'
                        : ''
                    }`}
                    onClick={() => {
                      setPaymentMethod(pm.value)
                      if (pm.value === 'QR') {
                        setQrPaymentConfirmed(false)
                      }
                      if (pm.value === 'CONTACTLESS') {
                        setContactlessPaymentConfirmed(false)
                      }
                    }}
                  >
                    <Icon className="size-3.5" />
                    <span>{pm.label}</span>
                  </Button>
                )
              })}
            </div>
          </div>

          {/* QR Payment indicator */}
          {paymentMethod === 'QR' && qrPaymentConfirmed && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800">
              <Check className="size-4 text-violet-600" />
              <span className="text-xs text-violet-700 dark:text-violet-400 font-medium">Pago QR confirmado</span>
            </div>
          )}

          {/* Contactless Payment indicator */}
          {paymentMethod === 'CONTACTLESS' && contactlessPaymentConfirmed && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800">
              <Check className="size-4 text-sky-600" />
              <span className="text-xs text-sky-700 dark:text-sky-400 font-medium">Pago contactless aprobado</span>
            </div>
          )}

          {/* Cash Received (only for EFECTIVO) */}
          {paymentMethod === 'EFECTIVO' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs text-muted-foreground shrink-0">Recibe</Label>
                <div className="flex items-center gap-1 flex-1 justify-end">
                  <span className="text-xs text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={cashReceived || ''}
                    onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                    className="w-28 h-7 text-xs text-right px-2"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>
              {cashReceived > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Cambio</span>
                  <span className={`font-bold ${change >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                    {formatMXN(change)}
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {/* Charge Button */}
          <Button
            className={`w-full h-12 text-sm font-bold text-white ${
              paymentMethod === 'QR'
                ? 'bg-violet-600 hover:bg-violet-700'
                : paymentMethod === 'CONTACTLESS'
                  ? 'bg-sky-600 hover:bg-sky-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
            size="lg"
            onClick={handleCharge}
            disabled={cart.length === 0 || saleMutation.isPending}
          >
            {saleMutation.isPending ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : paymentMethod === 'QR' ? (
              <QrCode className="size-4 mr-2" />
            ) : paymentMethod === 'CONTACTLESS' ? (
              <Wifi className="size-4 mr-2" />
            ) : (
              <Receipt className="size-4 mr-2" />
            )}
            {paymentMethod === 'QR'
              ? `Cobrar con QR ${formatMXN(total)}`
              : paymentMethod === 'CONTACTLESS'
                ? `Cobrar Contactless ${formatMXN(total)}`
                : `Cobrar ${formatMXN(total)}`
            }
            <span className="ml-2 text-[10px] opacity-70">F4</span>
          </Button>
        </div>
      </div>

      {/* ====== QR Payment Dialog ====== */}
      <QRPaymentDialog
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
        total={total}
        onComplete={(providerId) => {
          setQrPaymentConfirmed(true)
          toast.success('Pago QR verificado', {
            description: `Proveedor: ${providerId}`,
          })
        }}
      />

      {/* ====== Contactless Payment Dialog ====== */}
      <ContactlessPaymentDialog
        open={contactlessDialogOpen}
        onOpenChange={setContactlessDialogOpen}
        total={total}
        onComplete={(providerId) => {
          setContactlessPaymentConfirmed(true)
          toast.success('Pago contactless aprobado', {
            description: `Terminal: ${providerId}`,
          })
        }}
      />

      {/* ====== Receipt Dialog ====== */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              ¡Venta Completada!
            </DialogTitle>
          </DialogHeader>
          {lastSale && (
            <div className="space-y-4">
              <div className="text-center border-b pb-3">
                <p className="text-lg font-bold">{lastSale.branch.name}</p>
                <p className="text-xs text-muted-foreground">Folio: {lastSale.folio}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(lastSale.createdAt).toLocaleString('es-MX')}
                </p>
              </div>

              {lastSale.client && (
                <div className="text-xs">
                  <p className="font-medium">Cliente: {lastSale.client.name}</p>
                  {lastSale.client.rfc && (
                    <p className="text-muted-foreground">RFC: {lastSale.client.rfc}</p>
                  )}
                </div>
              )}

              <div className="space-y-1">
                {lastSale.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs">
                    <span className="flex-1 truncate">
                      {item.product.name} × {item.quantity}
                    </span>
                    <span className="font-medium ml-2">
                      {formatMXN(item.total)}
                    </span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatMXN(lastSale.subtotal)}</span>
                </div>
                {lastSale.taxRate > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IVA ({(lastSale.taxRate * 100).toFixed(0)}%)</span>
                    <span>{formatMXN(lastSale.tax)}</span>
                  </div>
                )}
                {lastSale.discount > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Descuento</span>
                    <span>-{formatMXN(lastSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-1 border-t">
                  <span>Total</span>
                  <span>{formatMXN(lastSale.total)}</span>
                </div>
                {lastSale.paymentMethod === 'EFECTIVO' && lastSale.cashReceived != null && (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Efectivo recibido</span>
                      <span>{formatMXN(lastSale.cashReceived)}</span>
                    </div>
                    {lastSale.change != null && lastSale.change > 0 && (
                      <div className="flex justify-between text-emerald-600 font-medium">
                        <span>Cambio</span>
                        <span>{formatMXN(lastSale.change)}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between text-muted-foreground pt-1">
                  <span>Pago</span>
                  <span>{lastSale.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Cajero</span>
                  <span>{lastSale.user.name}</span>
                </div>
              </div>

              {lastSale.client?.rfc && (
                <div className="bg-muted/50 rounded-md p-3 text-center">
                  <FileText className="size-4 mx-auto mb-1 text-primary" />
                  <p className="text-xs font-medium">Factura CFDI disponible</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Generar CFDI 4.0 para esta venta
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-col gap-2">
            <div className="flex gap-2 w-full">
              {hw.printer.connected && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (lastSale) {
                      import('@/lib/hardware/printer').then(({ getPrinterService }) => {
                        getPrinterService().printReceipt(lastSale)
                        toast.success('Imprimiendo ticket...')
                      }).catch(() => toast.error('Error al imprimir'))
                    }
                  }}
                  className="flex-1 gap-1.5"
                >
                  <Receipt className="size-3.5" /> Reimprimir
                </Button>
              )}
              {hw.cashDrawer.config.trigger && (
                <Button
                  variant="outline"
                  onClick={() => hw.openCashDrawer()}
                  className="flex-1 gap-1.5"
                >
                  <Banknote className="size-3.5" /> Abrir Caja
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => setReceiptDialogOpen(false)}
              className="w-full"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
