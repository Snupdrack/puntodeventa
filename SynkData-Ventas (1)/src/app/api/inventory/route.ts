import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/inventory - List inventory with branch filter, low stock filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branchId') || ''
    const lowStock = searchParams.get('lowStock') === 'true'
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}

    if (branchId) {
      where.branchId = branchId
    }

    if (lowStock) {
      where.OR = [
        { quantity: 0 },
        { quantity: { lte: 0 } },
      ]
    }

    if (search) {
      where.product = {
        OR: [
          { name: { contains: search } },
          { sku: { contains: search } },
        ],
      }
    }

    const [inventory, total] = await Promise.all([
      db.inventory.findMany({
        where,
        include: {
          product: {
            include: {
              category: { select: { name: true, color: true } },
            },
          },
          branch: { select: { id: true, name: true, code: true } },
        },
        orderBy: { product: { name: 'asc' } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.inventory.count({ where }),
    ])

    // Compute KPIs
    const allInventory = await db.inventory.findMany({
      where: branchId ? { branchId } : {},
      include: { product: true },
    })

    const totalProducts = await db.product.count({ where: { active: true } })
    const lowStockItems = allInventory.filter((i) => i.quantity > 0 && i.quantity <= i.minStock).length
    const outOfStock = allInventory.filter((i) => i.quantity === 0).length
    const totalValue = allInventory.reduce(
      (sum, i) => sum + i.quantity * i.product.costPrice,
      0
    )

    return NextResponse.json({
      inventory,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      kpis: {
        totalProducts,
        lowStockItems,
        outOfStock,
        totalValue,
      },
    })
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json({ error: 'Error al obtener inventario' }, { status: 500 })
  }
}
