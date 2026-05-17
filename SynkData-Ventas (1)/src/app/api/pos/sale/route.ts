import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

interface SaleItemInput {
  productId: string
  quantity: number
  unitPrice: number
  discount: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      items,
      clientId,
      paymentMethod,
      cashReceived,
      discount = 0,
      branchId,
      userId,
      includeIva = true,
    } = body

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'La venta debe tener al menos un producto' },
        { status: 400 }
      )
    }

    if (!branchId || !userId) {
      return NextResponse.json(
        { error: 'Sucursal y usuario son requeridos' },
        { status: 400 }
      )
    }

    // Get the last sale folio
    const lastSale = await db.sale.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { folio: true },
    })

    let folioNumber = 1
    if (lastSale?.folio) {
      const match = lastSale.folio.match(/V-(\d+)/)
      if (match) {
        folioNumber = parseInt(match[1], 10) + 1
      }
    }
    const folio = `V-${String(folioNumber).padStart(4, '0')}`

    // Calculate totals
    const subtotal = items.reduce(
      (sum: number, item: SaleItemInput) =>
        sum + item.quantity * item.unitPrice * (1 - item.discount / 100),
      0
    )

    const taxRate = includeIva ? 0.16 : 0
    const tax = subtotal * taxRate
    const total = subtotal + tax - discount

    // Handle change for cash payments
    let change = 0
    if (paymentMethod === 'EFECTIVO' && cashReceived) {
      change = Math.max(0, cashReceived - total)
    }

    // Create the sale with items
    const sale = await db.sale.create({
      data: {
        folio,
        branchId,
        userId,
        clientId: clientId || null,
        subtotal: Math.round(subtotal * 100) / 100,
        taxRate,
        tax: Math.round(tax * 100) / 100,
        discount: Math.round(discount * 100) / 100,
        total: Math.round(total * 100) / 100,
        paymentMethod,
        cashReceived: paymentMethod === 'EFECTIVO' ? cashReceived || total : null,
        change: paymentMethod === 'EFECTIVO' ? Math.round(change * 100) / 100 : null,
        status: 'COMPLETED',
        items: {
          create: items.map((item: SaleItemInput) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            taxRate,
            total: Math.round(
              item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100) * (1 + taxRate) * 100
            ) / 100,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
        client: {
          select: { id: true, name: true, rfc: true, email: true },
        },
        branch: {
          select: { id: true, name: true, code: true },
        },
        user: {
          select: { id: true, name: true },
        },
      },
    })

    // Update inventory for each item
    for (const item of items as SaleItemInput[]) {
      const inventory = await db.inventory.findFirst({
        where: {
          productId: item.productId,
          branchId,
        },
      })

      if (inventory) {
        await db.inventory.update({
          where: { id: inventory.id },
          data: { quantity: { decrement: item.quantity } },
        })
      }
    }

    // If client has credit payment, update creditUsed
    if (clientId && paymentMethod === 'CREDITO') {
      await db.client.update({
        where: { id: clientId },
        data: { creditUsed: { increment: total } },
      })
    }

    // Add points to client (1 point per $10 spent)
    if (clientId) {
      const pointsEarned = Math.floor(total / 10)
      if (pointsEarned > 0) {
        await db.client.update({
          where: { id: clientId },
          data: { points: { increment: pointsEarned } },
        })
        await db.pointsTransaction.create({
          data: {
            clientId,
            points: pointsEarned,
            type: 'EARNED',
            saleId: sale.id,
            description: `Puntos ganados en venta ${folio}`,
          },
        })
      }
    }

    // Create audit log entry
    await db.auditLog.create({
      data: {
        userId,
        action: 'CREATE_SALE',
        entity: 'Sale',
        entityId: sale.id,
        details: `Venta ${folio} registrada por $${total.toFixed(2)} con ${items.length} productos`,
      },
    })

    return NextResponse.json({ sale })
  } catch (error) {
    console.error('Error creating sale:', error)
    return NextResponse.json(
      { error: 'Error al crear la venta' },
      { status: 500 }
    )
  }
}
