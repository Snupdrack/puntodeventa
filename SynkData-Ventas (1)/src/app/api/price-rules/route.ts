import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const rules = await db.priceRule.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ rules })
  } catch (error) {
    console.error('PriceRules GET error:', error)
    return NextResponse.json({ error: 'Error al obtener reglas de precio' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.name || !body.type || body.value === undefined) {
      return NextResponse.json(
        { error: 'Nombre, tipo y valor son requeridos' },
        { status: 400 }
      )
    }

    const rule = await db.priceRule.create({
      data: {
        name: body.name,
        type: body.type,
        value: parseFloat(body.value),
        productId: body.productId || null,
        categoryId: body.categoryId || null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        active: body.active !== undefined ? body.active : true,
      },
    })

    return NextResponse.json({ rule }, { status: 201 })
  } catch (error) {
    console.error('PriceRules POST error:', error)
    return NextResponse.json({ error: 'Error al crear regla de precio' }, { status: 500 })
  }
}
