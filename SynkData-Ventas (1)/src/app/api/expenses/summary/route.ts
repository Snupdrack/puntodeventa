import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get('branchId') || ''
    const month = searchParams.get('month') || '' // YYYY-MM format

    // Monthly expenses by category
    const now = new Date()
    const startOfMonth = month ? new Date(`${month}-01`) : new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = month ? new Date(new Date(`${month}-01`).getTime() + 31 * 24 * 60 * 60 * 1000) : new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const where: Record<string, unknown> = {
      date: { gte: startOfMonth, lt: endOfMonth },
    }
    if (branchId) where.branchId = branchId

    const expenses = await db.expense.findMany({ where })

    // Calculate by category
    const byCategory: Record<string, number> = {}
    let totalMonth = 0
    let totalRecurring = 0

    for (const exp of expenses) {
      byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.amount
      totalMonth += exp.amount
      if (exp.isRecurring) totalRecurring += exp.amount
    }

    // Get sales for the same period to calculate net profit
    const salesWhere: Record<string, unknown> = {
      createdAt: { gte: startOfMonth, lt: endOfMonth },
      status: 'COMPLETED',
    }
    if (branchId) salesWhere.branchId = branchId
    const salesTotal = await db.sale.aggregate({
      where: salesWhere,
      _sum: { total: true },
    })

    // Monthly trend (last 6 months)
    const trend = []
    for (let i = 5; i >= 0; i--) {
      const trendStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const trendEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const trendWhere: Record<string, unknown> = { date: { gte: trendStart, lt: trendEnd } }
      if (branchId) trendWhere.branchId = branchId
      const trendExpenses = await db.expense.findMany({ where: trendWhere })
      const monthTotal = trendExpenses.reduce((s, e) => s + e.amount, 0)
      trend.push({
        month: trendStart.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
        total: Math.round(monthTotal * 100) / 100,
      })
    }

    return NextResponse.json({
      totalMonth: Math.round(totalMonth * 100) / 100,
      totalRecurring: Math.round(totalRecurring * 100) / 100,
      totalSales: salesTotal._sum.total || 0,
      netProfit: Math.round(((salesTotal._sum.total || 0) - totalMonth) * 100) / 100,
      byCategory,
      trend,
    })
  } catch (error) {
    console.error('Expenses summary GET error:', error)
    return NextResponse.json({ error: 'Error al obtener resumen' }, { status: 500 })
  }
}
