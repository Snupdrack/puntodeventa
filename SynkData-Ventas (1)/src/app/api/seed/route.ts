import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Clean existing data (order matters due to relations)
    await db.cFDI.deleteMany()
    await db.saleItem.deleteMany()
    await db.sale.deleteMany()
    await db.pointsTransaction.deleteMany()
    await db.expense.deleteMany()
    await db.auditLog.deleteMany()
    await db.inventoryAdjustment.deleteMany()
    await db.inventory.deleteMany()
    await db.priceRule.deleteMany()
    await db.dailyStat.deleteMany()
    await db.product.deleteMany()
    await db.category.deleteMany()
    await db.client.deleteMany()
    await db.user.deleteMany()
    await db.branch.deleteMany()

    // ---- BRANCHES ----
    const branchCentro = await db.branch.create({
      data: {
        name: 'Sucursal Centro',
        code: 'CTR',
        address: 'Av. Revolución 1250, Col. Centro, CDMX',
        phone: '+52 55 1234 5678',
        active: true,
      },
    })
    const branchNorte = await db.branch.create({
      data: {
        name: 'Sucursal Norte',
        code: 'NTE',
        address: 'Blvd. Manuel Ávila Camacho 350, Tlalnepantla, Edo. Méx.',
        phone: '+52 55 8765 4321',
        active: true,
      },
    })

    // ---- USERS ----
    const users = await Promise.all([
      db.user.create({
        data: {
          email: 'admin@synkdata.com',
          password: 'demo123',
          name: 'María García López',
          role: 'ADMIN_GENERAL',
          active: true,
        },
      }),
      db.user.create({
        data: {
          email: 'gerente@synkdata.com',
          password: 'demo123',
          name: 'Carlos Hernández Ruiz',
          role: 'GERENTE',
          branchId: branchCentro.id,
          active: true,
        },
      }),
      db.user.create({
        data: {
          email: 'cajero@synkdata.com',
          password: 'demo123',
          name: 'Ana Martínez Díaz',
          role: 'CAJERO',
          branchId: branchCentro.id,
          active: true,
        },
      }),
      db.user.create({
        data: {
          email: 'vendedor@synkdata.com',
          password: 'demo123',
          name: 'Roberto Sánchez Torres',
          role: 'VENDEDOR',
          branchId: branchNorte.id,
          active: true,
        },
      }),
    ])

    // ---- CATEGORIES ----
    const categories = await Promise.all([
      db.category.create({ data: { name: 'Electrónica', icon: 'Monitor', color: '#14b8a6', active: true } }),
      db.category.create({ data: { name: 'Ropa', icon: 'Shirt', color: '#f59e0b', active: true } }),
      db.category.create({ data: { name: 'Alimentos', icon: 'Apple', color: '#ef4444', active: true } }),
      db.category.create({ data: { name: 'Hogar', icon: 'Home', color: '#8b5cf6', active: true } }),
      db.category.create({ data: { name: 'Oficina', icon: 'Briefcase', color: '#3b82f6', active: true } }),
      db.category.create({ data: { name: 'Otros', icon: 'Package', color: '#6b7280', active: true } }),
    ])

    const [electronica, ropa, alimentos, hogar, oficina, otros] = categories

    // ---- PRODUCTS ----
    const products = await Promise.all([
      // Electrónica
      db.product.create({ data: { sku: 'ELEC-001', barcode: '7501234567890', name: 'Monitor LED 24"', description: 'Monitor Full HD IPS 24 pulgadas', categoryId: electronica.id, costPrice: 2800, salePrice: 4299, unit: 'pieza', trackStock: true, active: true } }),
      db.product.create({ data: { sku: 'ELEC-002', barcode: '7501234567891', name: 'Teclado Mecánico RGB', description: 'Teclado mecánico switches azules con retroiluminación', categoryId: electronica.id, costPrice: 650, salePrice: 1299, unit: 'pieza', trackStock: true, active: true } }),
      db.product.create({ data: { sku: 'ELEC-003', barcode: '7501234567892', name: 'Mouse Inalámbrico', description: 'Mouse ergonómico 2.4GHz con receptor USB', categoryId: electronica.id, costPrice: 180, salePrice: 449, unit: 'pieza', trackStock: true, active: true } }),
      db.product.create({ data: { sku: 'ELEC-004', barcode: '7501234567893', name: 'Audífonos Bluetooth', description: 'Audífonos over-ear con cancelación de ruido', categoryId: electronica.id, costPrice: 890, salePrice: 1799, unit: 'pieza', trackStock: true, active: true } }),
      db.product.create({ data: { sku: 'ELEC-005', barcode: '7501234567894', name: 'Cargador USB-C 65W', description: 'Cargador rápido GaN con puerto USB-C', categoryId: electronica.id, costPrice: 220, salePrice: 549, unit: 'pieza', trackStock: true, active: true } }),

      // Ropa
      db.product.create({ data: { sku: 'ROPA-001', barcode: '7502234567890', name: 'Camiseta Polo Classic', description: 'Camiseta polo algodón premium', categoryId: ropa.id, costPrice: 120, salePrice: 349, unit: 'pieza', trackStock: true, active: true } }),
      db.product.create({ data: { sku: 'ROPA-002', barcode: '7502234567891', name: 'Jeans Slim Fit', description: 'Pantalón de mezclilla slim fit azul medio', categoryId: ropa.id, costPrice: 280, salePrice: 699, unit: 'pieza', trackStock: true, active: true } }),
      db.product.create({ data: { sku: 'ROPA-003', barcode: '7502234567892', name: 'Chaqueta Deportiva', description: 'Chaqueta ligera impermeable con capucha', categoryId: ropa.id, costPrice: 450, salePrice: 999, unit: 'pieza', trackStock: true, active: true } }),
      db.product.create({ data: { sku: 'ROPA-004', barcode: '7502234567893', name: 'Playera Básica Pack x3', description: 'Pack de 3 playeras algodón colores surtidos', categoryId: ropa.id, costPrice: 150, salePrice: 399, unit: 'pack', trackStock: true, active: true } }),

      // Alimentos
      db.product.create({ data: { sku: 'ALIM-001', barcode: '7503234567890', name: 'Café Orgánico 500g', description: 'Café de altura orgánico molido medio', categoryId: alimentos.id, costPrice: 85, salePrice: 189, unit: 'bolsa', trackStock: true, active: true } }),
      db.product.create({ data: { sku: 'ALIM-002', barcode: '7503234567891', name: 'Miel de Azahar 350ml', description: 'Miel pura de azahar artesanal', categoryId: alimentos.id, costPrice: 65, salePrice: 149, unit: 'frasco', trackStock: true, active: true } }),
      db.product.create({ data: { sku: 'ALIM-003', barcode: '7503234567892', name: 'Granola Artesanal 400g', description: 'Granola con nueces y miel sin conservadores', categoryId: alimentos.id, costPrice: 45, salePrice: 109, unit: 'bolsa', trackStock: true, active: true } }),
      db.product.create({ data: { sku: 'ALIM-004', barcode: '7503234567893', name: 'Chocolate Amargo 70% 100g', description: 'Barra de chocolate artesanal cacao mexicano', categoryId: alimentos.id, costPrice: 35, salePrice: 89, unit: 'barra', trackStock: true, active: true } }),

      // Hogar
      db.product.create({ data: { sku: 'HOGR-001', barcode: '7504234567890', name: 'Lámpara LED Escritorio', description: 'Lámpara de escritorio LED con 3 niveles de brillo', categoryId: hogar.id, costPrice: 190, salePrice: 449, unit: 'pieza', trackStock: true, active: true } }),
      db.product.create({ data: { sku: 'HOGR-002', barcode: '7504234567891', name: 'Organizador de Escritorio', description: 'Organizador multiusos de bambú', categoryId: hogar.id, costPrice: 120, salePrice: 299, unit: 'pieza', trackStock: true, active: true } }),
      db.product.create({ data: { sku: 'HOGR-003', barcode: '7504234567892', name: 'Taza Térmica 500ml', description: 'Taza de acero inoxidable doble pared', categoryId: hogar.id, costPrice: 95, salePrice: 249, unit: 'pieza', trackStock: true, active: true } }),

      // Oficina
      db.product.create({ data: { sku: 'OFNA-001', barcode: '7505234567890', name: 'Cuerno Profesional A4', description: 'Cuerno profesional con bolsillos y cierre', categoryId: oficina.id, costPrice: 180, salePrice: 399, unit: 'pieza', trackStock: true, active: true } }),
      db.product.create({ data: { sku: 'OFNA-002', barcode: '7505234567891', name: 'Calculadora Científica', description: 'Calculadora científica 240 funciones', categoryId: oficina.id, costPrice: 120, salePrice: 299, unit: 'pieza', trackStock: true, active: true } }),
      db.product.create({ data: { sku: 'OFNA-003', barcode: '7505234567892', name: 'Resma Papel A4 500 hojas', description: 'Papel bond 75g/m² blanco', categoryId: oficina.id, costPrice: 55, salePrice: 129, unit: 'resma', trackStock: true, active: true } }),
      db.product.create({ data: { sku: 'OFNA-004', barcode: '7505234567893', name: 'Marcadores Borrables Pack x8', description: 'Marcadores para pizarra blanca colores surtidos', categoryId: oficina.id, costPrice: 28, salePrice: 69, unit: 'pack', trackStock: true, active: true } }),

      // Otros
      db.product.create({ data: { sku: 'OTRO-001', barcode: '7506234567890', name: 'Bolsa Ecológica Grande', description: 'Bolsa reutilizable de tela resistente', categoryId: otros.id, costPrice: 25, salePrice: 79, unit: 'pieza', trackStock: true, active: true } }),
      db.product.create({ data: { sku: 'OTRO-002', barcode: '7506234567891', name: 'Termómetro Digital', description: 'Termómetro digital infrarrojo sin contacto', categoryId: otros.id, costPrice: 150, salePrice: 349, unit: 'pieza', trackStock: true, active: true } }),
    ])

    // ---- INVENTORY ----
    const inventoryData: { productId: string; branchId: string; quantity: number; minStock: number }[] = []
    for (const product of products) {
      inventoryData.push({
        productId: product.id,
        branchId: branchCentro.id,
        quantity: Math.floor(Math.random() * 80) + 10,
        minStock: 5,
      })
      inventoryData.push({
        productId: product.id,
        branchId: branchNorte.id,
        quantity: Math.floor(Math.random() * 60) + 5,
        minStock: 5,
      })
    }
    await db.inventory.createMany({ data: inventoryData })

    // ---- CLIENTS ----
    const clients = await Promise.all([
      db.client.create({ data: { name: 'Público General', email: null, phone: null, rfc: 'XAXX010101000', type: 'GENERAL', creditLimit: 0, creditUsed: 0, points: 0, active: true } }),
      db.client.create({ data: { name: 'Distribuidora del Norte S.A.', email: 'compras@distnorte.com', phone: '+52 81 2345 6789', rfc: 'DNO120315ABC', type: 'MAYORISTA', creditLimit: 50000, creditUsed: 12500, points: 3200, active: true } }),
      db.client.create({ data: { name: 'Laura Mendoza Vargas', email: 'laura.mendoza@email.com', phone: '+52 55 6789 0123', rfc: 'MOVL850415HDF', type: 'VIP', creditLimit: 10000, creditUsed: 0, points: 1580, active: true } }),
      db.client.create({ data: { name: 'Tech Solutions México', email: 'ventas@techsolutions.mx', phone: '+52 33 3456 7890', rfc: 'TSM190820R01', type: 'EMPRESARIAL', creditLimit: 100000, creditUsed: 45000, points: 8900, active: true } }),
      db.client.create({ data: { name: 'Fernando Jiménez Pérez', email: 'fernando.jp@email.com', phone: '+52 55 4567 8901', rfc: 'JIPF900312HMC', type: 'GENERAL', creditLimit: 0, creditUsed: 0, points: 340, active: true } }),
      db.client.create({ data: { name: 'Restaurante El Sazón', email: 'contacto@elsazon.com', phone: '+52 55 5678 9012', rfc: 'RSA180715PQ1', type: 'MAYORISTA', creditLimit: 30000, creditUsed: 8700, points: 5100, active: true } }),
    ])

    // ---- SALES ----
    const paymentMethods = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO', 'MIXTO'] as const
    const now = new Date()
    const salesCreated = []

    for (let day = 0; day < 30; day++) {
      const salesCount = Math.floor(Math.random() * 5) + 1
      for (let s = 0; s < salesCount; s++) {
        const saleDate = new Date(now)
        saleDate.setDate(saleDate.getDate() - day)
        saleDate.setHours(Math.floor(Math.random() * 10) + 8, Math.floor(Math.random() * 60))

        const branch = day % 2 === 0 ? branchCentro : branchNorte
        const user = users[day % 4]
        const client = clients[day % clients.length]
        const numItems = Math.floor(Math.random() * 4) + 1
        const saleProducts = products
          .sort(() => Math.random() - 0.5)
          .slice(0, numItems)

        const subtotal = saleProducts.reduce((sum, p) => {
          const qty = Math.floor(Math.random() * 3) + 1
          return sum + p.salePrice * qty
        }, 0)
        const taxRate = 0.16
        const tax = subtotal * taxRate
        const discount = Math.random() > 0.7 ? Math.floor(subtotal * 0.05) : 0
        const total = subtotal + tax - discount
        const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)]

        const sale = await db.sale.create({
          data: {
            folio: `V-${String(1000 + day * 10 + s).padStart(6, '0')}`,
            branchId: branch.id,
            userId: user.id,
            clientId: client.id,
            subtotal: Math.round(subtotal * 100) / 100,
            taxRate,
            tax: Math.round(tax * 100) / 100,
            discount,
            total: Math.round(total * 100) / 100,
            paymentMethod,
            cashReceived: paymentMethod === 'EFECTIVO' ? Math.ceil(total / 100) * 100 : null,
            change: paymentMethod === 'EFECTIVO' ? Math.ceil(total / 100) * 100 - total : null,
            status: 'COMPLETED',
            createdAt: saleDate,
            items: {
              create: saleProducts.map((p) => {
                const qty = Math.floor(Math.random() * 3) + 1
                return {
                  productId: p.id,
                  quantity: qty,
                  unitPrice: p.salePrice,
                  discount: 0,
                  taxRate: 0.16,
                  total: Math.round(p.salePrice * qty * 1.16 * 100) / 100,
                }
              }),
            },
          },
        })
        salesCreated.push(sale)
      }
    }

    // ---- EXPENSES ----
    const expenseCategories = ['ALQUILER', 'SERVICIOS', 'SUELDOS', 'MANTENIMIENTO', 'PUBLICIDAD', 'TRANSPORTE', 'OTROS'] as const
    const expenseDescriptions: Record<string, string[]> = {
      ALQUILER: ['Renta local sucursal centro', 'Renta local sucursal norte', 'Renta bodega almacenamiento'],
      SERVICIOS: ['Pago electricidad', 'Pago internet y telefonía', 'Servicio de agua', 'Servicio de gas'],
      SUELDOS: ['Nómina quincenal', 'Bonos ventas del mes', 'Pago horas extra'],
      MANTENIMIENTO: ['Mantenimiento equipo de cómputo', 'Reparación sistema de aire', 'Mantenimiento impresora POS'],
      PUBLICIDAD: ['Campaña redes sociales', 'Impresión flyers promocionales', 'Anuncios Google Ads'],
      TRANSPORTE: ['Envío paquetería', 'Gasolina vehículo repartos', 'Servicio de mensajería'],
      OTROS: ['Compra material empaque', 'Suscripción software', 'Gastos menores caja chica'],
    }

    for (let day = 0; day < 30; day += 3) {
      const cat = expenseCategories[Math.floor(Math.random() * expenseCategories.length)]
      const descs = expenseDescriptions[cat]
      const desc = descs[Math.floor(Math.random() * descs.length)]
      const expenseDate = new Date(now)
      expenseDate.setDate(expenseDate.getDate() - day)

      await db.expense.create({
        data: {
          category: cat,
          description: desc,
          amount: Math.round((Math.random() * 8000 + 500) * 100) / 100,
          date: expenseDate,
          branchId: day % 2 === 0 ? branchCentro.id : branchNorte.id,
          userId: users[Math.floor(Math.random() * users.length)].id,
          isRecurring: cat === 'ALQUILER' || cat === 'SERVICIOS',
        },
      })
    }

    // ---- AUDIT LOGS ----
    const auditActions = [
      { action: 'LOGIN', entity: 'User', details: 'Inicio de sesión exitoso' },
      { action: 'CREATE_SALE', entity: 'Sale', details: 'Venta registrada' },
      { action: 'UPDATE_PRODUCT', entity: 'Product', details: 'Precio de producto actualizado' },
      { action: 'ADJUST_INVENTORY', entity: 'Inventory', details: 'Ajuste de inventario por diferencia física' },
      { action: 'CREATE_CLIENT', entity: 'Client', details: 'Nuevo cliente registrado' },
      { action: 'CANCEL_SALE', entity: 'Sale', details: 'Venta cancelada por error de captura' },
      { action: 'CHANGE_ROLE', entity: 'User', details: 'Cambio de rol de usuario' },
      { action: 'EXPORT_REPORT', entity: 'Report', details: 'Exportación de reporte de ventas' },
    ]

    for (let day = 0; day < 14; day++) {
      const numLogs = Math.floor(Math.random() * 4) + 1
      for (let l = 0; l < numLogs; l++) {
        const logDate = new Date(now)
        logDate.setDate(logDate.getDate() - day)
        logDate.setHours(Math.floor(Math.random() * 8) + 9, Math.floor(Math.random() * 60))
        const audit = auditActions[Math.floor(Math.random() * auditActions.length)]

        await db.auditLog.create({
          data: {
            userId: users[Math.floor(Math.random() * users.length)].id,
            action: audit.action,
            entity: audit.entity,
            details: audit.details,
            ipAddress: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
            createdAt: logDate,
          },
        })
      }
    }

    // ---- POINTS TRANSACTIONS ----
    for (const client of clients.slice(1)) {
      // EARNED points
      const earned = Math.floor(Math.random() * 500) + 50
      await db.pointsTransaction.create({
        data: {
          clientId: client.id,
          points: earned,
          type: 'EARNED',
          description: `Puntos ganados por compra`,
          createdAt: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        },
      })
      // REDEEMED some
      if (client.points > 0) {
        const redeemed = Math.min(Math.floor(Math.random() * 200) + 10, client.points)
        await db.pointsTransaction.create({
          data: {
            clientId: client.id,
            points: redeemed,
            type: 'REDEEMED',
            description: `Puntos canjeados por descuento`,
            createdAt: new Date(now.getTime() - Math.random() * 15 * 24 * 60 * 60 * 1000),
          },
        })
      }
    }

    // ---- PRICE RULES ----
    await db.priceRule.createMany({
      data: [
        { name: 'Descuento Mayorista 15%', type: 'PERCENTAGE_DISCOUNT', value: 15, active: true },
        { name: 'Promo Electrónica $200 off', type: 'FIXED_DISCOUNT', value: 200, categoryId: electronica.id, active: true, startDate: new Date(), endDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000) },
        { name: 'Margen Mínimo 20%', type: 'MARGIN_MINIMUM', value: 20, active: true },
      ],
    })

    // ---- DAILY STATS ----
    for (let day = 0; day < 30; day++) {
      const statDate = new Date(now)
      statDate.setDate(statDate.getDate() - day)
      statDate.setHours(0, 0, 0, 0)

      for (const branch of [branchCentro, branchNorte]) {
        const totalSales = Math.round((Math.random() * 15000 + 2000) * 100) / 100
        const totalExpenses = Math.round((Math.random() * 3000 + 500) * 100) / 100
        const numTransactions = Math.floor(Math.random() * 15) + 2
        const avgTicket = Math.round((totalSales / numTransactions) * 100) / 100

        await db.dailyStat.create({
          data: {
            date: statDate,
            branchId: branch.id,
            totalSales,
            totalExpenses,
            numTransactions,
            avgTicket,
          },
        })
      }
    }

    // ---- CFDI (some for sales) ----
    const cfdiSales = salesCreated.slice(0, 5)
    for (const sale of cfdiSales) {
      const saleWithClient = await db.sale.findUnique({ where: { id: sale.id }, include: { client: true } })
      if (saleWithClient?.client?.rfc) {
        await db.cFDI.create({
          data: {
            saleId: sale.id,
            uuid: crypto.randomUUID(),
            clientRfc: saleWithClient.client.rfc,
            clientName: saleWithClient.client.name,
            cfdiType: 'INGRESO',
            paymentForm: '01',
            paymentMethod: 'PUE',
            useCFDI: 'G01',
            subtotal: sale.subtotal,
            tax: sale.tax,
            total: sale.total,
            status: Math.random() > 0.3 ? 'STAMPED' : 'GENERATED',
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Base de datos poblada exitosamente',
      counts: {
        branches: 2,
        users: users.length,
        categories: categories.length,
        products: products.length,
        inventory: inventoryData.length,
        clients: clients.length,
        sales: salesCreated.length,
        expenses: 10,
        auditLogs: 14,
        pointsTransactions: clients.length * 2 - 1,
        priceRules: 3,
        dailyStats: 60,
        cfdi: cfdiSales.length,
      },
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
