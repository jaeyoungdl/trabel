import { NextRequest, NextResponse } from 'next/server'
import Database from '../../../../../lib/db'

// PUT: 장소 정보 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const place = await Database.updatePlace(id, body)
    return NextResponse.json(place)
  } catch (error) {
    console.error('Place 수정 실패:', error)
    return NextResponse.json({ error: 'Failed to update place' }, { status: 500 })
  }
}

// DELETE: 장소 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await Database.deletePlace(id)
    return NextResponse.json({ message: 'Place deleted successfully' })
  } catch (error) {
    console.error('Place 삭제 실패:', error)
    return NextResponse.json({ error: 'Failed to delete place' }, { status: 500 })
  }
} 