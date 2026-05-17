import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/inventory/adjust - Create adjustment and update stock
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { inventoryId, type, quantity, reason, userId } = body

    if (!inventoryId || !type || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'ID de inventario, tipo de ajuste y cantidad son requeridos' },
        { status: 400 }
      )
    }

    const inventory = await db.inventory.findUnique({
      where: { id: inventoryId },
      include: { product: true, branch: true },
    })

    if (!inventory) {
      return NextResponse.json({ error: 'Registro de inventario no encontrado' }, { status: 404 })
    }

    let newQuantity = inventory.quantity

    switch (type) {
      case 'IN':
        newQuantity = inventory.quantity + quantity
        break
      case 'OUT':
        if (inventory.quantity < quantity) {
          return NextResponse.json(
            { error: `Stock insuficiente. Stock actual: ${inventory.quantity}` },
            { status: 400 }
          )
        }
        newQuantity = inventory.quantity - quantity
        break
      case 'TRANSFER':
        // For transfers, quantity is removed from this inventory
        // The target must be specified separately
        if (inventory.quantity < quantity) {
          return NextResponse.json(
            { error: `Stock insuficiente para transferir. Stock actual: ${inventory.quantity}` },
            { status: 400 }
          )
        }
        newQuantity = inventory.quantity - quantity
        break
      default:
        return NextResponse.json({ error: 'Tipo de ajuste inválido' }, { status: 400 })
    }

    // Create adjustment record and update inventory in a transaction
    const result = await db.$transaction(async (tx) => {
      const adjustment = await tx.inventoryAdjustment.create({
        data: {
          inventoryId,
          type,
          quantity,
          reason: reason || null,
          userId: userId || 'demo-admin',
        },
      })

      const updatedInventory = await tx.inventory.update({
        where: { id: inventoryId },
        data: { quantity: newQuantity },
        include: {
          product: {
            include: {
              category: { select: { name: true, color: true } },
            },
          },
          branch: { select: { id: true, name: true, code: true } },
        },
      })

      // For TRANSFER, add to target branch inventory
      if (type === 'TRANSFER' && body.targetBranchId) {
        const targetInventory = await tx.inventory.findUnique({
          where: {
            productId_branchId: {
              productId: inventory.productId,
              branchId: body.targetBranchId,
            },
          },
        })

        if (targetInventory) {
          await tx.inventory.update({
            where: { id: targetInventory.id },
            data: { quantity: targetInventory.quantity + quantity },
          })
        } else {
          await tx.inventory.create({
            data: {
              productId: inventory.productId,
              branchId: body.targetBranchId,
              quantity,
              minStock: 5,
            },
          })
        }

        // Create adjustment for target
        await tx.inventoryAdjustment.create({
          data: {
            inventoryId: targetInventory?.id || 'new',
            type: 'IN',
            quantity,
            reason: `Transferencia desde ${inventory.branch.name}`,
            userId: userId || 'demo-admin',
          },
        })
      }

      return { adjustment, inventory: updatedInventory }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error adjusting inventory:', error)
    return NextResponse.json({ error: 'Error al ajustar inventario' }, { status: 500 })
  }
}
