import { useState, useEffect } from 'react'

export interface Place {
  id: string
  name: string
  address: string
  time: string
  duration: string
  day: number
  order: number
  category: string
  placeId?: string
  operatingHours?: any
  notes?: string
  tripId: string
  createdAt: Date
  updatedAt: Date
}

export function usePlaces(tripId: string) {
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 장소 목록 조회
  const fetchPlaces = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/places?tripId=${tripId}`)
      if (!response.ok) throw new Error('Failed to fetch places')
      const data = await response.json()
      setPlaces(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // 새 장소 추가
  const addPlace = async (placeData: Omit<Place, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(placeData)
      })
      if (!response.ok) throw new Error('Failed to add place')
      const newPlace = await response.json()
      setPlaces(prev => [...prev, newPlace])
      return newPlace
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // 장소 정보 수정
  const updatePlace = async (id: string, updates: Partial<Place>) => {
    try {
      const response = await fetch(`/api/places/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (!response.ok) throw new Error('Failed to update place')
      const updatedPlace = await response.json()
      setPlaces(prev => prev.map(p => p.id === id ? updatedPlace : p))
      return updatedPlace
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // 장소 삭제
  const deletePlace = async (id: string) => {
    try {
      const response = await fetch(`/api/places/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete place')
      setPlaces(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // 여러 장소 순서 일괄 업데이트
  const updatePlacesOrder = async (updatedPlaces: Place[]) => {
    try {
      // 변경된 장소들만 추출 (day나 order가 변경된 것들)
      const changedPlaces = updatedPlaces.map(place => ({
        id: place.id,
        day: place.day,
        order: place.order
      }));

      const response = await fetch('/api/places/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ places: changedPlaces })
      });

      if (!response.ok) throw new Error('Failed to update places order');

      setPlaces(updatedPlaces);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  useEffect(() => {
    if (tripId) {
      fetchPlaces()
    }
  }, [tripId])

  return {
    places,
    loading,
    error,
    addPlace,
    updatePlace,
    deletePlace,
    updatePlacesOrder,
    refetch: fetchPlaces
  }
} 