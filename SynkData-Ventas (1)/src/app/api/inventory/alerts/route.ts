import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/inventory/alerts - Get low/out of stock items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branchId') || ''

    const where: Record<string, unknown> = {
      quantity: { lte: db.inventory.fields.minStock },
    }

    if (branchId) {
      where.branchId = branchId
    }

    const alerts = await db.inventory.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        quantity: { lte: 5 }, // Using a reasonable threshold
      },
      include: {
        product: {
          include: {
            category: { select: { name: true, color: true } },
          },
        },
        branch: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ quantity: 'asc' }],
    })

    // Filter to only items where stock <= minStock
    const filteredAlerts = alerts.filter((item) => item.quantity <= item.minStock)

    // Categorize
    const outOfStock = filteredAlerts.filter((a) => a.quantity === 0)
    const lowStock = filteredAlerts.filter((a) => a.quantity > 0 && a.quantity <= a.minStock)

    return NextResponse.json({
      alerts: filteredAlerts,
      outOfStock,
      lowStock,
      total: filteredAlerts.length,
    })
  } catch (error) {
    console.error('Error fetching inventory alerts:', error)
    return NextResponse.json({ error: 'Error al obtener alertas de inventario' }, { status: 500 })
  }
}
