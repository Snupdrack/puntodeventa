import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const branches = await db.branch.findMany({
      include: {
        _count: { select: { users: true, inventory: true, sales: true } },
        users: {
          where: { active: true },
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Calculate inventory value per branch
    const branchesWithValue = await Promise.all(
      branches.map(async (branch) => {
        const inventoryItems = await db.inventory.findMany({
          where: { branchId: branch.id },
          include: { product: { select: { salePrice: true, costPrice: true } } },
        })
        const inventoryValue = inventoryItems.reduce(
          (sum, item) => sum + item.product.salePrice * item.quantity,
          0
        )
        return {
          ...branch,
          inventoryValue: Math.round(inventoryValue * 100) / 100,
        }
      })
    )

    return NextResponse.json({ branches: branchesWithValue })
  } catch (error) {
    console.error('Branches GET error:', error)
    return NextResponse.json({ error: 'Error al obtener sucursales' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const branch = await db.branch.create({
      data: {
        name: body.name,
        code: body.code,
        address: body.address || null,
        phone: body.phone || null,
        active: true,
      },
    })
    return NextResponse.json(branch, { status: 201 })
  } catch (error) {
    console.error('Branches POST error:', error)
    return NextResponse.json({ error: 'Error al crear sucursal' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const body = await req.json()
    const branch = await db.branch.update({
      where: { id },
      data: {
        name: body.name,
        code: body.code,
        address: body.address || null,
        phone: body.phone || null,
        active: body.active,
      },
    })
    return NextResponse.json(branch)
  } catch (error) {
    console.error('Branches PUT error:', error)
    return NextResponse.json({ error: 'Error al actualizar sucursal' }, { status: 500 })
  }
}
