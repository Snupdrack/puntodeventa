import type { PrinterConfig, ReceiptData } from './index'
import { DEFAULT_PRINTER_CONFIG } from './index'

// ESC/POS command helpers
const ESC = '\x1B'
const GS = '\x1D'

function cmd(...bytes: number[]): Uint8Array {
  return new Uint8Array(bytes)
}

// ESC/POS Commands
const CMD = {
  INIT: cmd(0x1B, 0x40),            // ESC @ - Initialize printer
  LF: cmd(0x0A),                     // Line feed
  CENTER: cmd(0x1B, 0x61, 0x01),    // ESC a 1 - Center alignment
  LEFT: cmd(0x1B, 0x61, 0x00),      // ESC a 0 - Left alignment
  RIGHT: cmd(0x1B, 0x61, 0x02),     // ESC a 2 - Right alignment
  BOLD_ON: cmd(0x1B, 0x45, 0x01),   // ESC E 1 - Bold on
  BOLD_OFF: cmd(0x1B, 0x45, 0x00),  // ESC E 0 - Bold off
  UNDERLINE_ON: cmd(0x1B, 0x2D, 0x01),  // ESC - 1
  UNDERLINE_OFF: cmd(0x1B, 0x2D, 0x00), // ESC - 0
  CUT: cmd(0x1D, 0x56, 0x01),       // GS V 1 - Partial cut
  FULL_CUT: cmd(0x1D, 0x56, 0x00),  // GS V 0 - Full cut
  OPEN_DRAWER: cmd(0x1B, 0x70, 0x00, 0x19, 0xFA), // ESC p 0 - Open cash drawer
  CHARSET_UTF8: cmd(0x1B, 0x74, 0x11), // ESC t 17 - UTF-8
  CHARSET_CP850: cmd(0x1B, 0x74, 0x02), // ESC t 2 - CP850
  DOUBLE_HEIGHT_ON: cmd(0x1B, 0x21, 0x10),  // ESC ! 0x10
  DOUBLE_HEIGHT_OFF: cmd(0x1B, 0x21, 0x00), // ESC ! 0x00
  DOUBLE_WIDTH_ON: cmd(0x1B, 0x21, 0x20),   // ESC ! 0x20
  DOUBLE_WIDTH_OFF: cmd(0x1B, 0x21, 0x00),   // ESC ! 0x00
}

export class ThermalPrinterService {
  private port: SerialPort | null = null
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null
  private config: PrinterConfig = { ...DEFAULT_PRINTER_CONFIG }
  private _connected = false

  get connected(): boolean {
    return this._connected
  }

