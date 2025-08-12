import { NextRequest, NextResponse } from 'next/server'
import Database from '../../../../../lib/db'

// GET: 여행 비용 통계 조회
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

    const stats = await Database.getExpenseStats(tripId)
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Expense 통계 조회 실패:', error)
    return NextResponse.json({ error: 'Failed to fetch expense stats' }, { status: 500 })
  }
} 