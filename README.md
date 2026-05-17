# SynkData-Ventas

**Sistema Integral de Punto de Venta y Gestión Empresarial (POS & ERP)**

![Version](https://img.shields.io/badge/version-0.2.0-blue)
![Stack](https://img.shields.io/badge/stack-Next.js_16%20%2B%20Prisma%20%2B%20TypeScript-teal)
![License](https://img.shields.io/badge/license-Private-red)

---

## Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Arquitectura del Sistema](#arquitectura-del-sistema)
- [Módulos Funcionales](#módulos-funcionales)
- [Stack Tecnológico](#stack-tecnológico)
- [Requisitos del Sistema](#requisitos-del-sistema)
- [Instalación y Configuración](#instalación-y-configuración)
- [Despliegue en Producción](#despliegue-en-producción)
  - [Opción A: Servidor Dedicado (Bare Metal / VPS)](#opción-a-servidor-dedicado-bare-metal--vps)
  - [Opción B: Docker](#opción-b-docker)
  - [Opción C: Vercel](#opción-c-vercel)
- [Configuración de Servicios](#configuración-de-servicios)
- [Modo Offline / PWA](#modo-offline--pwa)
- [Hardware Compatible](#hardware-compatible)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Variables de Entorno](#variables-de-entorno)
- [Resolución de Problemas](#resolución-de-problemas)
- [Licencia](#licencia)

---

## Descripción General

SynkData-Ventas es un sistema de punto de venta (POS) y planificación de recursos empresariales (ERP) diseñado para el mercado mexicano. Incluye facturación electrónica CFDI 4.0, cobro con QR y contactless, soporte offline/PWA, y gestión multi-sucursal. Todo configurable desde la interfaz de usuario sin necesidad de modificar código.

### Características Principales

- **POS completo**: Cobro en efectivo, tarjeta, transferencia, QR, contactless/NFC, crédito y link de pago
- **Facturación CFDI 4.0**: Generación de comprobantes fiscales digitales con PAC configurables desde la UI
- **Multi-sucursal**: Gestión de inventario y ventas por sucursal
- **PWA / Offline**: Operación sin internet con sincronización automática al reconectar
- **Hardware**: Impresora térmica, escáner de códigos, lector de huella (opcional), caja registradora, display de cliente, báscula
- **Biometría opcional**: Autenticación con huella digital vía WebAuthn; no bloquea el sistema si no hay lector
- **Modo oscuro/claro**: Toggle de tema integrado en toda la interfaz
- **Servicios configurables**: Proveedores de cobro y facturación se configuran desde la UI sin tocar código
- **Auditoría**: Registro completo de acciones del sistema
- **Programa de lealtad**: Sistema de puntos configurable

---

## Arquitectura del Sistema

```
┌──────────────────────────────────────────────────────────────┐
│                    CANALES DE ENTRADA                         │
│  POS Touch │ Escáner │ Huella │ Báscula │ QR/NFC │ Browser  │
└───────────────────────┬──────────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────────┐
│                  MÓDULOS CORE (12)                            │
│  Dashboard │ POS │ Productos │ Inventario │ Ventas │ Clientes│
│  Gastos │ CFDI 4.0 │ Sucursales │ Auditoría │ Hardware │ Config│
└───────────────────────┬──────────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────────┐
│               SERVICIOS INTELIGENTES                          │
│  Offline Queue │ Auto-Sync │ Biometric Auth │ Price Rules    │
│  Loyalty Points │ Hardware Integration │ Multi-Branch        │
└───────────────────────┬──────────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────────┐
│                    STACK TÉCNICO                             │
│  Next.js 16 │ Prisma ORM │ SQLite │ Zustand │ TanStack Query│
│  shadcn/ui │ Tailwind CSS 4 │ Framer Motion │ Recharts       │
│  Service Worker │ IndexedDB │ Web Serial API │ WebAuthn      │
└──────────────────────────────────────────────────────────────┘
```

---

## Módulos Funcionales

| # | Módulo | Componente | Descripción |
|---|--------|------------|-------------|
| 1 | **Dashboard** | `dashboard.tsx` | KPIs, gráfica de ventas 30 días, top 5 productos, gastos por categoría |
| 2 | **POS / Ventas** | `pos.tsx` | Punto de venta con 6 métodos de pago, carrito, cobro QR/contactless, offline |
| 3 | **Productos** | `products.tsx` | CRUD de catálogo con búsqueda, filtros, paginación y validación Zod |
| 4 | **Inventario** | `inventory.tsx` | Stock por sucursal, alertas de bajo stock, ajustes (entrada/salida/transferencia) |
| 5 | **Historial Ventas** | `sales-history.tsx` | Historial expandible con filtros, detalles de items, estadísticas rápidas |
| 6 | **Clientes** | `clients.tsx` | Gestión de clientes con crédito, puntos de lealtad y segmentación |
| 7 | **Gastos** | `expenses.tsx` | Control de gastos operativos con gráficas y gastos recurrentes |
| 8 | **CFDI 4.0** | `cfdi.tsx` | Generación de facturas electrónicas, visor XML, campos fiscales mexicanos |
| 9 | **Sucursales** | `branches.tsx` | Gestión multi-sucursal con valor de inventario y usuarios asignados |
| 10 | **Auditoría** | `audit.tsx` | Visor de logs de auditoría con filtros por acción y entidad |
| 11 | **Hardware** | `hardware.tsx` | Configuración de 6 dispositivos: impresora, escáner, huella, caja, display, báscula |
| 12 | **Configuración** | `settings.tsx` | Usuarios, empresa, puntos, reglas de precio, servicios de cobro, servicios de facturación |

---

## Stack Tecnológico

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Next.js** | 16.x | Framework fullstack con App Router y standalone output |
| **React** | 19.x | UI library con hooks y server components |
| **TypeScript** | 5.x | Tipado estático |
| **Prisma ORM** | 6.x | ORM con SQLite (migrable a PostgreSQL) |
| **SQLite** | - | Base de datos embebida (producción: usar PostgreSQL) |
| **Tailwind CSS** | 4.x | Sistema de diseño utility-first |
| **shadcn/ui** | latest | Componentes UI accesibles (estilo new-york, base neutral) |
| **Recharts** | 2.x | Gráficas y visualizaciones |
| **Framer Motion** | 12.x | Animaciones fluidas |
| **Zustand** | 5.x | Estado global (app store + hardware store) |
| **TanStack Query** | 5.x | Cache y sincronización de datos server-state |
| **next-themes** | 0.4.x | Toggle modo oscuro/claro |
| **QRCode** | 1.5.x | Generación de códigos QR para cobro digital |
| **WebAuthn** | nativo | Autenticación biométrica (huella/Face ID) |
| **Service Worker** | nativo | PWA offline con IndexedDB y Background Sync |

---

## Requisitos del Sistema

### Desarrollo
- **Node.js** >= 18.x o **Bun** >= 1.0
- **npm**, **pnpm** o **bun** como gestor de paquetes
- 2 GB RAM mínimo
- 500 MB espacio en disco

### Producción
- **Servidor Linux** (Ubuntu 22.04+ recomendado)
- **2 vCPUs** mínimo (4 recomendado)
- **4 GB RAM** mínimo (8 GB recomendado para multi-sucursal)
- **20 GB SSD** mínimo
- **Node.js** >= 18.x o **Bun** >= 1.0
- **Caddy** o **Nginx** como reverse proxy (HTTPS obligatorio para WebAuthn y Web Serial)
- **Certificado SSL** (Let's Encrypt recomendado)

> **Nota sobre base de datos**: El proyecto usa SQLite por defecto para desarrollo y demos. Para producción con múltiples usuarios o concurrencia, se recomienda migrar a PostgreSQL. Ver la sección de migración más adelante.

---

## Instalación y Configuración

### 1. Descomprimir el proyecto

```bash
unzip SynkData-Ventas.zip -d SynkData-Ventas
cd SynkData-Ventas
```

### 2. Instalar dependencias

```bash
# Con bun (recomendado, más rápido)
bun install

# O con npm
npm install
```

### 3. Configurar variables de entorno

```bash
# El archivo .env ya viene con la configuración por defecto para SQLite:
cp .env.example .env  # Si no existe .env

# Contenido del .env:
DATABASE_URL="file:./db/custom.db"
```

### 4. Inicializar la base de datos

```bash
# Generar el cliente Prisma
bunx prisma generate

# Crear la base de datos y las tablas
bunx prisma db push

# Poblar con datos de demostración (opcional)
# Acceder a http://localhost:3000/api/seed después de iniciar el servidor
```

### 5. Iniciar en modo desarrollo

```bash
bun run dev
# O: npm run dev
```

Acceder a **http://localhost:3000** en el navegador.

### 6. Datos de acceso por defecto

| Campo | Valor |
|-------|-------|
| Usuario | `admin@synkdata.com` |
| Password | (cualquiera — demo sin autenticación estricta) |
| Sucursal | Sucursal Centro (CTR) |

---

## Despliegue en Producción

### Opción A: Servidor Dedicado (Bare Metal / VPS)

Esta es la opción recomendada para mayor control y rendimiento.

#### Paso 1: Preparar el servidor

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Bun (recomendado) o Node.js
curl -fsSL https://bun.sh/install | bash

# Instalar Caddy como reverse proxy
sudo apt install -y caddy
```

#### Paso 2: Subir el proyecto al servidor

```bash
# Via SCP
scp SynkData-Ventas.zip usuario@servidor:/opt/

# En el servidor
cd /opt
unzip SynkData-Ventas.zip -d synkdata-ventas
cd synkdata-ventas
```

#### Paso 3: Instalar y construir

```bash
bun install
bunx prisma generate
bunx prisma db push

# Construir el proyecto (genera standalone output)
bun run build
```

El comando `build` ejecuta:
1. `next build` — Compila la aplicación
2. Copia `static/` y `public/` al directorio standalone

#### Paso 4: Configurar el entorno de producción

```bash
# Editar el .env para producción
cat > .env << 'EOF'
DATABASE_URL="file:/opt/synkdata-ventas/db/production.db"
NODE_ENV="production"
PORT=3000
EOF
```

#### Paso 5: Probar la aplicación

```bash
# Iniciar manualmente para verificar
bun .next/standalone/server.js
# Verificar en http://localhost:3000
```

#### Paso 6: Configurar Caddy como reverse proxy

Crear o editar `/etc/caddy/Caddyfile`:

```caddyfile
tudominio.com {
    reverse_proxy localhost:3000

    # Headers de seguridad
    header {
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
    }

    # Compresión
    encode gzip zstd

    # Cache de assets estáticos
    @static path *.js *.css *.svg *.png *.jpg *.woff2
    header @static Cache-Control "public, max-age=31536000, immutable"
}
```

```bash
# Recargar Caddy
sudo caddy reload
```

#### Paso 7: Crear servicio systemd

Crear `/etc/systemd/system/synkdata-ventas.service`:

```ini
[Unit]
Description=SynkData-Ventas POS & ERP
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/synkdata-ventas
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/root/.bun/bin/bun .next/standalone/server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
# Habilitar e iniciar el servicio
sudo systemctl daemon-reload
sudo systemctl enable synkdata-ventas
sudo systemctl start synkdata-ventas

# Verificar estado
sudo systemctl status synkdata-ventas

# Ver logs
sudo journalctl -u synkdata-ventas -f
```

---

### Opción B: Docker

#### Dockerfile

Crear un archivo `Dockerfile` en la raíz del proyecto:

```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

# Instalar dependencias
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Construir la aplicación
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bunx prisma generate
RUN bun run build

# Imagen de producción
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/db ./db

USER nextjs
EXPOSE 3000

CMD ["bun", "server.js"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:/app/db/production.db
      - NODE_ENV=production
    volumes:
      - app-db:/app/db
    restart: unless-stopped

  caddy:
    image: caddy:2
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy-data:/data
      - caddy-config:/config
    restart: unless-stopped
    depends_on:
      - app

volumes:
  app-db:
  caddy-data:
  caddy-config:
```

#### Despliegue

```bash
docker compose up -d --build
docker compose logs -f app
```

---

### Opción C: Vercel

> **Nota**: Vercel es serverless y no soporta SQLite. Se requiere migrar a PostgreSQL o usar Vercel Postgres.

#### Paso 1: Migrar a PostgreSQL

Editar `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Configurar `.env`:

```env
DATABASE_URL="postgresql://usuario:password@host:5432/synkdata_ventas"
```

#### Paso 2: Desplegar

```bash
# Instalar Vercel CLI
bun add -g vercel

# Desplegar
vercel --prod
```

Configurar en el dashboard de Vercel:
- `DATABASE_URL` como variable de entorno
- Framework preset: **Next.js**

---

## Migración a PostgreSQL (Recomendado para Producción)

Para entornos con múltiples usuarios concurrentes o multi-sucursal, PostgreSQL es altamente recomendado sobre SQLite:

```bash
# 1. Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# 2. Crear base de datos
sudo -u postgres psql
CREATE DATABASE synkdata_ventas;
CREATE USER synkdata WITH PASSWORD 'tu_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE synkdata_ventas TO synkdata;
\q

# 3. Actualizar prisma/schema.prisma
# Cambiar: provider = "sqlite"
# Por:     provider = "postgresql"

# 4. Actualizar .env
DATABASE_URL="postgresql://synkdata:tu_password_seguro@localhost:5432/synkdata_ventas"

# 5. Aplicar migración
bunx prisma migrate dev --name init-postgresql

# 6. Reconstruir
bun run build
```

---

## Configuración de Servicios

### Proveedores de Cobro (QR / Contactless / Link de Pago)

Los servicios de cobro se configuran desde **Configuración → Servicios de Cobro** en la interfaz. No se requiere modificar código.

| Proveedor | Tipo | Descripción |
|-----------|------|-------------|
| **Mercado Pago** | QR | Cobro con código QR desde la app bancaria del cliente |
| **Stripe Terminal** | Contactless | Terminal de tarjeta con lectura NFC |
| **Clip** | Contactless | Terminal de cobro mexicano con lectura NFC |
| **PayPal QR** | QR | Cobro con código QR de PayPal |
| **Link de Pago** | Link | Generación de enlace de pago para enviar al cliente |

Para activar un proveedor:
1. Ir a **Configuración → Servicios de Cobro**
2. Activar el toggle del proveedor deseado
3. Presionar **Configurar** e ingresar las credenciales API (API Key, Secret Key, Merchant ID)
4. Configurar el Webhook URL si se requiere notificación de pago en tiempo real
5. Activar **Modo Sandbox** para pruebas, desactivar para producción
6. Presionar **Guardar Todo**
7. El método de pago aparecerá automáticamente en el POS

### Proveedores de Facturación (CFDI 4.0 / PAC)

Los proveedores de facturación se configuran desde **Configuración → Servicios de Facturación** en la interfaz.

| Proveedor | Descripción |
|-----------|-------------|
| **Facturama** | PAC con API REST completa para timbrado CFDI 4.0 |
| **SW Sapien** | Solución de timbrado con SDK para múltiples lenguajes |
| **PM Comercial** | PAC mexicano con soporte para cancelación y complementos |
| **Solución Factible** | PAC con API robusta y soporte para todos los CFDI |

Para activar un PAC:
1. Ir a **Configuración → Servicios de Facturación**
2. Activar el proveedor y configurar las credenciales
3. Ingresar el RFC del PAC y la URL del API
4. Activar sandbox para pruebas
5. Guardar

---

## Modo Offline / PWA

SynkData-Ventas está diseñado para funcionar sin conexión a internet:

### Cómo funciona

1. **Service Worker** (`public/sw.js`): Intercepta todas las peticiones HTTP
   - **API GET**: Estrategia *network-first* — intenta la red, si falla usa cache
   - **API POST/PUT/DELETE**: Si no hay red, se encola en IndexedDB
   - **Assets estáticos**: Estrategia *cache-first* — sirve desde cache inmediatamente

2. **IndexedDB** (`synkdata-offline`): Cola de operaciones pendientes
   - Las ventas realizadas offline se guardan automáticamente
   - Se muestran como "PEND" en el recibo con indicador visual

3. **Background Sync**: Cuando se recupera la conexión
   - El service worker procesa automáticamente la cola
   - Se notifica al usuario cuántas ventas se sincronizaron
   - La interfaz se actualiza automáticamente

4. **Indicador de conexión**: Banner visual en el POS que muestra:
   - Estado online/offline
   - Número de operaciones pendientes
   - Botón de sincronización manual

### Instalación como PWA

1. Abrir la aplicación en Chrome/Edge
2. Click en el ícono de instalación en la barra de direcciones
3. O usar el menú → "Instalar SynkData-Ventas"
4. La aplicación se instala como app de escritorio/móvil
5. Funciona completamente offline después de la primera carga

### Requisitos para Offline

- **HTTPS obligatorio** para Service Worker y WebAuthn
- Primera carga debe ser con conexión (para cacheo inicial)
- El navegador debe soportar Service Workers (Chrome, Edge, Firefox, Safari)

---

## Hardware Compatible

Todos los dispositivos de hardware son **opcionales**. El sistema funciona completamente sin ellos. Si un dispositivo no está disponible, el sistema simplemente no muestra esa opción — **nunca bloquea la operación**.

| Dispositivo | API Utilizada | Conexión | Requisitos |
|-------------|---------------|----------|------------|
| **Impresora Térmica** | Web Serial API | Serial/USB | Chrome/Edge + HTTPS |
| **Escáner de Códigos** | USB HID / BarcodeDetector / Camera | USB/Cámara | Navegador moderno |
| **Lector de Huella** | WebAuthn | Biometría nativa | Dispositivo con huella/Face ID + HTTPS |
| **Caja Registradora** | Vía impresora / Serial | Serial | Impresora conectada |
| **Display de Cliente** | Presentation API / Serial / Ventana | Secondary display | Pantalla secundaria |
| **Báscula** | Web Serial API | Serial | Chrome/Edge + HTTPS |

### Lector de Huella (Biometría) — OPCIONAL

El lector de huella es completamente opcional y usa WebAuthn (estándar del navegador):

- **Si el dispositivo tiene lector**: Se detecta automáticamente y se habilitan las opciones de login con huella y registro de asistencia
- **Si no hay lector**: El sistema funciona normalmente, la sección de huella muestra "No disponible" y no interrumpe ninguna operación
- **Configuración**: Hardware → Lector de Huella → Activar toggles deseados
- **Seguridad**: Las credenciales se almacenan en el authenticador del dispositivo, nunca en el servidor

> **Importante**: WebAuthn requiere HTTPS para funcionar. En localhost funciona para desarrollo.

---

## Estructura del Proyecto

```
SynkData-Ventas/
├── .env                          # Variables de entorno
├── .gitignore
├── Caddyfile                     # Configuración de reverse proxy
├── components.json               # Configuración de shadcn/ui
├── eslint.config.mjs             # Configuración de ESLint
├── next.config.ts                # Configuración de Next.js (standalone output)
├── package.json                  # Dependencias y scripts
├── postcss.config.mjs            # PostCSS con Tailwind
├── tailwind.config.ts            # Tailwind CSS (dark mode, colores SynkData)
├── tsconfig.json                 # TypeScript
│
├── prisma/
│   └── schema.prisma             # Schema completo (13 modelos, 6 enums)
│
├── public/
│   ├── icon.svg                  # Ícono de la app (PWA)
│   ├── logo.svg                  # Logo de SynkData
│   ├── manifest.json             # PWA manifest
│   ├── robots.txt
│   └── sw.js                     # Service Worker (offline)
│
└── src/
    ├── app/
    │   ├── globals.css           # Estilos globales + variables CSS (light/dark)
    │   ├── layout.tsx            # Layout raíz (ThemeProvider, QueryProvider, SW)
    │   ├── page.tsx              # SPA principal (sidebar + módulos)
    │   └── api/                  # API Routes (15+ endpoints)
    │       ├── route.ts
    │       ├── init/route.ts
    │       ├── seed/route.ts
    │       ├── dashboard/route.ts
    │       ├── categories/route.ts
    │       ├── products/route.ts
    │       ├── sales/route.ts
    │       ├── inventory/
    │       │   ├── route.ts
    │       │   ├── alerts/route.ts
    │       │   └── adjust/route.ts
    │       ├── pos/
    │       │   ├── sale/route.ts
    │       │   ├── products/route.ts
    │       │   └── clients/route.ts
    │       ├── clients/
    │       │   ├── route.ts
    │       │   └── points/route.ts
    │       ├── expenses/
    │       │   ├── route.ts
    │       │   └── summary/route.ts
    │       ├── branches/route.ts
    │       ├── users/route.ts
    │       ├── audit/route.ts
    │       ├── cfdi/route.ts
    │       └── price-rules/route.ts
    │
    ├── components/
    │   ├── modules/              # 12 módulos de la aplicación
    │   │   ├── dashboard.tsx
    │   │   ├── pos.tsx           # POS con QR, contactless, offline
    │   │   ├── products.tsx
    │   │   ├── inventory.tsx
    │   │   ├── clients.tsx
    │   │   ├── expenses.tsx
    │   │   ├── sales-history.tsx
    │   │   ├── cfdi.tsx
    │   │   ├── branches.tsx
    │   │   ├── audit.tsx
    │   │   ├── hardware.tsx      # Configuración de 6 dispositivos
    │   │   └── settings.tsx      # 7+ tabs incluyendo servicios
    │   ├── providers/
    │   │   └── query-provider.tsx
    │   ├── offline-indicator.tsx # Banner online/offline
    │   └── ui/                   # 45+ componentes shadcn/ui
    │
    ├── hooks/
    │   ├── use-mobile.ts
    │   └── use-toast.ts
    │
    └── lib/
        ├── db.ts                 # Prisma client singleton
        ├── utils.ts              # Utilidades (cn, formatMXN)
        ├── store.ts              # Zustand store (navegación, carrito, sesión)
        ├── offline.ts            # Cola offline (IndexedDB + SW helpers)
        └── hardware/
            ├── index.ts          # Tipos y configuraciones por defecto
            ├── printer.ts        # ThermalPrinterService (ESC/POS)
            ├── scanner.ts        # BarcodeScannerService (USB HID + cámara)
            ├── fingerprint.ts    # FingerprintService (WebAuthn)
            ├── cash-drawer.ts    # CashDrawerService (vía impresora/serial)
            ├── customer-display.ts # CustomerDisplayService
            ├── scale.ts          # ScaleService (serial)
            └── store.ts          # Zustand hardware store
```

---

## Variables de Entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `DATABASE_URL` | `file:./db/custom.db` | URL de conexión a la base de datos |
| `NODE_ENV` | `development` | Entorno de ejecución |
| `PORT` | `3000` | Puerto del servidor |

Para PostgreSQL en producción:

```env
DATABASE_URL="postgresql://usuario:password@host:5432/synkdata_ventas?schema=public"
NODE_ENV=production
PORT=3000
```

---

## Resolución de Problemas

### La aplicación no carga offline

- Verificar que el Service Worker se registró: DevTools → Application → Service Workers
- Asegurar que se cargó al menos una vez con conexión
- Verificar HTTPS (requerido para SW)
- Limpiar cache y recargar: DevTools → Application → Clear storage

### WebAuthn / Huella no funciona

- Verificar HTTPS (obligatorio para WebAuthn, excepto en localhost)
- Verificar que el navegador soporta WebAuthn: Chrome 67+, Edge 18+, Safari 14+
- Verificar que el dispositivo tiene lector de huella o Face ID
- Si no hay lector: el sistema funciona normalmente sin biometría (es opcional)

### Web Serial API no detecta impresora

- Usar Chrome o Edge (Firefox y Safari no soportan Web Serial)
- Verificar HTTPS
- Verificar permisos del navegador: chrome://settings/content/serialDevices
- La impresora debe estar conectada antes de intentar conectar

### Error de base de datos en producción

- Si usas SQLite: `bunx prisma db push` para sincronizar el schema
- Si migraste a PostgreSQL: `bunx prisma migrate deploy` para aplicar migraciones
- Verificar que `DATABASE_URL` es correcta

### La aplicación no inicia

- Verificar que el build se completó: `bun run build`
- Verificar que el directorio `.next/standalone/` existe
- Verificar permisos del directorio `db/` (SQLite necesita escritura)
- Ver logs: `sudo journalctl -u synkdata-ventas -f`

### Migración de SQLite a PostgreSQL

```bash
# 1. Exportar datos de SQLite
bunx prisma db pull   # Genera schema desde la DB existente

# 2. Cambiar provider a postgresql en schema.prisma

# 3. Crear migración inicial
bunx prisma migrate dev --name init-postgresql

# 4. Importar datos (usar script SQL o Prisma seed)
# Los datos de demo se pueden regenerar accediendo a /api/seed
```

---

## Comandos Útiles

```bash
# Desarrollo
bun run dev                    # Iniciar servidor de desarrollo en puerto 3000
bun run lint                   # Ejecutar linter

# Base de datos
bunx prisma generate           # Generar cliente Prisma
bunx prisma db push            # Sincronizar schema con la DB (sin migraciones)
bunx prisma migrate dev        # Crear y aplicar migración (PostgreSQL)
bunx prisma studio             # Abrir Prisma Studio (editor visual de DB)

# Producción
bun run build                  # Construir para producción (standalone)
bun run start                  # Iniciar servidor de producción

# Seed de datos demo
# Acceder a http://localhost:3000/api/seed para poblar con datos de ejemplo
# (22 productos, 83 ventas, 6 clientes, 5 CFDIs, 5 sucursales)
```

---

## Licencia

**Privado** — Todos los derechos reservados. SynkData-Ventas es software propietario.

---

**Desarrollado con el estilo SynkData**: Teal/Emerald primary, Amber/Gold accent.
