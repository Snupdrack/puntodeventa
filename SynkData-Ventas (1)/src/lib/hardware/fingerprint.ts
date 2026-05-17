import type { FingerprintConfig } from './index'
import { DEFAULT_FINGERPRINT_CONFIG } from './index'

// Stored credentials mapping
interface StoredCredential {
  credentialId: string
  userId: string
  createdAt: number
}

const STORAGE_KEY = 'synkdata-fingerprint-credentials'

export class FingerprintService {
  private config: FingerprintConfig = { ...DEFAULT_FINGERPRINT_CONFIG }

  updateConfig(config: Partial<FingerprintConfig>): void {
    this.config = { ...this.config, ...config }
  }

  isSupported(): boolean {
    if (typeof window === 'undefined') return false
    return !!window.PublicKeyCredential
  }

  async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isSupported()) return false
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    } catch {
      return false
    }
  }

  private getStoredCredentials(): StoredCredential[] {
    if (typeof window === 'undefined') return []
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try { return JSON.parse(saved) } catch { /* ignore */ }
    }
    return []
  }

  private saveCredential(credential: StoredCredential): void {
    const creds = this.getStoredCredentials()
    // Remove existing credential for this user
    const filtered = creds.filter(c => c.userId !== credential.userId)
    filtered.push(credential)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  }

  private removeCredential(userId: string): void {
    const creds = this.getStoredCredentials()
    const filtered = creds.filter(c => c.userId !== userId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  }

  async registerCredential(userId: string): Promise<{ success: boolean; credentialId: string; error?: string }> {
    if (!this.isSupported()) {
      return { success: false, credentialId: '', error: 'WebAuthn no está disponible en este navegador' }
    }

    try {
      // Challenge should come from the server in production
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      const userIdBuffer = new Uint8Array(16)
      crypto.getRandomValues(userIdBuffer)

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'SynkData-Ventas',
            id: window.location.hostname,
          },
          user: {
            id: userIdBuffer,
            name: userId,
            displayName: userId,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },   // ES256
            { alg: -257, type: 'public-key' },  // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      }) as PublicKeyCredential

      if (credential && credential.id) {
        this.saveCredential({
          credentialId: credential.id,
          userId,
          createdAt: Date.now(),
        })
        return { success: true, credentialId: credential.id }
      }

      return { success: false, credentialId: '', error: 'No se pudo registrar la credencial' }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      if (message.includes('NotAllowedError') || message.includes('cancelled')) {
        return { success: false, credentialId: '', error: 'Registro cancelado por el usuario' }
      }
      return { success: false, credentialId: '', error: message }
    }
  }

  async authenticate(): Promise<{ success: boolean; credentialId: string; userId?: string; error?: string }> {
    if (!this.isSupported()) {
      return { success: false, credentialId: '', error: 'WebAuthn no está disponible' }
    }

    const stored = this.getStoredCredentials()
    if (stored.length === 0) {
      return { success: false, credentialId: '', error: 'No hay huellas registradas' }
    }

    try {
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      const allowCredentials = stored.map(c => ({
        id: this.base64ToArrayBuffer(c.credentialId),
        type: 'public-key' as const,
      }))

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials,
          userVerification: 'required',
          timeout: 60000,
        },
      }) as PublicKeyCredential

      if (assertion && assertion.id) {
        const matched = stored.find(c => c.credentialId === assertion.id)
        return {
          success: true,
          credentialId: assertion.id,
          userId: matched?.userId,
        }
      }

      return { success: false, credentialId: '', error: 'Autenticación fallida' }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      if (message.includes('NotAllowedError') || message.includes('cancelled')) {
        return { success: false, credentialId: '', error: 'Autenticación cancelada' }
      }
      return { success: false, credentialId: '', error: message }
    }
  }

  getRegisteredCredentials(): StoredCredential[] {
    return this.getStoredCredentials()
  }

  deleteCredential(userId: string): void {
    this.removeCredential(userId)
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64.replace(/-/g, '+').replace(/_/g, '/'))
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }
}

// Singleton
let fingerprintInstance: FingerprintService | null = null

export function getFingerprintService(): FingerprintService {
  if (!fingerprintInstance) {
    fingerprintInstance = new FingerprintService()
  }
  return fingerprintInstance
}
