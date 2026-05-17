import type { ScannerConfig } from './index'
import { DEFAULT_SCANNER_CONFIG } from './index'

export class BarcodeScannerService {
  private config: ScannerConfig = { ...DEFAULT_SCANNER_CONFIG }
  private listening = false
  private keyBuffer: string[] = []
  private keyTimestamps: number[] = []
  private lastKeyTime = 0
  private callback: ((code: string) => void) | null = null
  private keyHandler: ((e: KeyboardEvent) => void) | null = null
  private mediaStream: MediaStream | null = null
  private barcodeDetector: BarcodeDetector | null = null
  private scanInterval: ReturnType<typeof setInterval> | null = null
  private audioCtx: AudioContext | null = null

  get isActive(): boolean {
    return this.listening
  }

  updateConfig(config: Partial<ScannerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  // USB HID mode: listens for rapid keyboard input (barcode scanners emulate keyboards)
  startListening(callback: (code: string) => void): void {
    if (this.listening) this.stopListening()

    this.callback = callback
    this.listening = true
    this.keyBuffer = []
    this.keyTimestamps = []

    this.keyHandler = (e: KeyboardEvent) => {
      // Ignore if focused on an input field (let the user type normally)
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      const now = Date.now()
      const timeDiff = now - this.lastKeyTime
      this.lastKeyTime = now

      // If more than 100ms between keystrokes, it's likely manual typing - reset
      if (timeDiff > 100) {
        this.keyBuffer = []
        this.keyTimestamps = []
      }

      if (e.key === 'Enter') {
        // End of barcode scan
        if (this.keyBuffer.length >= 3) {
          let code = this.keyBuffer.join('')
          // Apply prefix/suffix
          if (this.config.prefix && code.startsWith(this.config.prefix)) {
            code = code.slice(this.config.prefix.length)
          }
          if (this.config.suffix && code.endsWith(this.config.suffix)) {
            code = code.slice(0, -this.config.suffix.length)
          }
          if (code.length > 0 && this.callback) {
            this.callback(code)
            if (this.config.beepOnScan) this.beep()
          }
        }
        this.keyBuffer = []
        this.keyTimestamps = []
      } else if (e.key.length === 1) {
        // Regular character
        this.keyBuffer.push(e.key)
        this.keyTimestamps.push(now)
      }
    }

    window.addEventListener('keydown', this.keyHandler)
  }

  stopListening(): void {
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler)
      this.keyHandler = null
    }
    this.listening = false
    this.keyBuffer = []
    this.callback = null
  }

  // Camera mode: use BarcodeDetector API or canvas-based detection
  async startCameraScan(
    videoElement: HTMLVideoElement,
    callback: (code: string) => void
  ): Promise<boolean> {
    this.callback = callback

    try {
      const facingMode = this.config.cameraFacing
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
      })

      videoElement.srcObject = this.mediaStream
      await videoElement.play()

      // Check for BarcodeDetector support
      if ('BarcodeDetector' in window) {
        this.barcodeDetector = new BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e']
        })

        this.scanInterval = setInterval(async () => {
          if (!this.barcodeDetector || !videoElement.videoWidth) return
          try {
            const barcodes = await this.barcodeDetector.detect(videoElement)
            if (barcodes.length > 0 && this.callback) {
              const code = barcodes[0].rawValue
              if (code) {
                this.callback(code)
                if (this.config.beepOnScan) this.beep()
              }
            }
          } catch {
            // Detection might fail on some frames, ignore
          }
        }, 500)
      } else {
        // Fallback: simulate scanning with a message
        console.warn('BarcodeDetector API not supported in this browser')
      }

      return true
    } catch (err) {
      console.error('Camera access error:', err)
      return false
    }
  }

  stopCameraScan(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval)
      this.scanInterval = null
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop())
      this.mediaStream = null
    }
    this.barcodeDetector = null
    this.callback = null
  }

  private beep(): void {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new AudioContext()
      }
      const oscillator = this.audioCtx.createOscillator()
      const gain = this.audioCtx.createGain()
      oscillator.connect(gain)
      gain.connect(this.audioCtx.destination)
      oscillator.frequency.value = 1000
      oscillator.type = 'sine'
      gain.gain.value = 0.3
      oscillator.start()
      oscillator.stop(this.audioCtx.currentTime + 0.1)
    } catch {
      // Audio might not be available
    }
  }
}

// Singleton
let scannerInstance: BarcodeScannerService | null = null

export function getScannerService(): BarcodeScannerService {
  if (!scannerInstance) {
    scannerInstance = new BarcodeScannerService()
  }
  return scannerInstance
}
