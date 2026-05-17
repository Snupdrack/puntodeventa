import { create } from 'zustand'
import type {
  PrinterConfig,
  ScannerConfig,
  FingerprintConfig,
  CashDrawerConfig,
  CustomerDisplayConfig,
  ScaleConfig,
} from './index'
import {
  DEFAULT_PRINTER_CONFIG,
  DEFAULT_SCANNER_CONFIG,
  DEFAULT_FINGERPRINT_CONFIG,
  DEFAULT_CASH_DRAWER_CONFIG,
  DEFAULT_CUSTOMER_DISPLAY_CONFIG,
  DEFAULT_SCALE_CONFIG,
} from './index'
import { getPrinterService } from './printer'
import { getScannerService } from './scanner'
import { getFingerprintService } from './fingerprint'
import { getCashDrawerService } from './cash-drawer'
import { getCustomerDisplayService } from './customer-display'
import { getScaleService } from './scale'

const STORAGE_PREFIX = 'synkdata-hw-'

function loadFromStorage<T>(key: string, defaults: T): T {
  if (typeof window === 'undefined') return defaults
  const saved = localStorage.getItem(STORAGE_PREFIX + key)
  if (saved) {
    try { return JSON.parse(saved) } catch { /* ignore */ }
  }
  return defaults
}

function saveToStorage(key: string, data: unknown) {
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data))
}

export interface HardwareStore {
  // Printer
  printer: { connected: boolean; name: string; config: PrinterConfig }
  connectPrinter: (port: SerialPort) => Promise<void>
  disconnectPrinter: () => void
  updatePrinterConfig: (config: Partial<PrinterConfig>) => void
  printTestPage: () => Promise<void>
  printLastReceipt: () => Promise<void>

  // Scanner
  scanner: { connected: boolean; mode: string; config: ScannerConfig; listening: boolean; lastCodes: string[] }
  connectScanner: () => void
  disconnectScanner: () => void
  updateScannerConfig: (config: Partial<ScannerConfig>) => void
  addScannedCode: (code: string) => void

  // Fingerprint
  fingerprint: { available: boolean; config: FingerprintConfig; credentials: { credentialId: string; userId: string; createdAt: number }[] }
  updateFingerprintConfig: (config: Partial<FingerprintConfig>) => void
  registerFingerprint: (userId: string) => Promise<{ success: boolean; error?: string }>
  testFingerprint: () => Promise<{ success: boolean; userId?: string; error?: string }>
  deleteFingerprint: (userId: string) => void
  checkFingerprintAvailable: () => Promise<void>

  // Cash drawer
  cashDrawer: { connected: boolean; config: CashDrawerConfig }
  openCashDrawer: () => Promise<{ success: boolean; error?: string }>
  updateCashDrawerConfig: (config: Partial<CashDrawerConfig>) => void

  // Customer display
  customerDisplay: { connected: boolean; config: CustomerDisplayConfig }
  connectCustomerDisplay: () => void
  disconnectCustomerDisplay: () => void
  updateCustomerDisplayConfig: (config: Partial<CustomerDisplayConfig>) => void
  showCustomerDisplayPreview: () => void

  // Scale
  scale: { connected: boolean; config: ScaleConfig; currentWeight: number; unit: string }
  connectScale: (port: SerialPort) => Promise<void>
  disconnectScale: () => void
  updateScaleConfig: (config: Partial<ScaleConfig>) => void
  readScaleWeight: () => Promise<void>
  tareScale: () => void

  // General
  loadConfigs: () => void
}

