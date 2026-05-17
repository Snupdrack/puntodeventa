import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get first active branch
    const branch = await db.branch.findFirst({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, code: true },
    })

    // Get admin user
    const user = await db.user.findFirst({
      where: { role: 'ADMIN_GENERAL', active: true },
      select: { id: true, email: true, name: true, role: true, branchId: true },
    })

    return NextResponse.json({
      branch: branch || { id: '', name: 'Sin Sucursal', code: 'N/A' },
      user: user || { id: 'demo', email: 'demo@synkdata.com', name: 'Demo User', role: 'ADMIN_GENERAL', branchId: null },
    })
  } catch (error) {
    console.error('Error fetching init data:', error)
    return NextResponse.json(
      { error: 'Error al obtener datos iniciales' },
      { status: 500 }
    )
  }
}
