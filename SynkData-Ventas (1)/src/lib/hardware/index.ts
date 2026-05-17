// Hardware service types and exports

export interface HardwareDevice {
  id: string
  name: string
  type: 'printer' | 'scanner' | 'fingerprint' | 'cash_drawer' | 'customer_display' | 'scale'
  connection: 'serial' | 'usb' | 'bluetooth' | 'hid' | 'network'
  enabled: boolean
  connected: boolean
  port?: SerialPort | null
  device?: USBDevice | null
  config: Record<string, string>
}

export interface PrinterConfig {
  type: 'thermal' | 'label' | 'matrix'
  width: 58 | 80
  charset: 'UTF-8' | 'CP850'
  cutPaper: boolean
  openDrawer: boolean
  copies: number
  baudRate: number
}

export interface ScannerConfig {
  mode: 'usb_hid' | 'camera' | 'serial'
  prefix: string
  suffix: string
  beepOnScan: boolean
  cameraFacing: 'environment' | 'user'
}

export interface FingerprintConfig {
  mode: 'webauthn' | 'usb'
  loginEnabled: boolean
  clockInEnabled: boolean
}

export interface CashDrawerConfig {
  trigger: 'printer' | 'serial' | 'usb'
  kickCode: string
  baudRate: number
  autoOpenOnSale: boolean
}

export interface CustomerDisplayConfig {
  type: 'serial' | 'browser_window' | 'presentation'
  baudRate: number
  lines: number
  columns: number
}

export interface ScaleConfig {
  baudRate: number
  unit: 'kg' | 'lb'
  autoCapture: boolean
  stableThreshold: number
}

export interface ReceiptData {
  folio: string
  date: string
  items: { name: string; qty: number; price: number; total: number }[]
  subtotal: number
  tax: number
  discount: number
  total: number
  cashReceived?: number
  change?: number
  paymentMethod: string
  cashier: string
  branch: string
}

export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  type: 'thermal',
  width: 80,
  charset: 'UTF-8',
  cutPaper: true,
  openDrawer: true,
  copies: 1,
  baudRate: 9600,
}

export const DEFAULT_SCANNER_CONFIG: ScannerConfig = {
  mode: 'usb_hid',
  prefix: '',
  suffix: '',
  beepOnScan: true,
  cameraFacing: 'environment',
}

export const DEFAULT_FINGERPRINT_CONFIG: FingerprintConfig = {
  mode: 'webauthn',
  loginEnabled: false,
  clockInEnabled: false,
}

export const DEFAULT_CASH_DRAWER_CONFIG: CashDrawerConfig = {
  trigger: 'printer',
  kickCode: '1B7000',
  baudRate: 9600,
  autoOpenOnSale: false,
}

export const DEFAULT_CUSTOMER_DISPLAY_CONFIG: CustomerDisplayConfig = {
  type: 'browser_window',
  baudRate: 9600,
  lines: 2,
  columns: 20,
}

export const DEFAULT_SCALE_CONFIG: ScaleConfig = {
  baudRate: 9600,
  unit: 'kg',
  autoCapture: false,
  stableThreshold: 0.01,
}

export { ThermalPrinterService } from './printer'
export { BarcodeScannerService } from './scanner'
export { FingerprintService } from './fingerprint'
export { CashDrawerService } from './cash-drawer'
export { CustomerDisplayService } from './customer-display'
export { ScaleService } from './scale'
