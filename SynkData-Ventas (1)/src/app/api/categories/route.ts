import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/categories - List all categories
export async function GET() {
  try {
    const categories = await db.category.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        icon: true,
        color: true,
        active: true,
      },
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Error al obtener categorías' }, { status: 500 })
  }
}
