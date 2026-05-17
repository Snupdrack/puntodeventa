import type { CashDrawerConfig } from './index'
import { DEFAULT_CASH_DRAWER_CONFIG } from './index'
import { getPrinterService } from './printer'

export class CashDrawerService {
  private config: CashDrawerConfig = { ...DEFAULT_CASH_DRAWER_CONFIG }
  private port: SerialPort | null = null
  private _connected = false

  get connected(): boolean {
    return this._connected
  }

  updateConfig(config: Partial<CashDrawerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  async connect(port: SerialPort): Promise<void> {
    this.port = port
    await this.port.open({ baudRate: this.config.baudRate })
    this._connected = true
  }

  async disconnect(): Promise<void> {
    if (this.port) {
      await this.port.close()
      this.port = null
    }
    this._connected = false
  }

  async open(): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.config.trigger === 'printer') {
        // Send kick code via printer
        const printer = getPrinterService()
        if (printer.connected) {
          await printer.openCashDrawer()
          return { success: true }
        }
        return { success: false, error: 'Impresora no conectada. Conecta una impresora para abrir la caja.' }
      }

      if (this.config.trigger === 'serial') {
        // Send kick code via serial port directly
        if (!this.port || !this._connected) {
          return { success: false, error: 'Puerto serial no conectado' }
        }
        const writer = this.port.writable?.getWriter()
        if (!writer) {
          return { success: false, error: 'No se pudo escribir al puerto serial' }
        }
        // Parse hex kick code
        const kickBytes = this.hexToBytes(this.config.kickCode)
        await writer.write(kickBytes)
        writer.releaseLock()
        return { success: true }
      }

      if (this.config.trigger === 'usb') {
        // USB trigger - in real implementation would use WebUSB
        return { success: false, error: 'USB directo no implementado aún. Usa el modo impresora.' }
      }

      return { success: false, error: 'Modo de activación no configurado' }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      return { success: false, error: message }
    }
  }

  private hexToBytes(hex: string): Uint8Array {
    const clean = hex.replace(/\s/g, '')
    const bytes = new Uint8Array(clean.length / 2)
    for (let i = 0; i < clean.length; i += 2) {
      bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16)
    }
    return bytes
  }
}

// Singleton
let cashDrawerInstance: CashDrawerService | null = null

export function getCashDrawerService(): CashDrawerService {
  if (!cashDrawerInstance) {
    cashDrawerInstance = new CashDrawerService()
  }
  return cashDrawerInstance
}
