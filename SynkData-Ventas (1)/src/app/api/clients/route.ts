import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || ''
    const segment = searchParams.get('segment') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = {}

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { rfc: { contains: search } },
        { phone: { contains: search } },
      ]
    }

    // Type filter
    if (type) {
      where.type = type
    }

    // Segment filter
    if (segment === 'vip') {
      where.type = 'VIP'
    } else if (segment === 'credit') {
      where.creditUsed = { gt: 0 }
    } else if (segment === 'inactive30') {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      where.sales = { none: { createdAt: { gte: thirtyDaysAgo } } }
      where.active = true
    }

    const [clients, total] = await Promise.all([
      db.client.findMany({
        where,
        include: {
          _count: { select: { sales: true } },
          sales: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { id: true, folio: true, total: true, createdAt: true, status: true },
          },
          pointsHistory: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.client.count({ where }),
    ])

    return NextResponse.json({ clients, total, page, limit })
  } catch (error) {
    console.error('Clients GET error:', error)
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const client = await db.client.create({
      data: {
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        rfc: body.rfc || null,
        address: body.address || null,
        type: body.type || 'GENERAL',
        creditLimit: body.creditLimit || 0,
        creditUsed: 0,
        points: 0,
        active: true,
      },
    })
    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error('Clients POST error:', error)
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const body = await req.json()
    const client = await db.client.update({
      where: { id },
      data: {
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        rfc: body.rfc || null,
        address: body.address || null,
        type: body.type,
        creditLimit: body.creditLimit,
        active: body.active,
      },
    })
    return NextResponse.json(client)
  } catch (error) {
    console.error('Clients PUT error:', error)
    return NextResponse.json({ error: 'Error al actualizar cliente' }, { status: 500 })
  }
}
