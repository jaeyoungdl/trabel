import { NextRequest, NextResponse } from 'next/server'
import Database from '../../../../../lib/db'

// PUT: 비용 항목 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const expense = await Database.updateExpense(id, body)
    return NextResponse.json(expense)
  } catch (error) {
    console.error('Expense 수정 실패:', error)
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 })
  }
}

// DELETE: 비용 항목 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await Database.deleteExpense(id)
    return NextResponse.json({ message: 'Expense deleted successfully' })
  } catch (error) {
    console.error('Expense 삭제 실패:', error)
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 })
  }
} 