  async connect(port: SerialPort, config?: Partial<PrinterConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config }
    }

    this.port = port
    await this.port.open({ baudRate: this.config.baudRate })
    this.writer = this.port.writable?.getWriter() ?? null
    this._connected = true

    // Initialize printer
    await this.write(CMD.INIT)
    if (this.config.charset === 'UTF-8') {
      await this.write(CMD.CHARSET_UTF8)
    } else {
      await this.write(CMD.CHARSET_CP850)
    }
  }

  async disconnect(): Promise<void> {
    if (this.writer) {
      this.writer.releaseLock()
      this.writer = null
    }
    if (this.port) {
      await this.port.close()
      this.port = null
    }
    this._connected = false
  }

  private async write(data: Uint8Array): Promise<void> {
    if (!this.writer) return
    await this.writer.write(data)
  }

  private async writeText(text: string): Promise<void> {
    const encoder = new TextEncoder()
    await this.write(encoder.encode(text))
  }

  private async writeLine(text: string): Promise<void> {
    await this.writeText(text)
    await this.write(CMD.LF)
  }

  async printReceipt(sale: ReceiptData): Promise<void> {
    const width = this.config.width === 58 ? 32 : 48
    const separator = '─'.repeat(width)

    // Header
    await this.write(CMD.CENTER)
    await this.write(CMD.BOLD_ON)
    await this.write(CMD.DOUBLE_HEIGHT_ON)
    await this.writeLine(sale.branch)
    await this.write(CMD.DOUBLE_HEIGHT_OFF)
    await this.write(CMD.BOLD_OFF)
    await this.writeLine('TICKET DE VENTA')
    await this.write(CMD.LEFT)

    await this.writeLine(separator)
    await this.writeLine(`Folio: ${sale.folio}`)
    await this.writeLine(`Fecha: ${sale.date}`)
    await this.writeLine(`Cajero: ${sale.cashier}`)
    await this.writeLine(separator)

    // Items
    for (const item of sale.items) {
      await this.write(CMD.BOLD_ON)
      await this.writeLine(item.name)
      await this.write(CMD.BOLD_OFF)
      const priceStr = `$${item.price.toFixed(2)}`
      const totalStr = `$${item.total.toFixed(2)}`
      const qtyStr = `${item.qty} x ${priceStr}`
      const padding = width - qtyStr.length - totalStr.length
      await this.writeLine(`${qtyStr}${' '.repeat(Math.max(1, padding))}${totalStr}`)
    }

    await this.writeLine(separator)

    // Totals
    const fmtMoney = (n: number) => `$${n.toFixed(2)}`
    const printTotal = (label: string, value: string) => {
      const padding = width - label.length - value.length
      this.writeLine(`${label}${' '.repeat(Math.max(1, padding))}${value}`)
    }

    await printTotal('Subtotal:', fmtMoney(sale.subtotal))
    if (sale.tax > 0) await printTotal('IVA (16%):', fmtMoney(sale.tax))
    if (sale.discount > 0) await printTotal('Descuento:', `-${fmtMoney(sale.discount)}`)
    await this.write(CMD.BOLD_ON)
    await this.write(CMD.DOUBLE_HEIGHT_ON)
    await printTotal('TOTAL:', fmtMoney(sale.total))
    await this.write(CMD.DOUBLE_HEIGHT_OFF)
    await this.write(CMD.BOLD_OFF)

    await this.writeLine(separator)

    // Payment
    await this.writeLine(`Pago: ${sale.paymentMethod}`)
    if (sale.cashReceived !== undefined && sale.cashReceived > 0) {
      await printTotal('Recibido:', fmtMoney(sale.cashReceived))
      if (sale.change !== undefined && sale.change > 0) {
        await printTotal('Cambio:', fmtMoney(sale.change))
      }
    }

    await this.writeLine('')
    await this.write(CMD.CENTER)
    await this.writeLine('Gracias por su compra')
    await this.writeLine('')

    // Cut paper
    if (this.config.cutPaper) {
      await this.write(CMD.CUT)
    }

    // Open cash drawer
    if (this.config.openDrawer) {
      await this.openCashDrawer()
    }
  }

  async printTestPage(): Promise<void> {
    const width = this.config.width === 58 ? 32 : 48
    const separator = '─'.repeat(width)

    await this.write(CMD.INIT)
    await this.write(CMD.CENTER)
    await this.write(CMD.BOLD_ON)
    await this.write(CMD.DOUBLE_HEIGHT_ON)
    await this.writeLine('PÁGINA DE PRUEBA')
    await this.write(CMD.DOUBLE_HEIGHT_OFF)
    await this.write(CMD.BOLD_OFF)

    await this.writeLine(separator)
    await this.write(CMD.LEFT)
    await this.writeLine(`Impresora: ${this.config.type}`)
    await this.writeLine(`Ancho: ${this.config.width}mm`)
    await this.writeLine(`Charset: ${this.config.charset}`)
    await this.writeLine(`Baud Rate: ${this.config.baudRate}`)
    await this.writeLine(separator)

    // Test patterns
    await this.writeLine('Test de caracteres:')
    await this.writeLine('ABCDEFGHIJKLMNÑOPQRSTUVWXYZ')
    await this.writeLine('abcdefghijklmnñopqrstuvwxyz')
    await this.writeLine('0123456789 !@#$%&*()-+=[]{}')
    await this.writeLine(separator)

    await this.write(CMD.CENTER)
    await this.write(CMD.BOLD_ON)
    await this.writeLine('¡Impresora funcionando!')
    await this.write(CMD.BOLD_OFF)

    await this.writeLine('')
    if (this.config.cutPaper) {
      await this.write(CMD.CUT)
    }
  }

  async openCashDrawer(): Promise<void> {
    await this.write(CMD.OPEN_DRAWER)
  }

  async getStatus(): Promise<{ online: boolean; paperOut: boolean; coverOpen: boolean }> {
    // In a real implementation, we'd read DSR/CTS signals or send ESC/POS status commands
    return {
      online: this._connected,
      paperOut: false,
      coverOpen: false,
    }
  }
}

// Singleton instance
let printerInstance: ThermalPrinterService | null = null

export function getPrinterService(): ThermalPrinterService {
  if (!printerInstance) {
    printerInstance = new ThermalPrinterService()
  }
  return printerInstance
}
