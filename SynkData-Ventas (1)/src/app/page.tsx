'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Receipt,
  Users,
  ReceiptText,
  FileText,
  Building2,
  Shield,
  Settings,
  ChevronLeft,
  Moon,
  Sun,
  LogOut,
  Zap,
  Cpu,
} from 'lucide-react'
import { useTheme } from 'next-themes'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAppStore, type ModuleType } from '@/lib/store'
import POS from '@/components/modules/pos'
import Dashboard from '@/components/modules/dashboard'
import Products from '@/components/modules/products'
import Inventory from '@/components/modules/inventory'
import Clients from '@/components/modules/clients'
import Expenses from '@/components/modules/expenses'
import Audit from '@/components/modules/audit'
import Branches from '@/components/modules/branches'
import SalesHistory from '@/components/modules/sales-history'
import CFDI from '@/components/modules/cfdi'
import Hardware from '@/components/modules/hardware'
import SettingsModule from '@/components/modules/settings'
import OfflineIndicator from '@/components/offline-indicator'

const navItems: {
  module: ModuleType
  label: string
  icon: React.ElementType
  badge?: string
  group: string
}[] = [
  { module: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'General' },
  { module: 'pos', label: 'POS / Ventas', icon: ShoppingCart, group: 'Operaciones' },
  { module: 'products', label: 'Productos', icon: Package, group: 'Operaciones' },
  { module: 'inventory', label: 'Inventario', icon: Warehouse, group: 'Operaciones' },
  { module: 'sales', label: 'Ventas', icon: Receipt, group: 'Operaciones' },
  { module: 'clients', label: 'Clientes', icon: Users, group: 'Operaciones' },
  { module: 'expenses', label: 'Gastos', icon: ReceiptText, group: 'Finanzas' },
  { module: 'cfdi', label: 'Facturación CFDI', icon: FileText, group: 'Finanzas' },
  { module: 'branches', label: 'Sucursales', icon: Building2, group: 'Administración' },
  { module: 'audit', label: 'Auditoría', icon: Shield, group: 'Administración' },
  { module: 'hardware', label: 'Hardware', icon: Cpu, group: 'Sistema' },
  { module: 'settings', label: 'Configuración', icon: Settings, group: 'Sistema' },
]

const groupedNav = navItems.reduce<Record<string, typeof navItems>>((acc, item) => {
  if (!acc[item.group]) acc[item.group] = []
  acc[item.group].push(item)
  return acc
}, {})

function ModulePlaceholder({ module }: { module: ModuleType }) {
  const item = navItems.find((n) => n.module === module)
  const Icon = item?.icon ?? LayoutDashboard
  const label = item?.label ?? module

  const descriptions: Record<ModuleType, string> = {
    dashboard: 'Vista general del negocio con métricas clave, gráficas y resumen de actividad.',
    pos: 'Punto de venta rápido con búsqueda de productos, carrito y cobro.',
    products: 'Gestión del catálogo de productos, precios y categorías.',
    inventory: 'Control de existencias por sucursal, ajustes y alertas de stock bajo.',
    sales: 'Historial de ventas, filtros por fecha/sucursal y detalle de tickets.',
    clients: 'Directorio de clientes, créditos, puntos y historial de compras.',
    expenses: 'Registro y categorización de gastos operativos.',
    cfdi: 'Generación y gestión de facturas CFDI 4.0.',
    branches: 'Administración de sucursales y configuración por ubicación.',
    audit: 'Registro de actividades del sistema y trazabilidad.',
    hardware: 'Configuración de impresora, escáner, báscula y periféricos.',
    settings: 'Configuración general del sistema, usuarios y permisos.',
  }

  return (
    <motion.div
      key={module}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center min-h-[60vh] px-4"
    >
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        <div className="relative">
          <div className="absolute -inset-4 bg-primary/10 rounded-2xl blur-xl" />
          <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20">
            <Icon className="w-10 h-10 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">{label}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {descriptions[module]}
          </p>
        </div>
        <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs">
          <Zap className="w-3 h-3" />
          Módulo en desarrollo
        </Badge>
      </div>
    </motion.div>
  )
}

