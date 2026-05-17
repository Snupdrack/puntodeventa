import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/products - List products with search, filter, pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const categoryId = searchParams.get('categoryId') || ''
    const active = searchParams.get('active')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'name'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { barcode: { contains: search } },
        { description: { contains: search } },
      ]
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (active !== null && active !== '') {
      where.active = active === 'true'
    }

    const orderBy: Record<string, string> = {}
    orderBy[sortBy] = sortOrder

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, color: true } },
          inventory: { select: { quantity: true, branchId: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.product.count({ where }),
    ])

    // Compute total stock per product
    const productsWithStock = products.map((p) => {
      const totalStock = p.inventory.reduce((sum, inv) => sum + inv.quantity, 0)
      const { inventory, ...productData } = p
      return { ...productData, totalStock }
    })

    return NextResponse.json({
      products: productsWithStock,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 })
  }
}

// POST /api/products - Create product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sku, barcode, name, description, categoryId, costPrice, salePrice, unit, trackStock, imageUrl, active } = body

    if (!name || !categoryId || costPrice === undefined || salePrice === undefined) {
      return NextResponse.json(
        { error: 'Nombre, categoría, precio de costo y precio de venta son requeridos' },
        { status: 400 }
      )
    }

    // Auto-generate SKU if not provided
    let finalSku = sku
    if (!finalSku) {
      const count = await db.product.count()
      finalSku = `PROD-${String(count + 1).padStart(4, '0')}`
    }

    // Check SKU uniqueness
    const existingSku = await db.product.findUnique({ where: { sku: finalSku } })
    if (existingSku) {
      return NextResponse.json({ error: 'El SKU ya existe' }, { status: 400 })
    }

    const product = await db.product.create({
      data: {
        sku: finalSku,
        barcode: barcode || null,
        name,
        description: description || null,
        categoryId,
        costPrice: parseFloat(costPrice),
        salePrice: parseFloat(salePrice),
        unit: unit || 'pieza',
        trackStock: trackStock !== false,
        imageUrl: imageUrl || null,
        active: active !== false,
      },
      include: {
        category: { select: { id: true, name: true, color: true } },
      },
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 })
  }
}

// PUT /api/products?id=xxx - Update product
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID de producto requerido' }, { status: 400 })
    }

    const body = await request.json()
    const { sku, barcode, name, description, categoryId, costPrice, salePrice, unit, trackStock, imageUrl, active } = body

    // Check if SKU is being changed to an existing one
    if (sku) {
      const existingSku = await db.product.findFirst({
        where: { sku, id: { not: id } },
      })
      if (existingSku) {
        return NextResponse.json({ error: 'El SKU ya existe en otro producto' }, { status: 400 })
      }
    }

    const updateData: Record<string, unknown> = {}
    if (sku !== undefined) updateData.sku = sku
    if (barcode !== undefined) updateData.barcode = barcode || null
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description || null
    if (categoryId !== undefined) updateData.categoryId = categoryId
    if (costPrice !== undefined) updateData.costPrice = parseFloat(costPrice)
    if (salePrice !== undefined) updateData.salePrice = parseFloat(salePrice)
    if (unit !== undefined) updateData.unit = unit
    if (trackStock !== undefined) updateData.trackStock = trackStock
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null
    if (active !== undefined) updateData.active = active

    const product = await db.product.update({
      where: { id },
      data: updateData,
      include: {
        category: { select: { id: true, name: true, color: true } },
      },
    })

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: 'Error al actualizar producto' }, { status: 500 })
  }
}

// PATCH /api/products?id=xxx - Toggle active status
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID de producto requerido' }, { status: 400 })
    }

    const product = await db.product.findUnique({ where: { id } })
    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    const updated = await db.product.update({
      where: { id },
      data: { active: !product.active },
      include: {
        category: { select: { id: true, name: true, color: true } },
      },
    })

    return NextResponse.json({ product: updated })
  } catch (error) {
    console.error('Error toggling product status:', error)
    return NextResponse.json({ error: 'Error al cambiar estado del producto' }, { status: 500 })
  }
}
