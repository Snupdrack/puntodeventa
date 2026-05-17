import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, format } from 'date-fns'

export async function GET() {
  try {
    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    const yesterdayStart = startOfDay(subDays(now, 1))
    const yesterdayEnd = endOfDay(subDays(now, 1))
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)

    // --- KPI: Today's Sales ---
    const todaySales = await db.sale.aggregate({
      _sum: { total: true },
      _count: true,
      where: {
        createdAt: { gte: todayStart, lte: todayEnd },
        status: { not: 'CANCELLED' },
      },
    })

    // --- KPI: Yesterday's Sales ---
    const yesterdaySales = await db.sale.aggregate({
      _sum: { total: true },
      where: {
        createdAt: { gte: yesterdayStart, lte: yesterdayEnd },
        status: { not: 'CANCELLED' },
      },
    })

    // --- KPI: Monthly sales & expenses for net profit ---
    const monthlySales = await db.sale.aggregate({
      _sum: { total: true },
      where: {
        createdAt: { gte: monthStart, lte: monthEnd },
        status: { not: 'CANCELLED' },
      },
    })

    const monthlyExpenses = await db.expense.aggregate({
      _sum: { amount: true },
      where: {
        date: { gte: monthStart, lte: monthEnd },
      },
    })

    // Previous month for comparison
    const prevMonthStart = startOfMonth(subDays(monthStart, 1))
    const prevMonthEnd = endOfMonth(subDays(monthStart, 1))
    const prevMonthSales = await db.sale.aggregate({
      _sum: { total: true },
      where: {
        createdAt: { gte: prevMonthStart, lte: prevMonthEnd },
        status: { not: 'CANCELLED' },
      },
    })
    const prevMonthExpenses = await db.expense.aggregate({
      _sum: { amount: true },
      where: {
        date: { gte: prevMonthStart, lte: prevMonthEnd },
      },
    })

    // --- KPI: Low inventory count ---
    const lowInventoryCount = await db.inventory.count({
      where: {
        quantity: { lte: db.inventory.fields.minStock },
      },
    })

    // --- Sales chart: last 30 days ---
    const thirtyDaysAgo = subDays(now, 30)
    const salesLast30 = await db.sale.findMany({
      where: {
        createdAt: { gte: startOfDay(thirtyDaysAgo), lte: todayEnd },
        status: { not: 'CANCELLED' },
      },
      select: {
        createdAt: true,
        total: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    // Group sales by day
    const dailySalesMap: Record<string, { total: number; count: number }> = {}
    for (let i = 0; i < 30; i++) {
      const date = subDays(now, i)
      const key = format(date, 'yyyy-MM-dd')
      dailySalesMap[key] = { total: 0, count: 0 }
    }

    for (const sale of salesLast30) {
      const key = format(sale.createdAt, 'yyyy-MM-dd')
      if (dailySalesMap[key]) {
        dailySalesMap[key].total += sale.total
        dailySalesMap[key].count += 1
      }
    }

    const dailySales = Object.entries(dailySalesMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        total: Math.round(data.total * 100) / 100,
        count: data.count,
      }))

    // --- Top Products by quantity sold ---
    const topProductsRaw = await db.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: {
          createdAt: { gte: monthStart, lte: monthEnd },
          status: { not: 'CANCELLED' },
        },
      },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    })

    const topProducts = await Promise.all(
      topProductsRaw.map(async (item) => {
        const product = await db.product.findUnique({
          where: { id: item.productId },
          select: { name: true, sku: true },
        })
        return {
          productId: item.productId,
          name: product?.name ?? 'Producto eliminado',
          sku: product?.sku ?? '',
          quantity: item._sum.quantity ?? 0,
          revenue: Math.round((item._sum.total ?? 0) * 100) / 100,
        }
      })
    )

    // --- Recent 10 sales ---
    const recentSales = await db.sale.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { name: true } },
      },
    })

    // --- Monthly expense breakdown by category ---
    const expenseBreakdownRaw = await db.expense.groupBy({
      by: ['category'],
      where: {
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    })

    const expenseBreakdown = expenseBreakdownRaw.map((item) => ({
      category: item.category,
      amount: Math.round((item._sum.amount ?? 0) * 100) / 100,
    }))

    // Compute KPI values
    const todayTotal = todaySales._sum.total ?? 0
    const yesterdayTotal = yesterdaySales._sum.total ?? 0
    const salesTrend = yesterdayTotal > 0
      ? Math.round(((todayTotal - yesterdayTotal) / yesterdayTotal) * 10000) / 100
      : todayTotal > 0 ? 100 : 0

    const todayTickets = todaySales._count
    const yesterdayTicketsCount = await db.sale.count({
      where: {
        createdAt: { gte: yesterdayStart, lte: yesterdayEnd },
        status: { not: 'CANCELLED' },
      },
    })
    const ticketsTrend = yesterdayTicketsCount > 0
      ? Math.round(((todayTickets - yesterdayTicketsCount) / yesterdayTicketsCount) * 10000) / 100
      : todayTickets > 0 ? 100 : 0

    const monthlySalesTotal = monthlySales._sum.total ?? 0
    const monthlyExpensesTotal = monthlyExpenses._sum.amount ?? 0
    const netProfit = monthlySalesTotal - monthlyExpensesTotal

    const prevMonthSalesTotal = prevMonthSales._sum.total ?? 0
    const prevMonthExpensesTotal = prevMonthExpenses._sum.amount ?? 0
    const prevNetProfit = prevMonthSalesTotal - prevMonthExpensesTotal
    const profitTrend = prevNetProfit !== 0
      ? Math.round(((netProfit - prevNetProfit) / Math.abs(prevNetProfit)) * 10000) / 100
      : netProfit > 0 ? 100 : 0

    // Low inventory previous period comparison (just show the count)
    const lowInventoryPrev = await db.inventory.count({
      where: {
        quantity: { lte: db.inventory.fields.minStock },
      },
    })

    return NextResponse.json({
      kpis: {
        ventasHoy: {
          total: Math.round(todayTotal * 100) / 100,
          trend: salesTrend,
        },
        ticketsHoy: {
          count: todayTickets,
          trend: ticketsTrend,
        },
        utilidadNeta: {
          total: Math.round(netProfit * 100) / 100,
          trend: profitTrend,
        },
        inventarioBajo: {
          count: lowInventoryCount,
          trend: lowInventoryCount - lowInventoryPrev, // will be 0 since same query, but placeholder
        },
      },
      dailySales,
      topProducts,
      recentSales: recentSales.map((s) => ({
        id: s.id,
        folio: s.folio,
        clientName: s.client?.name ?? 'Público General',
        total: s.total,
        paymentMethod: s.paymentMethod,
        createdAt: s.createdAt.toISOString(),
        status: s.status,
      })),
      expenseBreakdown,
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Error al cargar datos del dashboard' },
      { status: 500 }
    )
  }
}
