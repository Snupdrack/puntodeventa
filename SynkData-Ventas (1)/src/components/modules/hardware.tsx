'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Printer, ScanBarcode, Fingerprint, Archive, Monitor, Scale,
  Cpu, Loader2, CheckCircle2, XCircle, AlertCircle, Cable,
  Camera, Keyboard, Usb, Radio, Trash2, Plus, Volume2,
  Eye, ExternalLink, ArrowRightLeft, Save, TestTube,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useHardwareStore } from '@/lib/hardware/store'

// ---- Status indicator ----
function StatusDot({ connected, connecting }: { connected: boolean; connecting?: boolean }) {
  return (
    <span
      className={`inline-block size-2.5 rounded-full shrink-0 ${
        connected
          ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
          : connecting
            ? 'bg-amber-500 animate-pulse shadow-[0_0_6px_rgba(245,158,11,0.5)]'
            : 'bg-red-400'
      }`}
    />
  )
}

// ---- Browser support warning ----
function BrowserSupportWarning({ feature }: { feature: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
      <AlertCircle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
        <p className="font-medium">{feature} no disponible</p>
        <p>Se requiere un navegador compatible con Web Serial API (Chrome, Edge u Opera). Safari y Firefox no son compatibles actualmente.</p>
        <p>Asegúrate de usar HTTPS o localhost para acceder a las APIs de hardware.</p>
      </div>
    </div>
  )
}

