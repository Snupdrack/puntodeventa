import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const categoryId = searchParams.get('categoryId') || ''
    const branchId = searchParams.get('branchId') || ''

    const where: Record<string, unknown> = {
      active: true,
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { barcode: { contains: search } },
      ]
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    const products = await db.product.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, color: true, icon: true },
        },
        inventory: {
          where: branchId ? { branchId } : undefined,
          select: {
            id: true,
            branchId: true,
            quantity: true,
            minStock: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    const result = products.map((p) => {
      const stock = p.inventory.reduce((sum, inv) => sum + inv.quantity, 0)
      const minStock = p.inventory.length > 0 ? Math.min(...p.inventory.map((inv) => inv.minStock)) : 5
      return {
        id: p.id,
        sku: p.sku,
        barcode: p.barcode,
        name: p.name,
        description: p.description,
        costPrice: p.costPrice,
        salePrice: p.salePrice,
        unit: p.unit,
        trackStock: p.trackStock,
        imageUrl: p.imageUrl,
        category: p.category,
        stock,
        minStock,
        lowStock: stock > 0 && stock <= minStock,
        outOfStock: stock <= 0,
      }
    })

    return NextResponse.json({ products: result })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Error al obtener productos' },
      { status: 500 }
    )
  }
}
