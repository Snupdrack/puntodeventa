import type { ScaleConfig } from './index'
import { DEFAULT_SCALE_CONFIG } from './index'

export class ScaleService {
  private config: ScaleConfig = { ...DEFAULT_SCALE_CONFIG }
  private port: SerialPort | null = null
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  private _connected = false
  private _currentWeight = 0
  private continuousCallback: ((weight: number) => void) | null = null
  private readInterval: ReturnType<typeof setInterval> | null = null
  private _tareOffset = 0

  get connected(): boolean {
    return this._connected
  }

  get currentWeight(): number {
    return this._currentWeight
  }

  updateConfig(config: Partial<ScaleConfig>): void {
    this.config = { ...this.config, ...config }
  }

  async connect(port: SerialPort): Promise<void> {
    this.port = port
    await this.port.open({ baudRate: this.config.baudRate })
    this._connected = true
  }

  async disconnect(): Promise<void> {
    this.stopContinuousRead()
    if (this.reader) {
      await this.reader.cancel()
      this.reader.releaseLock()
      this.reader = null
    }
    if (this.port) {
      await this.port.close()
      this.port = null
    }
    this._connected = false
    this._currentWeight = 0
    this._tareOffset = 0
  }

  async readWeight(): Promise<{ weight: number; unit: string; stable: boolean }> {
    if (!this.port || !this._connected) {
      return { weight: 0, unit: this.config.unit, stable: false }
    }

    try {
      // Read from serial port - most scales send weight data continuously
      const reader = this.port.readable?.getReader()
      if (!reader) {
        return { weight: this._currentWeight, unit: this.config.unit, stable: false }
      }

      const { value } = await reader.read()
      reader.releaseLock()

      if (value) {
        const text = new TextDecoder().decode(value)
        const weight = this.parseWeightData(text)
        this._currentWeight = weight - this._tareOffset
      }

      const isStable = Math.abs(this._currentWeight) > this.config.stableThreshold
      return { weight: this._currentWeight, unit: this.config.unit, stable: isStable }
    } catch {
      return { weight: this._currentWeight, unit: this.config.unit, stable: false }
    }
  }

  startContinuousRead(callback: (weight: number) => void): void {
    this.continuousCallback = callback
    this.readInterval = setInterval(async () => {
      if (!this.port || !this._connected) return
      try {
        const result = await this.readWeight()
        if (this.continuousCallback && result.stable) {
          this.continuousCallback(result.weight)
        }
      } catch {
        // Read might fail occasionally
      }
    }, 500)
  }

  stopContinuousRead(): void {
    if (this.readInterval) {
      clearInterval(this.readInterval)
      this.readInterval = null
    }
    this.continuousCallback = null
  }

  tare(): void {
    this._tareOffset = this._currentWeight + this._tareOffset
    this._currentWeight = 0
  }

  private parseWeightData(data: string): number {
    // Common scale protocols:
    // Most send: "ST,GS,+  0.00  kg\r\n" or similar
    // Try to extract a number from the data
    const match = data.match(/[+-]?\s*(\d+\.?\d*)\s*(kg|g|lb|oz)/i)
    if (match) {
      let weight = parseFloat(match[1])
      const parsedUnit = match[2].toLowerCase()

      // Convert to configured unit
      if (this.config.unit === 'kg') {
        if (parsedUnit === 'g') weight = weight / 1000
        else if (parsedUnit === 'lb') weight = weight * 0.453592
      } else if (this.config.unit === 'lb') {
        if (parsedUnit === 'kg') weight = weight * 2.20462
        else if (parsedUnit === 'g') weight = weight * 0.00220462
      }

      return weight
    }

    // Fallback: try to parse any number
    const numMatch = data.match(/(\d+\.?\d*)/)
    return numMatch ? parseFloat(numMatch[1]) : 0
  }
}

// Singleton
let scaleInstance: ScaleService | null = null

export function getScaleService(): ScaleService {
  if (!scaleInstance) {
    scaleInstance = new ScaleService()
  }
  return scaleInstance
}
