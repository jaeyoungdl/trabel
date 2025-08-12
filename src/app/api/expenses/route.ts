import { NextRequest, NextResponse } from 'next/server'
import Database from '../../../../lib/db'

// GET: 특정 trip의 모든 비용 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tripId = searchParams.get('tripId')

    if (!tripId) {
      return NextResponse.json(
        { error: 'tripId is required' },
        { status: 400 }
      )
    }

    const expenses = await Database.getExpensesByTripId(tripId)
    return NextResponse.json(expenses)
  } catch (error) {
    console.error('Expenses 조회 실패:', error)
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  }
}

// POST: 새로운 비용 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      amount, description, category, date, currency, placeId, tripId
    } = body

    if (!amount || !description || !category || !date || !tripId) {
      return NextResponse.json(
        { error: 'amount, description, category, date, tripId are required' },
        { status: 400 }
      )
    }

    const expense = await Database.createExpense({
      amount: parseFloat(amount),
      description,
      category,
      date,
      currency: currency || 'KRW',
      placeId,
      tripId
    })
    
    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error('Expense 생성 실패:', error)
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
  }
} 