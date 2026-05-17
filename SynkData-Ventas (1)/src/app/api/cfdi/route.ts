import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const cfdiType = searchParams.get('cfdiType') || ''
    const status = searchParams.get('status') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''

    const where: Record<string, unknown> = {}

    if (cfdiType) where.cfdiType = cfdiType
    if (status) where.status = status
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom)
      if (dateTo) (where.createdAt as Record<string, unknown>).lte = new Date(dateTo)
    }

    const cfdiList = await db.cFDI.findMany({
      where,
      include: {
        sale: {
          select: {
            id: true,
            folio: true,
            client: { select: { name: true, rfc: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ cfdi: cfdiList })
  } catch (error) {
    console.error('CFDI GET error:', error)
    return NextResponse.json({ error: 'Error al obtener CFDI' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate sale exists and is completed
    const sale = await db.sale.findUnique({
      where: { id: body.saleId },
      include: { client: true },
    })

    if (!sale) {
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })
    }

    if (sale.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Solo se puede facturar ventas completadas' }, { status: 400 })
    }

    // Check if CFDI already exists for this sale
    const existing = await db.cFDI.findUnique({ where: { saleId: body.saleId } })
    if (existing) {
      return NextResponse.json({ error: 'Ya existe un CFDI para esta venta' }, { status: 400 })
    }

    const uuid = crypto.randomUUID()

    // Mock XML content
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  Version="4.0"
  UUID="${uuid}"
  Fecha="${new Date().toISOString()}"
  TipoDeComprobante="${body.cfdiType || 'INGRESO'}"
  FormaPago="${body.paymentForm || '01'}"
  MetodoPago="${body.paymentMethod || 'PUE'}"
  UsoCFDI="${body.useCFDI || 'G01'}"
  SubTotal="${sale.subtotal}"
  TotalImpuestosTrasladados="${sale.tax}"
  Total="${sale.total}">
  <cfdi:Emisor Rfc="SVD240101ABC" Nombre="SynkData Ventas S.A." RegimenFiscal="601"/>
  <cfdi:Receptor Rfc="${sale.client?.rfc || 'XAXX010101000'}" Nombre="${sale.client?.name || 'Público General'}" UsoCFDI="${body.useCFDI || 'G01'}"/>
  <cfdi:Conceptos>
    <cfdi:Concepto Cantidad="1" Descripcion="Venta ${sale.folio}" ValorUnitario="${sale.subtotal}" Importe="${sale.subtotal}"/>
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="${sale.tax}">
    <cfdi:Traslados>
      <cfdi:Traslado Base="${sale.subtotal}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.16" Importe="${sale.tax}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
</cfdi:Comprobante>`

    const cfdi = await db.cFDI.create({
      data: {
        uuid,
        saleId: body.saleId,
        clientRfc: sale.client?.rfc || 'XAXX010101000',
        clientName: sale.client?.name || 'Público General',
        cfdiType: body.cfdiType || 'INGRESO',
        paymentForm: body.paymentForm || '01',
        paymentMethod: body.paymentMethod || 'PUE',
        useCFDI: body.useCFDI || 'G01',
        subtotal: sale.subtotal,
        tax: sale.tax,
        total: sale.total,
        status: 'GENERATED',
        xmlContent,
      },
      include: {
        sale: {
          select: {
            id: true,
            folio: true,
            client: { select: { name: true, rfc: true } },
          },
        },
      },
    })

    return NextResponse.json(cfdi, { status: 201 })
  } catch (error) {
    console.error('CFDI POST error:', error)
    return NextResponse.json({ error: 'Error al generar CFDI' }, { status: 500 })
  }
}
