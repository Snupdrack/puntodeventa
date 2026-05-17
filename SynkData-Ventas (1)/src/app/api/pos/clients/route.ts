import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    const where: Record<string, unknown> = {
      active: true,
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { rfc: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ]
    }

    const clients = await db.client.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        rfc: true,
        type: true,
        creditLimit: true,
        creditUsed: true,
        points: true,
      },
      orderBy: { name: 'asc' },
      take: 20,
    })

    return NextResponse.json({ clients })
  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json(
      { error: 'Error al obtener clientes' },
      { status: 500 }
    )
  }
}
