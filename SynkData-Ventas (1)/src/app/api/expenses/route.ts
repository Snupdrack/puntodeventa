import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category') || ''
    const branchId = searchParams.get('branchId') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = {}

    if (category) where.category = category
    if (branchId) where.branchId = branchId
    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) (where.date as Record<string, unknown>).gte = new Date(dateFrom)
      if (dateTo) (where.date as Record<string, unknown>).lte = new Date(dateTo)
    }

    const [expenses, total] = await Promise.all([
      db.expense.findMany({
        where,
        include: {
          branch: { select: { id: true, name: true, code: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.expense.count({ where }),
    ])

    return NextResponse.json({ expenses, total, page, limit })
  } catch (error) {
    console.error('Expenses GET error:', error)
    return NextResponse.json({ error: 'Error al obtener gastos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const expense = await db.expense.create({
      data: {
        category: body.category,
        description: body.description,
        amount: body.amount,
        date: new Date(body.date),
        branchId: body.branchId || null,
        userId: body.userId || 'demo-admin',
        isRecurring: body.isRecurring || false,
        receiptUrl: body.receiptUrl || null,
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error('Expenses POST error:', error)
    return NextResponse.json({ error: 'Error al crear gasto' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const body = await req.json()
    const expense = await db.expense.update({
      where: { id },
      data: {
        category: body.category,
        description: body.description,
        amount: body.amount,
        date: new Date(body.date),
        branchId: body.branchId || null,
        isRecurring: body.isRecurring,
        receiptUrl: body.receiptUrl || null,
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json(expense)
  } catch (error) {
    console.error('Expenses PUT error:', error)
    return NextResponse.json({ error: 'Error al actualizar gasto' }, { status: 500 })
  }
}
