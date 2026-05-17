import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const paymentMethod = searchParams.get('paymentMethod') || ''
    const status = searchParams.get('status') || ''
    const branchId = searchParams.get('branchId') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '30')

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { folio: { contains: search } },
        { client: { name: { contains: search } } },
      ]
    }
    if (paymentMethod) where.paymentMethod = paymentMethod
    if (status) where.status = status
    if (branchId) where.branchId = branchId
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom)
      if (dateTo) (where.createdAt as Record<string, unknown>).lte = new Date(dateTo)
    }

    const [sales, total] = await Promise.all([
      db.sale.findMany({
        where,
        include: {
          branch: { select: { id: true, name: true, code: true } },
          user: { select: { id: true, name: true } },
          client: { select: { id: true, name: true, rfc: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
          cfdi: { select: { id: true, uuid: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.sale.count({ where }),
    ])

    return NextResponse.json({ sales, total, page, limit })
  } catch (error) {
    console.error('Sales GET error:', error)
    return NextResponse.json({ error: 'Error al obtener ventas' }, { status: 500 })
  }
}
