import { NextRequest, NextResponse } from 'next/server'
import Database from '../../../../../lib/db'

// POST: 여러 장소 순서 일괄 업데이트
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { places } = body

    if (!places || !Array.isArray(places)) {
      return NextResponse.json(
        { error: 'places array is required' }, 
        { status: 400 }
      )
    }

    await Database.updateMultiplePlaces(places)
    return NextResponse.json({ message: 'Places updated successfully' })
  } catch (error) {
    console.error('Places 순서 업데이트 실패:', error)
    return NextResponse.json({ error: 'Failed to update places' }, { status: 500 })
  }
} 