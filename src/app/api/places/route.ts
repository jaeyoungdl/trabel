import { NextRequest, NextResponse } from 'next/server'
import Database from '../../../../lib/db'

// GET: 모든 장소 조회 (tripId로 필터링)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tripId = searchParams.get('tripId')

    if (!tripId) {
      return NextResponse.json({ error: 'tripId is required' }, { status: 400 })
    }

    const places = await Database.getPlacesByTripId(tripId)
    return NextResponse.json(places)
  } catch (error) {
    console.error('Places 조회 실패:', error)
    return NextResponse.json({ error: 'Failed to fetch places' }, { status: 500 })
  }
}

// POST: 새 장소 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      address,
      time,
      duration,
      day,
      order,
      category,
      placeId,
      operatingHours,
      notes,
      tripId
    } = body

    if (!name || !tripId || !day) {
      return NextResponse.json(
        { error: 'name, tripId, day are required' }, 
        { status: 400 }
      )
    }

    const place = await Database.createPlace({
      name,
      address: address || '',
      time: time || '',
      duration: duration || '1시간',
      day,
      order: order || 1,
      category: category || 'restaurant',
      placeId,
      operatingHours,
      notes,
      tripId
    })

    return NextResponse.json(place, { status: 201 })
  } catch (error) {
    console.error('Place 생성 실패:', error)
    return NextResponse.json({ error: 'Failed to create place' }, { status: 500 })
  }
} 