export const useHardwareStore = create<HardwareStore>((set, get) => ({
  // Printer
  printer: {
    connected: false,
    name: '',
    config: { ...DEFAULT_PRINTER_CONFIG },
  },

  connectPrinter: async (port: SerialPort) => {
    const printer = getPrinterService()
    const config = get().printer.config
    try {
      await printer.connect(port, config)
      const info = port.getInfo()
      set({
        printer: {
          ...get().printer,
          connected: true,
          name: `Serial ${info.usbVendorId ? `USB:${info.usbVendorId}` : 'Dispositivo'}`,
        },
      })
    } catch (err) {
      console.error('Printer connect error:', err)
      throw err
    }
  },

  disconnectPrinter: () => {
    const printer = getPrinterService()
    printer.disconnect()
    set({ printer: { ...get().printer, connected: false, name: '' } })
  },

  updatePrinterConfig: (config) => {
    const newConfig = { ...get().printer.config, ...config }
    saveToStorage('printer-config', newConfig)
    getPrinterService().updateConfig(config)
    set({ printer: { ...get().printer, config: newConfig } })
  },

  printTestPage: async () => {
    const printer = getPrinterService()
    if (printer.connected) {
      await printer.printTestPage()
    }
  },

  printLastReceipt: async () => {
    // This would be called with actual receipt data from the POS
    const printer = getPrinterService()
    if (printer.connected) {
      const lastSale = localStorage.getItem('synkdata-last-sale')
      if (lastSale) {
        try {
          const sale = JSON.parse(lastSale)
          await printer.printReceipt(sale)
        } catch {
          // If no valid receipt data, print a test page
          await printer.printTestPage()
        }
      } else {
        await printer.printTestPage()
      }
    }
  },

  // Scanner
  scanner: {
    connected: false,
    mode: 'usb_hid',
    config: { ...DEFAULT_SCANNER_CONFIG },
    listening: false,
    lastCodes: [],
  },

  connectScanner: () => {
    const scanner = getScannerService()
    const config = get().scanner.config
    scanner.updateConfig(config)

    if (config.mode === 'usb_hid') {
      scanner.startListening((code) => {
        get().addScannedCode(code)
      })
      set({ scanner: { ...get().scanner, connected: true, listening: true } })
    } else {
      set({ scanner: { ...get().scanner, connected: true } })
    }
  },

  disconnectScanner: () => {
    const scanner = getScannerService()
    scanner.stopListening()
    scanner.stopCameraScan()
    set({ scanner: { ...get().scanner, connected: false, listening: false } })
  },

  updateScannerConfig: (config) => {
    const newConfig = { ...get().scanner.config, ...config }
    saveToStorage('scanner-config', newConfig)
    getScannerService().updateConfig(config)
    set({ scanner: { ...get().scanner, config: newConfig, mode: newConfig.mode } })
  },

  addScannedCode: (code) => {
    const lastCodes = [code, ...get().scanner.lastCodes].slice(0, 10)
    set({ scanner: { ...get().scanner, lastCodes } })
  },

  // Fingerprint
  fingerprint: {
    available: false,
    config: { ...DEFAULT_FINGERPRINT_CONFIG },
    credentials: [],
  },

  updateFingerprintConfig: (config) => {
    const newConfig = { ...get().fingerprint.config, ...config }
    saveToStorage('fingerprint-config', newConfig)
    getFingerprintService().updateConfig(config)
    set({ fingerprint: { ...get().fingerprint, config: newConfig } })
  },

  registerFingerprint: async (userId: string) => {
    const fp = getFingerprintService()
    const result = await fp.registerCredential(userId)
    if (result.success) {
      // Refresh credentials list
      const credentials = fp.getRegisteredCredentials()
      set({ fingerprint: { ...get().fingerprint, credentials } })
    }
    return { success: result.success, error: result.error }
  },

  testFingerprint: async () => {
    const fp = getFingerprintService()
    const result = await fp.authenticate()
    return { success: result.success, userId: result.userId, error: result.error }
  },

  deleteFingerprint: (userId: string) => {
    const fp = getFingerprintService()
    fp.deleteCredential(userId)
    const credentials = fp.getRegisteredCredentials()
    set({ fingerprint: { ...get().fingerprint, credentials } })
  },

  checkFingerprintAvailable: async () => {
    const fp = getFingerprintService()
    const available = await fp.isPlatformAuthenticatorAvailable()
    const credentials = fp.getRegisteredCredentials()
    set({ fingerprint: { ...get().fingerprint, available, credentials } })
  },

  // Cash drawer
  cashDrawer: {
    connected: false,
    config: { ...DEFAULT_CASH_DRAWER_CONFIG },
  },

  openCashDrawer: async () => {
    const drawer = getCashDrawerService()
    return drawer.open()
  },

  updateCashDrawerConfig: (config) => {
    const newConfig = { ...get().cashDrawer.config, ...config }
    saveToStorage('cash-drawer-config', newConfig)
    getCashDrawerService().updateConfig(config)
    set({ cashDrawer: { ...get().cashDrawer, config: newConfig } })
  },

  // Customer display
  customerDisplay: {
    connected: false,
    config: { ...DEFAULT_CUSTOMER_DISPLAY_CONFIG },
  },

  connectCustomerDisplay: () => {
    const display = getCustomerDisplayService()
    const config = get().customerDisplay.config
    display.updateConfig(config)

    if (config.type === 'browser_window') {
      display.connect()
      set({ customerDisplay: { ...get().customerDisplay, connected: true } })
    }
  },

  disconnectCustomerDisplay: () => {
    const display = getCustomerDisplayService()
    display.disconnect()
    set({ customerDisplay: { ...get().customerDisplay, connected: false } })
  },

  updateCustomerDisplayConfig: (config) => {
    const newConfig = { ...get().customerDisplay.config, ...config }
    saveToStorage('customer-display-config', newConfig)
    getCustomerDisplayService().updateConfig(config)
    set({ customerDisplay: { ...get().customerDisplay, config: newConfig } })
  },

  showCustomerDisplayPreview: () => {
    const display = getCustomerDisplayService()
    display.showPreview()
  },

  // Scale
  scale: {
    connected: false,
    config: { ...DEFAULT_SCALE_CONFIG },
    currentWeight: 0,
    unit: 'kg',
  },

  connectScale: async (port: SerialPort) => {
    const scaleService = getScaleService()
    const config = get().scale.config
    scaleService.updateConfig(config)
    await scaleService.connect(port)
    set({ scale: { ...get().scale, connected: true } })
  },

  disconnectScale: () => {
    const scaleService = getScaleService()
    scaleService.disconnect()
    set({ scale: { ...get().scale, connected: false, currentWeight: 0 } })
  },

  updateScaleConfig: (config) => {
    const newConfig = { ...get().scale.config, ...config }
    saveToStorage('scale-config', newConfig)
    getScaleService().updateConfig(config)
    set({ scale: { ...get().scale, config: newConfig, unit: newConfig.unit } })
  },

  readScaleWeight: async () => {
    const scaleService = getScaleService()
    if (scaleService.connected) {
      const result = await scaleService.readWeight()
      set({ scale: { ...get().scale, currentWeight: result.weight, unit: result.unit } })
    }
  },

  tareScale: () => {
    const scaleService = getScaleService()
    scaleService.tare()
    set({ scale: { ...get().scale, currentWeight: 0 } })
  },

  // General
  loadConfigs: () => {
    const printerConfig = loadFromStorage<PrinterConfig>('printer-config', DEFAULT_PRINTER_CONFIG)
    const scannerConfig = loadFromStorage<ScannerConfig>('scanner-config', DEFAULT_SCANNER_CONFIG)
    const fingerprintConfig = loadFromStorage<FingerprintConfig>('fingerprint-config', DEFAULT_FINGERPRINT_CONFIG)
    const cashDrawerConfig = loadFromStorage<CashDrawerConfig>('cash-drawer-config', DEFAULT_CASH_DRAWER_CONFIG)
    const customerDisplayConfig = loadFromStorage<CustomerDisplayConfig>('customer-display-config', DEFAULT_CUSTOMER_DISPLAY_CONFIG)
    const scaleConfig = loadFromStorage<ScaleConfig>('scale-config', DEFAULT_SCALE_CONFIG)

    set({
      printer: { ...get().printer, config: printerConfig },
      scanner: { ...get().scanner, config: scannerConfig, mode: scannerConfig.mode },
      fingerprint: { ...get().fingerprint, config: fingerprintConfig },
      cashDrawer: { ...get().cashDrawer, config: cashDrawerConfig },
      customerDisplay: { ...get().customerDisplay, config: customerDisplayConfig },
      scale: { ...get().scale, config: scaleConfig, unit: scaleConfig.unit },
    })

    // Also update the service configs
    getPrinterService().updateConfig(printerConfig)
    getScannerService().updateConfig(scannerConfig)
    getFingerprintService().updateConfig(fingerprintConfig)
    getCashDrawerService().updateConfig(cashDrawerConfig)
    getCustomerDisplayService().updateConfig(customerDisplayConfig)
    getScaleService().updateConfig(scaleConfig)
  },
}))