// ---- Tab 1: Impresora Térmica ----
function PrinterTab() {
  const { printer, connectPrinter, disconnectPrinter, updatePrinterConfig, printTestPage } = useHardwareStore()
  const [connecting, setConnecting] = useState(false)
  const serialSupported = typeof navigator !== 'undefined' && 'serial' in navigator

  const handleConnect = async () => {
    if (!serialSupported) {
      toast.error('Web Serial API no soportada en este navegador')
      return
    }
    setConnecting(true)
    try {
      const port = await navigator.serial.requestPort()
      await connectPrinter(port)
      toast.success('Impresora conectada')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar'
      if (!msg.includes('No port selected')) {
        toast.error('Error al conectar impresora', { description: msg })
      }
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = () => {
    disconnectPrinter()
    toast.info('Impresora desconectada')
  }

  const handleTestPrint = async () => {
    try {
      await printTestPage()
      toast.success('Página de prueba enviada')
    } catch {
      toast.error('Error al imprimir página de prueba')
    }
  }

  const handlePrintLast = async () => {
    try {
      const { printLastReceipt } = useHardwareStore.getState()
      await printLastReceipt()
      toast.success('Último ticket enviado a impresora')
    } catch {
      toast.error('Error al imprimir ticket')
    }
  }

  const c = printer.config

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
              <Printer className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">Impresora Térmica</CardTitle>
              <CardDescription>Conecta y configura tu impresora de tickets</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <StatusDot connected={printer.connected} connecting={connecting} />
              <Badge className={`text-[10px] ${printer.connected ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                {printer.connected ? 'Conectada' : 'Desconectada'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!serialSupported && <BrowserSupportWarning feature="Conexión de impresora" />}

          {/* Connection buttons */}
          <div className="flex gap-2">
            {!printer.connected ? (
              <Button onClick={handleConnect} disabled={connecting || !serialSupported} className="gap-2">
                {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cable className="w-4 h-4" />}
                Conectar impresora
              </Button>
            ) : (
              <Button variant="outline" onClick={handleDisconnect} className="gap-2">
                <XCircle className="w-4 h-4 text-red-500" /> Desconectar
              </Button>
            )}
            {printer.connected && (
              <>
                <Button variant="outline" onClick={handleTestPrint} className="gap-2">
                  <TestTube className="w-4 h-4" /> Página de prueba
                </Button>
                <Button variant="outline" onClick={handlePrintLast} className="gap-2">
                  <Printer className="w-4 h-4" /> Último ticket
                </Button>
              </>
            )}
          </div>

          {printer.connected && (
            <p className="text-xs text-muted-foreground">
              Dispositivo: {printer.name || 'Impresora conectada'}
            </p>
          )}

          <Separator />

          {/* Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-xs">Tipo de impresora</Label>
              <Select value={c.type} onValueChange={(v) => updatePrinterConfig({ type: v as 'thermal' | 'label' | 'matrix' })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="thermal">Térmica</SelectItem>
                  <SelectItem value="label">Etiqueta</SelectItem>
                  <SelectItem value="matrix">Matricial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Ancho de papel</Label>
              <Select value={String(c.width)} onValueChange={(v) => updatePrinterConfig({ width: Number(v) as 58 | 80 })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="58">58mm</SelectItem>
                  <SelectItem value="80">80mm</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Juego de caracteres</Label>
              <Select value={c.charset} onValueChange={(v) => updatePrinterConfig({ charset: v as 'UTF-8' | 'CP850' })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTF-8">UTF-8</SelectItem>
                  <SelectItem value="CP850">CP850</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Baud Rate</Label>
              <Select value={String(c.baudRate)} onValueChange={(v) => updatePrinterConfig({ baudRate: Number(v) })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="9600">9600</SelectItem>
                  <SelectItem value="19200">19200</SelectItem>
                  <SelectItem value="38400">38400</SelectItem>
                  <SelectItem value="57600">57600</SelectItem>
                  <SelectItem value="115200">115200</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Copias</Label>
              <Input type="number" min={1} max={5} value={c.copies} onChange={(e) => updatePrinterConfig({ copies: Number(e.target.value) || 1 })} className="w-20" />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Switch checked={c.cutPaper} onCheckedChange={(v) => updatePrinterConfig({ cutPaper: v })} />
              <Label className="text-xs">Cortar papel automáticamente</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={c.openDrawer} onCheckedChange={(v) => updatePrinterConfig({ openDrawer: v })} />
              <Label className="text-xs">Abrir caja al imprimir</Label>
            </div>
          </div>

          <Separator />

          {/* Receipt preview */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Vista previa del ticket</Label>
            <div className="bg-white dark:bg-slate-900 rounded-lg border p-4 font-mono text-[11px] leading-snug text-slate-900 dark:text-slate-100 max-w-[320px]">
              <p className="text-center font-bold text-sm">Sucursal Centro</p>
              <p className="text-center">TICKET DE VENTA</p>
              <p className="border-b border-dashed border-slate-300 dark:border-slate-700 my-1" />
              <p>Folio: V-000001</p>
              <p>Fecha: {new Date().toLocaleDateString('es-MX')}</p>
              <p>Cajero: Admin</p>
              <p className="border-b border-dashed border-slate-300 dark:border-slate-700 my-1" />
              <p className="font-bold">Coca-Cola 600ml</p>
              <p className="flex justify-between"><span>1 x $18.00</span><span>$18.00</span></p>
              <p className="font-bold">Sabritas 150g</p>
              <p className="flex justify-between"><span>2 x $22.00</span><span>$44.00</span></p>
              <p className="border-b border-dashed border-slate-300 dark:border-slate-700 my-1" />
              <p className="flex justify-between"><span>Subtotal:</span><span>$62.00</span></p>
              <p className="flex justify-between"><span>IVA (16%):</span><span>$9.92</span></p>
              <p className="flex justify-between font-bold text-sm"><span>TOTAL:</span><span>$71.92</span></p>
              <p className="border-b border-dashed border-slate-300 dark:border-slate-700 my-1" />
              <p className="text-center mt-1">Gracias por su compra</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---- Tab 2: Escáner de Códigos ----
function ScannerTab() {
  const { scanner, connectScanner, disconnectScanner, updateScannerConfig, addScannedCode } = useHardwareStore()
  const [cameraActive, setCameraActive] = useState(false)
  const [testCode, setTestCode] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)

  const c = scanner.config

  const handleConnect = () => {
    connectScanner()
    toast.success('Escáner activado', { description: `Modo: ${c.mode === 'usb_hid' ? 'USB HID' : c.mode === 'camera' ? 'Cámara' : 'Serial'}` })
  }

  const handleDisconnect = () => {
    disconnectScanner()
    setCameraActive(false)
    toast.info('Escáner desactivado')
  }

  const handleStartCamera = async () => {
    if (!videoRef.current) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: c.cameraFacing }
      })
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setCameraActive(true)
      connectScanner()
      toast.success('Cámara activada para escaneo')
    } catch {
      toast.error('No se pudo acceder a la cámara')
    }
  }

  const handleStopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
    disconnectScanner()
  }

  const handleTestScan = () => {
    if (testCode.trim()) {
      addScannedCode(testCode.trim())
      toast.success('Código escaneado (simulado)', { description: testCode })
      setTestCode('')
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <ScanBarcode className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">Escáner de Códigos</CardTitle>
              <CardDescription>Configura tu lector de código de barras</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <StatusDot connected={scanner.connected} />
              <Badge className={`text-[10px] ${scanner.listening ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                {scanner.listening ? 'Escuchando...' : 'Inactivo'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode selector */}
          <div className="grid gap-2">
            <Label className="text-xs">Modo de escaneo</Label>
            <Select value={c.mode} onValueChange={(v) => updateScannerConfig({ mode: v as 'usb_hid' | 'camera' | 'serial' })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="usb_hid">
                  <div className="flex items-center gap-2"><Keyboard className="w-4 h-4" /> USB HID (Teclado)</div>
                </SelectItem>
                <SelectItem value="camera">
                  <div className="flex items-center gap-2"><Camera className="w-4 h-4" /> Cámara Web</div>
                </SelectItem>
                <SelectItem value="serial">
                  <div className="flex items-center gap-2"><Cable className="w-4 h-4" /> Puerto Serial</div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* USB HID mode */}
          {c.mode === 'usb_hid' && (
            <div className="space-y-3">
              {!scanner.connected ? (
                <Button onClick={handleConnect} className="gap-2 w-full">
                  <Keyboard className="w-4 h-4" /> Activar escucha USB HID
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm text-emerald-700 dark:text-emerald-300">Escuchando códigos de barras...</span>
                  </div>
                  <Button variant="outline" onClick={handleDisconnect} className="gap-2">
                    <XCircle className="w-4 h-4 text-red-500" /> Detener escucha
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                La mayoría de los escáners de código de barras funcionan como teclados USB. Escanea un código y se detectará automáticamente.
              </p>
            </div>
          )}

          {/* Camera mode */}
          {c.mode === 'camera' && (
            <div className="space-y-3">
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video max-w-sm">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                {!cameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Camera className="size-12 text-white/30" />
                  </div>
                )}
                {/* Scan overlay */}
                {cameraActive && (
                  <div className="absolute inset-4 border-2 border-teal-400/50 rounded-lg flex items-center justify-center">
                    <div className="w-3/4 h-0.5 bg-teal-400 animate-pulse" />
                  </div>
                )}
              </div>
              {!cameraActive ? (
                <Button onClick={handleStartCamera} className="gap-2 w-full">
                  <Camera className="w-4 h-4" /> Iniciar cámara
                </Button>
              ) : (
                <Button variant="outline" onClick={handleStopCamera} className="gap-2 w-full">
                  <XCircle className="w-4 h-4 text-red-500" /> Detener cámara
                </Button>
              )}
            </div>
          )}

          {/* Configuration */}
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-xs">Prefijo</Label>
              <Input value={c.prefix} onChange={(e) => updateScannerConfig({ prefix: e.target.value })} placeholder="Ej: [" className="text-xs" />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Sufijo</Label>
              <Input value={c.suffix} onChange={(e) => updateScannerConfig({ suffix: e.target.value })} placeholder="Ej: ]" className="text-xs" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={c.beepOnScan} onCheckedChange={(v) => updateScannerConfig({ beepOnScan: v })} />
            <Label className="text-xs flex items-center gap-1.5"><Volume2 className="w-3.5 h-3.5" /> Beep al escanear</Label>
          </div>

          {c.mode === 'camera' && (
            <div className="grid gap-2">
              <Label className="text-xs">Cámara</Label>
              <Select value={c.cameraFacing} onValueChange={(v) => updateScannerConfig({ cameraFacing: v as 'environment' | 'user' })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="environment">Trasera</SelectItem>
                  <SelectItem value="user">Frontal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Test scanner */}
          <Separator />
          <div>
            <Label className="text-xs font-medium mb-2 block">Probar escáner</Label>
            <div className="flex gap-2">
              <Input value={testCode} onChange={(e) => setTestCode(e.target.value)} placeholder="Escribe o pega un código de barras..." className="text-xs" onKeyDown={(e) => e.key === 'Enter' && handleTestScan()} />
              <Button onClick={handleTestScan} size="sm" className="gap-1.5 shrink-0">
                <ScanBarcode className="w-3.5 h-3.5" /> Simular
              </Button>
            </div>
          </div>

          {/* Last scanned codes */}
          {scanner.lastCodes.length > 0 && (
            <div>
              <Label className="text-xs font-medium mb-2 block">Últimos códigos escaneados</Label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {scanner.lastCodes.map((code, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/50">
                    <ScanBarcode className="w-3 h-3 text-muted-foreground" />
                    <span className="font-mono">{code}</span>
                    {i === 0 && <Badge className="text-[9px] ml-auto">Último</Badge>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ---- Tab 3: Lector de Huella ----
function FingerprintTab() {
  const { fingerprint, updateFingerprintConfig, registerFingerprint, testFingerprint, deleteFingerprint, checkFingerprintAvailable } = useHardwareStore()
  const [registering, setRegistering] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; userId?: string; error?: string } | null>(null)
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false)
  const [registerUserId, setRegisterUserId] = useState('')

  const c = fingerprint.config
  const webAuthnSupported = typeof window !== 'undefined' && !!window.PublicKeyCredential

  useEffect(() => {
    checkFingerprintAvailable()
  }, [checkFingerprintAvailable])

  const handleRegister = async () => {
    if (!registerUserId.trim()) {
      toast.error('Ingresa un identificador de usuario')
      return
    }
    setRegistering(true)
    const result = await registerFingerprint(registerUserId.trim())
    setRegistering(false)
    if (result.success) {
      toast.success('Huella registrada exitosamente')
      setRegisterDialogOpen(false)
      setRegisterUserId('')
    } else {
      toast.error('Error al registrar huella', { description: result.error })
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    const result = await testFingerprint()
    setTestResult(result)
    setTesting(false)
    if (result.success) {
      toast.success('Autenticación exitosa', { description: `Usuario: ${result.userId}` })
    } else {
      toast.error('Autenticación fallida', { description: result.error })
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/30">
              <Fingerprint className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">Lector de Huella</CardTitle>
              <CardDescription>Autenticación biométrica con WebAuthn</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <StatusDot connected={fingerprint.available} />
              <Badge className={`text-[10px] ${fingerprint.available ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                {fingerprint.available ? 'Disponible' : 'No disponible'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!webAuthnSupported && (
            <BrowserSupportWarning feature="WebAuthn / Huella digital" />
          )}

          {/* Availability check */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Fingerprint className={`size-5 ${fingerprint.available ? 'text-emerald-500' : 'text-muted-foreground'}`} />
            <div className="text-xs">
              <p className="font-medium">
                {fingerprint.available
                  ? 'Autenticador biométrico disponible'
                  : 'No se detectó autenticador biométrico'}
              </p>
              <p className="text-muted-foreground">
                {fingerprint.available
                  ? 'Tu dispositivo soporta login con huella o Face ID'
                  : 'Usa un dispositivo con lector de huella o Face ID'}
              </p>
            </div>
          </div>

          {/* Registered fingerprints */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium">Huellas registradas ({fingerprint.credentials.length})</Label>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setRegisterDialogOpen(true)} disabled={!fingerprint.available}>
                <Plus className="w-3 h-3" /> Registrar
              </Button>
            </div>
            {fingerprint.credentials.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-xs">
                <Fingerprint className="size-8 mx-auto mb-2 opacity-30" />
                <p>No hay huellas registradas</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {fingerprint.credentials.map((cred) => (
                  <div key={cred.credentialId} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 text-xs">
                    <div className="flex items-center gap-2">
                      <Fingerprint className="size-4 text-teal-600 dark:text-teal-400" />
                      <div>
                        <p className="font-medium">{cred.userId}</p>
                        <p className="text-muted-foreground">Registrada: {new Date(cred.createdAt).toLocaleDateString('es-MX')}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="size-7 text-red-500 hover:text-red-600" onClick={() => deleteFingerprint(cred.userId)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Switch checked={c.loginEnabled} onCheckedChange={(v) => updateFingerprintConfig({ loginEnabled: v })} />
              <div>
                <Label className="text-xs">Login con huella</Label>
                <p className="text-[10px] text-muted-foreground">Permitir iniciar sesión con huella digital</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={c.clockInEnabled} onCheckedChange={(v) => updateFingerprintConfig({ clockInEnabled: v })} />
              <div>
                <Label className="text-xs">Registro de asistencia con huella</Label>
                <p className="text-[10px] text-muted-foreground">Registrar entrada/salida con huella</p>
              </div>
            </div>
          </div>

          {/* Test */}
          <Separator />
          <div>
            <Label className="text-xs font-medium mb-2 block">Probar autenticación</Label>
            <Button onClick={handleTest} disabled={testing || !fingerprint.available || fingerprint.credentials.length === 0} className="gap-2">
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
              Probar autenticación
            </Button>
            {testResult && (
              <div className={`mt-2 p-2.5 rounded-lg text-xs flex items-center gap-2 ${testResult.success ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
                {testResult.success ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                {testResult.success ? `Autenticado como: ${testResult.userId}` : testResult.error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Register dialog */}
      <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Registrar Huella Digital</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-center py-4">
              <motion.div
                animate={registering ? { scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Fingerprint className="size-16 text-teal-600 dark:text-teal-400 mx-auto" />
              </motion.div>
              <p className="text-sm text-muted-foreground mt-3">
                {registering ? 'Coloca tu dedo en el sensor...' : 'Ingresa tu nombre de usuario y presiona registrar'}
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Identificador de usuario *</Label>
              <Input value={registerUserId} onChange={(e) => setRegisterUserId(e.target.value)} placeholder="Ej: admin, cajero1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegisterDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleRegister} disabled={registering || !registerUserId.trim()}>
              {registering && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Registrar huella
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---- Tab 4: Caja Registradora ----
function CashDrawerTab() {
  const { cashDrawer, openCashDrawer, updateCashDrawerConfig } = useHardwareStore()
  const [opening, setOpening] = useState(false)

  const c = cashDrawer.config

  const handleOpen = async () => {
    setOpening(true)
    const result = await openCashDrawer()
    setOpening(false)
    if (result.success) {
      toast.success('Caja registradora abierta')
    } else {
      toast.error('Error al abrir caja', { description: result.error })
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Archive className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">Caja Registradora</CardTitle>
              <CardDescription>Configura la apertura automática de la caja</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Trigger mode */}
          <div className="grid gap-2">
            <Label className="text-xs">Modo de activación</Label>
            <Select value={c.trigger} onValueChange={(v) => updateCashDrawerConfig({ trigger: v as 'printer' | 'serial' | 'usb' })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="printer">
                  <div className="flex items-center gap-2"><Printer className="w-4 h-4" /> Vía impresora</div>
                </SelectItem>
                <SelectItem value="serial">
                  <div className="flex items-center gap-2"><Cable className="w-4 h-4" /> Puerto Serial</div>
                </SelectItem>
                <SelectItem value="usb">
                  <div className="flex items-center gap-2"><Usb className="w-4 h-4" /> USB directo</div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {c.trigger === 'printer' && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 text-xs">
              <AlertCircle className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-muted-foreground">
                La caja se abrirá mediante la impresora térmica usando el comando ESC/POS de kick.
                Asegúrate de tener una impresora conectada.
              </p>
            </div>
          )}

          {/* Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-xs">Kick Code (hex)</Label>
              <Input value={c.kickCode} onChange={(e) => updateCashDrawerConfig({ kickCode: e.target.value })} placeholder="1B7000" className="font-mono text-xs" />
            </div>
            {c.trigger === 'serial' && (
              <div className="grid gap-2">
                <Label className="text-xs">Baud Rate</Label>
                <Select value={String(c.baudRate)} onValueChange={(v) => updateCashDrawerConfig({ baudRate: Number(v) })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9600">9600</SelectItem>
                    <SelectItem value="19200">19200</SelectItem>
                    <SelectItem value="38400">38400</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Auto open toggle */}
          <div className="flex items-center gap-3">
            <Switch checked={c.autoOpenOnSale} onCheckedChange={(v) => updateCashDrawerConfig({ autoOpenOnSale: v })} />
            <div>
              <Label className="text-xs">Abrir caja al cobrar</Label>
              <p className="text-[10px] text-muted-foreground">La caja se abre automáticamente al completar una venta</p>
            </div>
          </div>

          <Separator />

          {/* Test button */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Probar apertura</Label>
            <Button onClick={handleOpen} disabled={opening} className="gap-2">
              {opening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
              Abrir caja
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---- Tab 5: Display de Cliente ----
function CustomerDisplayTab() {
  const { customerDisplay, connectCustomerDisplay, disconnectCustomerDisplay, updateCustomerDisplayConfig, showCustomerDisplayPreview } = useHardwareStore()
  const c = customerDisplay.config

  const handleConnect = () => {
    connectCustomerDisplay()
    toast.success('Display de cliente activado')
  }

  const handleDisconnect = () => {
    disconnectCustomerDisplay()
    toast.info('Display de cliente desactivado')
  }

  const handlePreview = () => {
    showCustomerDisplayPreview()
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/30">
              <Monitor className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">Display de Cliente</CardTitle>
              <CardDescription>Pantalla secundaria para mostrar precios al cliente</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <StatusDot connected={customerDisplay.connected} />
              <Badge className={`text-[10px] ${customerDisplay.connected ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                {customerDisplay.connected ? 'Conectado' : 'Desconectado'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Type selector */}
          <div className="grid gap-2">
            <Label className="text-xs">Tipo de display</Label>
            <Select value={c.type} onValueChange={(v) => updateCustomerDisplayConfig({ type: v as 'serial' | 'browser_window' | 'presentation' })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="browser_window">
                  <div className="flex items-center gap-2"><Monitor className="w-4 h-4" /> Ventana del navegador</div>
                </SelectItem>
                <SelectItem value="serial">
                  <div className="flex items-center gap-2"><Cable className="w-4 h-4" /> Serial (EPSON DM-D110)</div>
                </SelectItem>
                <SelectItem value="presentation">
                  <div className="flex items-center gap-2"><ExternalLink className="w-4 h-4" /> Pantalla secundaria (Presentation API)</div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label className="text-xs">Baud Rate</Label>
              <Select value={String(c.baudRate)} onValueChange={(v) => updateCustomerDisplayConfig({ baudRate: Number(v) })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="9600">9600</SelectItem>
                  <SelectItem value="19200">19200</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Líneas</Label>
              <Input type="number" min={1} max={4} value={c.lines} onChange={(e) => updateCustomerDisplayConfig({ lines: Number(e.target.value) || 2 })} className="w-20" />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Columnas</Label>
              <Input type="number" min={16} max={40} value={c.columns} onChange={(e) => updateCustomerDisplayConfig({ columns: Number(e.target.value) || 20 })} className="w-20" />
            </div>
          </div>

          {/* Connection buttons */}
          <div className="flex gap-2">
            {!customerDisplay.connected ? (
              <Button onClick={handleConnect} className="gap-2">
                <Monitor className="w-4 h-4" /> Activar display
              </Button>
            ) : (
              <Button variant="outline" onClick={handleDisconnect} className="gap-2">
                <XCircle className="w-4 h-4 text-red-500" /> Desactivar
              </Button>
            )}
            <Button variant="outline" onClick={handlePreview} className="gap-2">
              <Eye className="w-4 h-4" /> Vista previa
            </Button>
          </div>

          <Separator />

          {/* Live preview */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Vista previa del display</Label>
            <div className="bg-slate-900 rounded-lg p-6 max-w-sm">
              <div className="text-teal-400 text-center text-sm font-bold mb-4">SynkData</div>
              <div className="space-y-1 text-white text-xs mb-4">
                <div className="flex justify-between">
                  <span>Coca-Cola 600ml x1</span>
                  <span>$18.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Sabritas 150g x2</span>
                  <span>$44.00</span>
                </div>
              </div>
              <div className="bg-teal-500 rounded-lg p-3 text-center text-white">
                <div className="text-xs opacity-80">TOTAL</div>
                <div className="text-2xl font-bold">$71.92</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---- Tab 6: Báscula ----
function ScaleTab() {
  const { scale, connectScale, disconnectScale, updateScaleConfig, readScaleWeight, tareScale } = useHardwareStore()
  const [connecting, setConnecting] = useState(false)
  const serialSupported = typeof navigator !== 'undefined' && 'serial' in navigator

  const c = scale.config

  // Poll weight when connected
  useEffect(() => {
    if (!scale.connected) return
    const interval = setInterval(() => {
      readScaleWeight()
    }, 1000)
    return () => clearInterval(interval)
  }, [scale.connected, readScaleWeight])

  const handleConnect = async () => {
    if (!serialSupported) {
      toast.error('Web Serial API no soportada')
      return
    }
    setConnecting(true)
    try {
      const port = await navigator.serial.requestPort()
      await connectScale(port)
      toast.success('Báscula conectada')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar'
      if (!msg.includes('No port selected')) {
        toast.error('Error al conectar báscula', { description: msg })
      }
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = () => {
    disconnectScale()
    toast.info('Báscula desconectada')
  }

  const handleTare = () => {
    tareScale()
    toast.success('Báscula tarada')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Scale className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">Báscula</CardTitle>
              <CardDescription>Conecta una báscula para captura automática de peso</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <StatusDot connected={scale.connected} connecting={connecting} />
              <Badge className={`text-[10px] ${scale.connected ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                {scale.connected ? 'Conectada' : 'Desconectada'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!serialSupported && <BrowserSupportWarning feature="Conexión de báscula" />}

          {/* Connection buttons */}
          <div className="flex gap-2">
            {!scale.connected ? (
              <Button onClick={handleConnect} disabled={connecting || !serialSupported} className="gap-2">
                {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cable className="w-4 h-4" />}
                Conectar báscula
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleDisconnect} className="gap-2">
                  <XCircle className="w-4 h-4 text-red-500" /> Desconectar
                </Button>
                <Button variant="outline" onClick={handleTare} className="gap-2">
                  <ArrowRightLeft className="w-4 h-4" /> Tarar
                </Button>
              </>
            )}
          </div>

          {/* Weight display */}
          <div className="bg-slate-900 dark:bg-slate-950 rounded-xl p-8 text-center">
            <div className="text-xs text-slate-400 mb-1 uppercase tracking-wider">Peso actual</div>
            <div className="text-5xl font-bold text-white tracking-tight tabular-nums">
              {scale.connected ? scale.currentWeight.toFixed(3) : '0.000'}
            </div>
            <div className="text-lg text-teal-400 font-medium mt-1">{scale.unit}</div>
            {scale.connected && (
              <div className="flex items-center justify-center gap-1.5 mt-3">
                <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-emerald-400">Lectura en tiempo real</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-xs">Baud Rate</Label>
              <Select value={String(c.baudRate)} onValueChange={(v) => updateScaleConfig({ baudRate: Number(v) })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="9600">9600</SelectItem>
                  <SelectItem value="19200">19200</SelectItem>
                  <SelectItem value="38400">38400</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Unidad</Label>
              <Select value={c.unit} onValueChange={(v) => updateScaleConfig({ unit: v as 'kg' | 'lb' })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kilogramos (kg)</SelectItem>
                  <SelectItem value="lb">Libras (lb)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Umbral de estabilidad</Label>
              <Input type="number" step="0.001" min="0" value={c.stableThreshold} onChange={(e) => updateScaleConfig({ stableThreshold: Number(e.target.value) || 0.01 })} className="text-xs" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={c.autoCapture} onCheckedChange={(v) => updateScaleConfig({ autoCapture: v })} />
            <div>
              <Label className="text-xs">Captura automática</Label>
              <p className="text-[10px] text-muted-foreground">Agregar producto al POS cuando el peso sea estable</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---- Main Hardware Component ----
export default function Hardware() {
  const { loadConfigs } = useHardwareStore()

  useEffect(() => {
    loadConfigs()
  }, [loadConfigs])

  const serialSupported = typeof navigator !== 'undefined' && 'serial' in navigator
  const webAuthnSupported = typeof window !== 'undefined' && !!window.PublicKeyCredential
  const connectedCount = [
    useHardwareStore.getState().printer.connected,
    useHardwareStore.getState().scanner.connected,
    useHardwareStore.getState().fingerprint.available,
    useHardwareStore.getState().customerDisplay.connected,
    useHardwareStore.getState().scale.connected,
  ].filter(Boolean).length

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Cpu className="size-5 text-teal-600 dark:text-teal-400" />
            Hardware
          </h2>
          <p className="text-sm text-muted-foreground">Configura impresora, escáner, báscula y otros periféricos</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] gap-1">
            <Cpu className="size-3" />
            {connectedCount} dispositivo{connectedCount !== 1 ? 's' : ''}
          </Badge>
          <Badge variant="outline" className={`text-[10px] gap-1 ${serialSupported ? 'text-emerald-600' : 'text-red-500'}`}>
            <Radio className="size-3" />
            Serial API {serialSupported ? '✓' : '✗'}
          </Badge>
          <Badge variant="outline" className={`text-[10px] gap-1 ${webAuthnSupported ? 'text-emerald-600' : 'text-red-500'}`}>
            <Fingerprint className="size-3" />
            WebAuthn {webAuthnSupported ? '✓' : '✗'}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="printer" className="space-y-4">
        <TabsList className="w-full sm:w-auto flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="printer" className="gap-1.5 text-xs sm:text-sm">
            <Printer className="w-3.5 h-3.5" /> Impresora
          </TabsTrigger>
          <TabsTrigger value="scanner" className="gap-1.5 text-xs sm:text-sm">
            <ScanBarcode className="w-3.5 h-3.5" /> Escáner
          </TabsTrigger>
          <TabsTrigger value="fingerprint" className="gap-1.5 text-xs sm:text-sm">
            <Fingerprint className="w-3.5 h-3.5" /> Huella
          </TabsTrigger>
          <TabsTrigger value="cash_drawer" className="gap-1.5 text-xs sm:text-sm">
            <Archive className="w-3.5 h-3.5" /> Caja
          </TabsTrigger>
          <TabsTrigger value="display" className="gap-1.5 text-xs sm:text-sm">
            <Monitor className="w-3.5 h-3.5" /> Display
          </TabsTrigger>
          <TabsTrigger value="scale" className="gap-1.5 text-xs sm:text-sm">
            <Scale className="w-3.5 h-3.5" /> Báscula
          </TabsTrigger>
        </TabsList>

        <TabsContent value="printer"><PrinterTab /></TabsContent>
        <TabsContent value="scanner"><ScannerTab /></TabsContent>
        <TabsContent value="fingerprint"><FingerprintTab /></TabsContent>
        <TabsContent value="cash_drawer"><CashDrawerTab /></TabsContent>
        <TabsContent value="display"><CustomerDisplayTab /></TabsContent>
        <TabsContent value="scale"><ScaleTab /></TabsContent>
      </Tabs>
    </motion.div>
  )
}