function AppSidebar() {
  const { activeModule, setActiveModule, currentUser, currentBranch } = useAppStore()
  const { state } = useSidebar()
  const { theme, setTheme } = useTheme()

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="hover:bg-sidebar-accent/50"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Zap className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold tracking-tight">SynkData</span>
                <span className="truncate text-xs text-sidebar-foreground/60">Ventas POS & ERP</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {Object.entries(groupedNav).map(([group, items]) => (
          <SidebarGroup key={group}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold">
              {group}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.module}>
                    <SidebarMenuButton
                      isActive={activeModule === item.module}
                      onClick={() => setActiveModule(item.module)}
                      tooltip={item.label}
                      className={
                        activeModule === item.module
                          ? 'bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary font-medium'
                          : 'hover:bg-sidebar-accent/50'
                      }
                    >
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                          {item.badge}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <Separator className="bg-sidebar-border/50 mb-2" />
        {/* Branch indicator */}
        {currentBranch && state === 'expanded' && (
          <div className="flex items-center gap-2 px-2 py-1 mb-1 rounded-md bg-sidebar-accent/30">
            <Building2 className="size-3.5 text-primary" />
            <span className="text-xs text-sidebar-foreground/70 truncate">
              {currentBranch.name}
            </span>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="hover:bg-sidebar-accent/50"
            >
              <Avatar className="size-8 border border-sidebar-border">
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                  {currentUser
                    ? currentUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                    : 'SD'}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {currentUser?.name ?? 'SynkData User'}
                </span>
                <span className="truncate text-xs text-sidebar-foreground/50">
                  {currentUser?.role ?? 'Admin'}
                </span>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-sidebar-foreground/50 hover:text-sidebar-foreground"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                >
                  {theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
                </Button>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function TopBar() {
  const { activeModule } = useAppStore()
  const { theme, setTheme } = useTheme()
  const item = navItems.find((n) => n.module === activeModule)
  const Icon = item?.icon ?? LayoutDashboard
  const label = item?.label ?? 'Dashboard'

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-background/80 backdrop-blur-sm px-4 sticky top-0 z-20">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5" />
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <h1 className="text-sm font-semibold tracking-tight">{label}</h1>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? (
            <><Sun className="size-3.5" /> Claro</>
          ) : (
            <><Moon className="size-3.5" /> Oscuro</>
          )}
        </Button>
      </div>
    </header>
  )
}

export default function Home() {
  const { activeModule, setCurrentUser, setCurrentBranch } = useAppStore()

  // Set default user/branch on mount from DB
  useEffect(() => {
    async function loadInit() {
      try {
        const res = await fetch('/api/init')
        if (res.ok) {
          const data = await res.json()
          setCurrentUser({
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            branchId: data.user.branchId,
          })
          setCurrentBranch({
            id: data.branch.id,
            name: data.branch.name,
            code: data.branch.code,
          })
        }
      } catch {
        // Fallback to demo values
        setCurrentUser({
          id: 'demo-admin',
          email: 'admin@synkdata.com',
          name: 'Admin General',
          role: 'ADMIN_GENERAL',
          branchId: undefined,
        })
        setCurrentBranch({
          id: 'branch-centro',
          name: 'Sucursal Centro',
          code: 'CTR',
        })
      }
    }
    loadInit()
  }, [setCurrentUser, setCurrentBranch])

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset>
        <TopBar />
        <OfflineIndicator />
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            {activeModule === 'dashboard' ? (
              <Dashboard key="dashboard" />
            ) : activeModule === 'pos' ? (
              <POS key="pos" />
            ) : activeModule === 'products' ? (
              <Products key="products" />
            ) : activeModule === 'inventory' ? (
              <Inventory key="inventory" />
            ) : activeModule === 'clients' ? (
              <Clients key="clients" />
            ) : activeModule === 'expenses' ? (
              <Expenses key="expenses" />
            ) : activeModule === 'audit' ? (
              <Audit key="audit" />
            ) : activeModule === 'branches' ? (
              <Branches key="branches" />
            ) : activeModule === 'sales' ? (
              <SalesHistory key="sales" />
            ) : activeModule === 'cfdi' ? (
              <CFDI key="cfdi" />
            ) : activeModule === 'hardware' ? (
              <Hardware key="hardware" />
            ) : activeModule === 'settings' ? (
              <SettingsModule key="settings" />
            ) : (
              <ModulePlaceholder key={activeModule} module={activeModule} />
            )}
          </AnimatePresence>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
