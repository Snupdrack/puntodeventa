import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clientId, points, type, description } = body

    if (!clientId || !points || !type) {
      return NextResponse.json({ error: 'clientId, points y type son requeridos' }, { status: 400 })
    }

    const transaction = await db.pointsTransaction.create({
      data: {
        clientId,
        points: Math.abs(points),
        type,
        description: description || `Ajuste manual de puntos`,
      },
    })

    // Update client points
    const client = await db.client.findUnique({ where: { id: clientId } })
    if (client) {
      const adjustment = type === 'EARNED' || type === 'ADJUSTED' ? Math.abs(points) : -Math.abs(points)
      await db.client.update({
        where: { id: clientId },
        data: { points: Math.max(0, client.points + adjustment) },
      })
    }

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error('Points POST error:', error)
    return NextResponse.json({ error: 'Error al ajustar puntos' }, { status: 500 })
  }
}
