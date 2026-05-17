import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const users = await db.user.findMany({
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ users })
  } catch (error) {
    console.error('Users GET error:', error)
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.email || !body.name || !body.password) {
      return NextResponse.json({ error: 'Nombre, email y contraseña son requeridos' }, { status: 400 })
    }

    // Check for existing email
    const existing = await db.user.findUnique({ where: { email: body.email } })
    if (existing) {
      return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 })
    }

    const user = await db.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: body.password, // Plain text for demo
        role: body.role || 'CAJERO',
        branchId: body.branchId || null,
        active: body.active !== undefined ? body.active : true,
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    console.error('Users POST error:', error)
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const body = await req.json()

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.email !== undefined) data.email = body.email
    if (body.password !== undefined) data.password = body.password
    if (body.role !== undefined) data.role = body.role
    if (body.branchId !== undefined) data.branchId = body.branchId || null
    if (body.active !== undefined) data.active = body.active

    const user = await db.user.update({
      where: { id },
      data,
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Users PUT error:', error)
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 })
  }
}
