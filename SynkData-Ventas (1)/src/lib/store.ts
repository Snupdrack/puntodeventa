import { create } from 'zustand'

export type ModuleType =
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'inventory'
  | 'sales'
  | 'clients'
  | 'expenses'
  | 'audit'
  | 'branches'
  | 'cfdi'
  | 'hardware'
  | 'settings'

export interface CartItem {
  productId: string
  name: string
  sku: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
}

export interface User {
  id: string
  email: string
  name: string
  role: string
  avatar?: string | null
  branchId?: string | null
}

export interface Branch {
  id: string
  name: string
  code: string
}

interface AppState {
  // Navigation
  activeModule: ModuleType
  setActiveModule: (module: ModuleType) => void

  // POS State
  cart: CartItem[]
  addToCart: (item: CartItem) => void
  removeFromCart: (id: string) => void
  updateCartQuantity: (id: string, qty: number) => void
  clearCart: () => void

  // User session
  currentUser: User | null
  setCurrentUser: (user: User | null) => void
  currentBranch: Branch | null
  setCurrentBranch: (branch: Branch | null) => void

  // Sidebar
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  activeModule: 'dashboard',
  setActiveModule: (module) => set({ activeModule: module }),

  // POS State
  cart: [],
  addToCart: (item) =>
    set((state) => {
      const existingIndex = state.cart.findIndex(
        (ci) => ci.productId === item.productId
      )
      if (existingIndex >= 0) {
        const updated = [...state.cart]
        const existing = updated[existingIndex]
        const newQty = existing.quantity + item.quantity
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          total: newQty * existing.unitPrice * (1 - existing.discount / 100),
        }
        return { cart: updated }
      }
      return { cart: [...state.cart, item] }
    }),
  removeFromCart: (id) =>
    set((state) => ({
      cart: state.cart.filter((ci) => ci.productId !== id),
    })),
  updateCartQuantity: (id, qty) =>
    set((state) => ({
      cart: state.cart.map((ci) =>
        ci.productId === id
          ? {
              ...ci,
              quantity: qty,
              total: qty * ci.unitPrice * (1 - ci.discount / 100),
            }
          : ci
      ),
    })),
  clearCart: () => set({ cart: [] }),

  // User session
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  currentBranch: null,
  setCurrentBranch: (branch) => set({ currentBranch: branch }),

  // Sidebar
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
