import { NextRequest, NextResponse } from 'next/server'
import Database from '../../../../lib/db'

// GET: 모든 여행 조회
export async function GET() {
  try {
    const trips = await Database.getAllTrips()
    return NextResponse.json(trips)
  } catch (error) {
    console.error('Trips 조회 실패:', error)
    return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 })
  }
}

// POST: 새 여행 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, startDate, endDate } = body

    if (!title || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'title, startDate, endDate are required' }, 
        { status: 400 }
      )
    }

    const trip = await Database.createTrip({
      title,
      description,
      startDate,
      endDate
    })

    return NextResponse.json(trip, { status: 201 })
  } catch (error) {
    console.error('Trip 생성 실패:', error)
    return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 })
  }
} 