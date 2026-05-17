'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, WifiOff, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { onConnectionChange, getOfflineQueue, processOfflineQueue } from '@/lib/offline'
import { Button } from '@/components/ui/button'

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator !== 'undefined') return navigator.onLine
    return true
  })
  const [pendingCount, setPendingCount] = useState(0)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncStatusRef = useRef<SyncStatus>('idle')

  // Keep ref in sync
  useEffect(() => {
    syncStatusRef.current = syncStatus
  }, [syncStatus])

  const handleSync = useCallback(async () => {
    if (syncStatusRef.current === 'syncing') return

    const queue = await getOfflineQueue()
    if (queue.length === 0) return

    setSyncStatus('syncing')

    try {
      const result = await processOfflineQueue()

      setPendingCount(result.remaining)

      if (result.processed > 0) {
        setSyncStatus('synced')
        toast.success(`${result.processed} operación${result.processed > 1 ? 'es' : ''} sincronizada${result.processed > 1 ? 's' : ''}`, {
          description: result.failed > 0
            ? `${result.failed} operación${result.failed > 1 ? 'es' : ''} fallida${result.failed > 1 ? 's' : ''}`
            : 'Todas las operaciones pendientes se procesaron correctamente',
          icon: <CheckCircle2 className="size-4 text-emerald-500" />,
        })
      }

      if (result.failed > 0 && result.processed === 0) {
        setSyncStatus('error')
        toast.error('Error al sincronizar', {
          description: 'Algunas operaciones no pudieron ser procesadas',
        })
      }

      // Reset status after a delay
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
      syncTimeoutRef.current = setTimeout(() => {
        setSyncStatus('idle')
      }, 3000)
    } catch {
      setSyncStatus('error')
      toast.error('Error al sincronizar', {
        description: 'No se pudo procesar la cola offline',
      })

      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
      syncTimeoutRef.current = setTimeout(() => {
        setSyncStatus('idle')
      }, 3000)
    }
  }, [])

  // Subscribe to connection changes
  useEffect(() => {
    const unsubscribe = onConnectionChange((online) => {
      setIsOnline(online)

      if (online) {
        // Reset banner when coming back online
        setBannerDismissed(false)
        // Auto-sync when coming back online
        handleSync()
      } else {
        // Reset banner dismissal when going offline so it shows again
        setBannerDismissed(false)
      }
    })

    // Poll pending count
    const updateCount = async () => {
      const queue = await getOfflineQueue()
      setPendingCount(queue.length)
    }
    updateCount()
    const interval = setInterval(updateCount, 3000)

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [handleSync])

  // Show nothing when online and no pending items
  if (isOnline && pendingCount === 0 && syncStatus === 'idle') {
    return null
  }

  return (
    <>
      {/* ====== Full Banner (dismissible) ====== */}
      <AnimatePresence>
        {!isOnline && !bannerDismissed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-2 bg-amber-500/90 dark:bg-amber-600/90 text-amber-950 dark:text-amber-50 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <WifiOff className="size-4 shrink-0" />
                <span className="font-medium truncate">Sin conexión</span>
                {pendingCount > 0 && (
                  <span className="text-xs opacity-80 shrink-0">
                    — {pendingCount} operación{pendingCount > 1 ? 'es' : ''} pendiente{pendingCount > 1 ? 's' : ''} de sincronizar
                  </span>
                )}
              </div>
              <button
                onClick={() => setBannerDismissed(true)}
                className="text-xs underline opacity-70 hover:opacity-100 shrink-0"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== Syncing Banner ====== */}
      <AnimatePresence>
        {isOnline && syncStatus === 'syncing' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500/90 dark:bg-emerald-600/90 text-emerald-950 dark:text-emerald-50 text-sm">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              >
                <RefreshCw className="size-4" />
              </motion.div>
              <span className="font-medium">Sincronizando operaciones pendientes...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== Synced Banner ====== */}
      <AnimatePresence>
        {isOnline && syncStatus === 'synced' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500/90 dark:bg-emerald-600/90 text-emerald-950 dark:text-emerald-50 text-sm">
              <CheckCircle2 className="size-4" />
              <span className="font-medium">Sincronización completada</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== Small persistent indicator (in top bar area) ====== */}
      <AnimatePresence>
        {(!isOnline || pendingCount > 0) && bannerDismissed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 right-4 z-50"
          >
            <Button
              variant="outline"
              size="sm"
              className={`h-8 gap-1.5 text-xs shadow-lg border-2 ${
                !isOnline
                  ? 'bg-amber-50 dark:bg-amber-950 border-amber-400 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900'
                  : 'bg-emerald-50 dark:bg-emerald-950 border-emerald-400 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900'
              }`}
              onClick={() => {
                if (isOnline) {
                  handleSync()
                } else {
                  // Re-show the banner
                  setBannerDismissed(false)
                }
              }}
            >
              {!isOnline ? (
                <>
                  <CloudOff className="size-3.5" />
                  <span>Offline</span>
                  {pendingCount > 0 && (
                    <span className="inline-flex items-center justify-center size-4 rounded-full bg-amber-500 text-white text-[9px] font-bold">
                      {pendingCount}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Wifi className="size-3.5" />
                  <span>{pendingCount} pendiente{pendingCount > 1 ? 's' : ''}</span>
                </>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
