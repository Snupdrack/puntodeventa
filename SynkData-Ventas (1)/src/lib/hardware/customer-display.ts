import type { CustomerDisplayConfig, CartItem } from './index'
import { DEFAULT_CUSTOMER_DISPLAY_CONFIG } from './index'

export class CustomerDisplayService {
  private config: CustomerDisplayConfig = { ...DEFAULT_CUSTOMER_DISPLAY_CONFIG }
  private port: SerialPort | null = null
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null
  private popupWindow: Window | null = null
  private _connected = false
  private currentContent: { items: CartItem[]; total: number } | null = null

  get connected(): boolean {
    return this._connected
  }

  updateConfig(config: Partial<CustomerDisplayConfig>): void {
    this.config = { ...this.config, ...config }
  }

  async connect(port?: SerialPort): Promise<void> {
    if (this.config.type === 'serial' && port) {
      this.port = port
      await this.port.open({ baudRate: this.config.baudRate })
      this.writer = this.port.writable?.getWriter() ?? null
      this._connected = true
    } else if (this.config.type === 'browser_window') {
      this.openBrowserWindow()
      this._connected = true
    } else if (this.config.type === 'presentation') {
      await this.connectPresentation()
      this._connected = true
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
    if (this.popupWindow && !this.popupWindow.closed) {
      this.popupWindow.close()
      this.popupWindow = null
    }
    this._connected = false
  }

  private openBrowserWindow(): void {
    if (this.popupWindow && !this.popupWindow.closed) {
      this.popupWindow.focus()
      return
    }

    this.popupWindow = window.open('', 'synkdata-customer-display', 'width=480,height=320,toolbar=no,location=no,status=no')
    if (this.popupWindow) {
      this.popupWindow.document.write(this.generateDisplayHTML([] , 0))
      this.popupWindow.document.close()
    }
  }

  private generateDisplayHTML(items: CartItem[], total: number): string {
    const itemsHTML = items.slice(0, 8).map(item => `
      <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #eee;font-size:14px;">
        <span>${item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name} x${item.quantity}</span>
        <span style="font-weight:600;">$${(item.unitPrice * item.quantity).toFixed(2)}</span>
      </div>
    `).join('')

    return `<!DOCTYPE html>
<html>
<head>
  <title>Display de Cliente - SynkData</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; min-height: 100vh; display: flex; flex-direction: column; }
    .header { text-align: center; padding: 10px; border-bottom: 2px solid #14b8a6; margin-bottom: 15px; }
    .header h1 { font-size: 20px; color: #14b8a6; }
    .items { flex: 1; overflow-y: auto; }
    .total-section { margin-top: 15px; padding: 15px; background: #14b8a6; border-radius: 8px; text-align: center; }
    .total-label { font-size: 14px; opacity: 0.9; }
    .total-value { font-size: 36px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="header">
    <h1>SynkData</h1>
  </div>
  <div class="items">
    ${itemsHTML || '<div style="text-align:center;padding:40px;opacity:0.5;">Sin artículos</div>'}
  </div>
  <div class="total-section">
    <div class="total-label">TOTAL</div>
    <div class="total-value">$${total.toFixed(2)}</div>
  </div>
</body>
</html>`
  }

  private async connectPresentation(): Promise<void> {
    if ('presentation' in navigator) {
      try {
        const presentation = navigator.presentation as unknown as {
          requestSelect?: () => Promise<{ connection: { send: (data: string) => void } }>
        }
        if (presentation.requestSelect) {
          const result = await presentation.requestSelect()
          if (result?.connection) {
            this._connected = true
          }
        }
      } catch {
        // Presentation API not available or user cancelled
        console.warn('Presentation API not available')
      }
    }
  }

  showItems(items: CartItem[], total: number): void {
    this.currentContent = { items, total }

    if (this.config.type === 'serial' && this.writer) {
      this.sendSerialDisplay(items, total)
    } else if (this.config.type === 'browser_window' && this.popupWindow && !this.popupWindow.closed) {
      this.popupWindow.document.open()
      this.popupWindow.document.write(this.generateDisplayHTML(items, total))
      this.popupWindow.document.close()
    }
  }

  showWelcome(): void {
    if (this.config.type === 'browser_window' && this.popupWindow && !this.popupWindow.closed) {
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>Display de Cliente - SynkData</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; text-align: center; }
    .welcome h1 { font-size: 32px; color: #14b8a6; margin-bottom: 10px; }
    .welcome p { font-size: 16px; opacity: 0.7; }
  </style>
</head>
<body>
  <div class="welcome">
    <h1>Bienvenido</h1>
    <p>Escanee sus productos para comenzar</p>
  </div>
</body>
</html>`
      this.popupWindow.document.open()
      this.popupWindow.document.write(html)
      this.popupWindow.document.close()
    }
  }

  showTotal(total: number): void {
    if (this.config.type === 'browser_window' && this.popupWindow && !this.popupWindow.closed) {
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>Display de Cliente - SynkData</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; text-align: center; }
    .total h2 { font-size: 18px; color: #14b8a6; margin-bottom: 10px; }
    .total .amount { font-size: 56px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="total">
    <h2>TOTAL A PAGAR</h2>
    <div class="amount">$${total.toFixed(2)}</div>
  </div>
</body>
</html>`
      this.popupWindow.document.open()
      this.popupWindow.document.write(html)
      this.popupWindow.document.close()
    }
  }

  clear(): void {
    this.currentContent = null
    this.showWelcome()
  }

  private async sendSerialDisplay(items: CartItem[], total: number): Promise<void> {
    if (!this.writer) return
    const encoder = new TextEncoder()
    // Clear display
    await this.writer.write(encoder.encode('\x1B\x5B\x32\x4A')) // ESC[2J
    // Line 1: Items count or first item
    if (items.length > 0) {
      const firstItem = `${items.length} artículo${items.length > 1 ? 's' : ''}`
      await this.writer.write(encoder.encode(firstItem.substring(0, this.config.columns)))
    }
    // Line 2: Total
    await this.writer.write(encoder.encode(`\x1B\x5B\x31\x3B\x31\x48`)) // Move to line 2
    const totalStr = `TOTAL: $${total.toFixed(2)}`
    await this.writer.write(encoder.encode(totalStr.substring(0, this.config.columns)))
  }

  showPreview(): Window | null {
    const w = window.open('', 'synkdata-display-preview', 'width=480,height=320,toolbar=no,location=no,status=no')
    if (w) {
      const items = this.currentContent?.items ?? []
      const total = this.currentContent?.total ?? 0
      w.document.write(this.generateDisplayHTML(items, total))
      w.document.close()
    }
    return w
  }
}

// Singleton
let customerDisplayInstance: CustomerDisplayService | null = null

export function getCustomerDisplayService(): CustomerDisplayService {
  if (!customerDisplayInstance) {
    customerDisplayInstance = new CustomerDisplayService()
  }
  return customerDisplayInstance
}
