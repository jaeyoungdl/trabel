'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  rectIntersection,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { usePlaces, Place } from '../../hooks/usePlaces';
import { useExpenses } from '../../hooks/useExpenses';
import ExpenseManager from '../components/ExpenseManager';

// 컴포넌트 최상단에 Google Places 타입 정의 추가
declare global {
  interface Window {
    google: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  opening_hours?: {
    weekday_text: string[];
  };
}

// TravelPlace 타입을 Place로 대체 (hooks/usePlaces.ts에서 import)
type TravelPlace = Place;

export default function Home() {
  const [selectedDay, setSelectedDay] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDayForAdd, setSelectedDayForAdd] = useState(1);
  
  // 현재 페이지 상태 (schedule: 일정, expense: 비용)
  const [currentPage, setCurrentPage] = useState<'schedule' | 'expense'>('schedule');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedPlaceForMove, setSelectedPlaceForMove] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [duration, setDuration] = useState('1시간');
  const [startTime, setStartTime] = useState('09:00');
  
  // 수동 추가 관련 상태
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualPlace, setManualPlace] = useState({
    name: '',
    address: '',
    category: 'restaurant' as TravelPlace['category']
  });
  
  // 실제 Trip 데이터 상태
  const [tripData, setTripData] = useState<any>(null);
  const [actualTripId, setActualTripId] = useState<string | null>(null);

  // Trip 생성 및 ID 가져오기
  useEffect(() => {
    const createOrGetTrip = async () => {
      try {
        // 먼저 기존 Trip이 있는지 확인
        const response = await fetch('/api/trips');
        const trips = await response.json();
        
        // 푸켓 여행이 이미 있으면 사용
        const existingTrip = trips.find((trip: any) => trip.title.includes('푸켓'));
        
        if (existingTrip) {
          setActualTripId(existingTrip.id);
          setTripData({
            title: existingTrip.title,
            dates: { 
              start: new Date(existingTrip.startDate).toLocaleDateString('ko-KR').replace(/\./g, '.').slice(0, -1),
              end: new Date(existingTrip.endDate).toLocaleDateString('ko-KR').replace(/\./g, '.').slice(0, -1)
            },
            totalDays: Math.ceil((new Date(existingTrip.endDate).getTime() - new Date(existingTrip.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
          });
        } else {
          // 없으면 새로 생성
          const createResponse = await fetch('/api/trips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: '태국 푸켓 여행',
              description: '4일간의 태국 푸켓 여행',
              startDate: '2025-08-13',
              endDate: '2025-08-16'
            })
          });
          
          const newTrip = await createResponse.json();
          setActualTripId(newTrip.id);
          setTripData({
            title: newTrip.title,
            dates: { 
              start: new Date(newTrip.startDate).toLocaleDateString('ko-KR').replace(/\./g, '.').slice(0, -1),
              end: new Date(newTrip.endDate).toLocaleDateString('ko-KR').replace(/\./g, '.').slice(0, -1)
            },
            totalDays: Math.ceil((new Date(newTrip.endDate).getTime() - new Date(newTrip.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
          });
        }
      } catch (error) {
        console.error('Trip 생성/조회 실패:', error);
        // 실패시 임시 ID 사용
        setActualTripId('temp-trip-id');
      }
    };

    createOrGetTrip();
  }, []);

  // DB에서 장소 데이터 가져오기 (actualTripId가 있을 때만)
  const { 
    places, 
    addPlace, 
    updatePlace, 
    deletePlace, 
    updatePlacesOrder 
  } = usePlaces(actualTripId || 'loading');

  // 비용 데이터 가져오기
  const { getExpensesByPlace } = useExpenses(actualTripId || 'loading');

  // 화면 크기 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  

  // 드래그 앤 드롭 센서 설정 (부드러운 모션을 위해 개선)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
        delay: 100,
        tolerance: 5,
      },
    })
  );

  const getDayPlaces = (day: number) => {
    return places
      .filter(place => place.day === day)
      .sort((a, b) => a.order - b.order);
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'restaurant':
        return '맛집';
      case 'tourist_attraction':
        return '명소';
      case 'shopping':
        return '쇼핑';
      case 'hotel':
        return '숙소';
      case 'flight':
        return '항공';
      case 'transport':
        return '교통';
      default:
        return '기타';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'tourist_attraction':
        return 'text-blue-600 bg-blue-50';
      case 'hotel':
        return 'text-purple-600 bg-purple-50';
      case 'shopping':
        return 'text-green-600 bg-green-50';
      case 'restaurant':
        return 'text-orange-600 bg-orange-50';
      case 'flight':
        return 'text-sky-600 bg-sky-50';
      case 'transport':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getDayColor = (day: number) => {
    const colors = [
      '#6366f1', '#06b6d4', '#10b981', '#f59e0b'
    ];
    return colors[(day - 1) % colors.length];
  };

  const getDayGradient = (day: number) => {
    const gradients = [
      'from-slate-400 to-slate-500',
      'from-gray-400 to-gray-500', 
      'from-zinc-400 to-zinc-500',
      'from-stone-400 to-stone-500'
    ];
    return gradients[(day - 1) % gradients.length];
  };

  const formatDate = (dateStr: string, addDays: number) => {
    const date = new Date(dateStr.replace(/\./g, '-'));
    date.setDate(date.getDate() + addDays);
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return {
      date: date.toLocaleDateString('ko-KR', { 
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit'
      }).replace(/\./g, '-').slice(0, -1),
      weekday: weekdays[date.getDay()]
    };
  };

  // 운영시간 툴팁 컴포넌트
  const OperatingHoursTooltip = ({ hours, currentDay }: { hours?: { [key: string]: string }, currentDay: string }) => {
    if (!hours) return null;

  return (
      <div className="absolute z-10 w-auto p-2 text-xs text-gray-500 duration-300 scale-0 bg-white rounded-xl shadow-xl opacity-0 top-6 group-hover:opacity-100 group-hover:scale-100 border border-gray-100">
        <div className="flex flex-col items-baseline justify-center p-2 whitespace-nowrap">
          {Object.entries(hours).map(([day, time]) => (
            <div 
              key={day} 
              className={`whitespace-nowrap text-xs ${day === currentDay ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}
            >
              {day} : {time}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 장소 삭제 함수는 usePlaces 훅에서 가져옴

  // 카드 편집 함수들
  const startEditing = (placeId: string, field: string) => {
    setEditingId(placeId);
    setEditingField(field);
  };

  const stopEditing = () => {
    setEditingId(null);
    setEditingField(null);
  };

  // updatePlace 함수는 usePlaces 훅에서 가져옴
  
  const updatePlaceCategory = async (placeId: string, category: TravelPlace['category']) => {
    await updatePlace(placeId, { category });
  };

  // DraggableTimelineItem 컴포넌트 수정
  function DraggableTimelineItem({ 
    place, 
    index, 
    array, 
    isDragging = false 
  }: { 
    place: TravelPlace; 
    index: number; 
    array: TravelPlace[]; 
    isDragging?: boolean;
  }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isOver
    } = useSortable({ id: place.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition: isDragging ? 'none' : transition,
      opacity: activeId === place.id ? 0 : 1, // 드래그 중인 원본은 완전히 숨김
      zIndex: 'auto',
    };

    // 다른 카드 위에 드래그 중인지 확인
    const isDraggedOver = isOver && activeId && activeId !== place.id;

    const currentWeekday = ['일', '월', '화', '수', '목', '금', '토'][new Date().getDay()];
    const isEditing = editingId === place.id;

    // 편집 가능한 필드 컴포넌트
    const EditableField = ({ 
      field, 
      value, 
      className = "",
      placeholder = "",
      multiline = false 
    }: {
      field: string;
      value: string;
      className?: string;
      placeholder?: string;
      multiline?: boolean;
    }) => {
      const isFieldEditing = isEditing && editingField === field;
      
      const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !multiline) {
          stopEditing();
        } else if (e.key === 'Escape') {
          stopEditing();
        }
      };

      const handleBlur = () => {
        stopEditing();
      };

      const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        updatePlace(place.id, { [field]: e.target.value });
      };

      if (isFieldEditing) {
        if (multiline) {
          return (
            <textarea
              value={value}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className={`${className} bg-white border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none`}
              placeholder={placeholder}
              autoFocus
              rows={2}
            />
          );
        } else {
          return (
            <input
              type="text"
              value={value}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className={`${className} bg-white border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-200`}
              placeholder={placeholder}
              autoFocus
            />
          );
        }
      }

      return (
        <div 
          className={`${className} cursor-pointer hover:bg-gray-50 rounded px-2 py-1 transition-colors`}
          onClick={() => startEditing(place.id, field)}
        >
          {value || placeholder}
        </div>
      );
    };

    // 카테고리 선택 드롭다운
    const CategorySelect = () => {
      const isFieldEditing = isEditing && editingField === 'category';
      
      if (isFieldEditing) {
        return (
          <select
            value={place.category}
            onChange={(e) => {
              updatePlaceCategory(place.id, e.target.value as TravelPlace['category']);
              stopEditing();
            }}
            onBlur={stopEditing}
            className="text-xs font-medium text-gray-600 uppercase tracking-wide bg-white border border-blue-300 rounded px-1 focus:outline-none focus:ring-2 focus:ring-blue-200"
            autoFocus
          >
            <option value="attraction">명소</option>
            <option value="hotel">숙소</option>
            <option value="restaurant">식당</option>
            <option value="flight">항공</option>
            <option value="transport">교통</option>
            <option value="tourist_attraction">관광지</option>
            <option value="shopping">쇼핑</option>
          </select>
        );
      }

      return (
        <span 
          className="text-xs font-medium text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5 transition-colors"
          onClick={() => startEditing(place.id, 'category')}
        >
          {getCategoryName(place.category)}
        </span>
      );
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-full flex flex-col items-center relative"
      >
        {/* 삽입 표시선 - 드래그 오버 시 위쪽에 표시 */}
        {isDraggedOver && (
          <div className="w-full max-w-sm mx-auto mb-2">
            <div className="h-1 bg-blue-500 rounded-full shadow-lg animate-pulse"></div>
            <div className="text-center text-xs text-blue-600 font-medium mt-1">
              여기에 추가됩니다
            </div>
          </div>
        )}

        {/* 배경 연결선 (전체를 관통) */}
        {index < array.length - 1 && !isDragging && (
          <div className="absolute top-0 left-1/2 w-0.5 h-full bg-gradient-to-b from-gray-300 via-gray-400 to-gray-300 transform -translate-x-1/2 z-0"></div>
        )}

        {/* 카드 */}
        <div className={`relative bg-white rounded-2xl shadow-lg border border-gray-100 p-4 w-full max-w-sm mx-auto mb-3 z-10 transition-all duration-200 ${
          isDraggedOver ? 'transform translate-y-2' : ''
        }`}>
          {/* 드래그 핸들 */}
          <div 
            {...listeners} 
            {...attributes}
            className="absolute top-4 right-4 cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded transition-colors z-20 select-none"
            style={{ touchAction: 'none' }}
          >
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>

          {/* 모바일 이동 버튼 */}
          <button
            onClick={() => {
              setSelectedPlaceForMove(place.id);
              setShowMoveModal(true);
            }}
            className="absolute top-4 left-4 p-1 hover:bg-blue-50 rounded transition-colors group z-20 lg:hidden"
          >
            <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>

          {/* 데스크탑 삭제 버튼 */}
          <button
            onClick={() => deletePlace(place.id)}
            className="absolute top-4 left-4 p-1 hover:bg-red-50 rounded transition-colors z-20 group hidden lg:block"
          >
            <svg className="w-4 h-4 text-gray-400 group-hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* 카테고리 */}
          <div className="flex items-center justify-between mb-2 ml-8 mr-8">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${getCategoryColor(place.category)}`}></div>
              <CategorySelect />
            </div>
            
            {/* 비용 표시 */}
            <div className="text-right">
              {(() => {
                const placeExpenses = getExpensesByPlace(place.id);
                const total = placeExpenses.reduce((sum, exp) => sum + exp.amount, 0);
                return total > 0 ? (
                  <div className="text-xs text-blue-600 font-medium">
                    💰 {new Intl.NumberFormat('ko-KR').format(total)}원
                  </div>
                ) : null;
              })()}
            </div>
          </div>

          {/* 제목과 시간 */}
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-gray-900 text-lg leading-tight flex-1 mr-8 ml-8">
              {place.name}
            </h3>
            <div className="text-right space-y-1 flex flex-col items-end">
              <EditableField
                field="time"
                value={place.time}
                className="text-sm font-medium text-gray-700"
                placeholder="00:00-00:00"
              />
              <div className="flex items-center space-x-2">
                <EditableField
                  field="duration"
                  value={place.duration}
                  className="text-xs text-gray-500"
                  placeholder="1시간"
                />
                {/* 모바일 삭제 버튼 */}
                <button
                  onClick={() => deletePlace(place.id)}
                  className="p-1 hover:bg-red-50 rounded transition-colors lg:hidden"
                >
                  <svg className="w-4 h-4 text-red-500 hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H7a1 1 0 00-1 1v3m12 0H5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* 주소 (편집 불가) */}
          <div className="flex items-center justify-between mb-3 ml-8">
            <p className="text-sm text-gray-600 flex-1 mr-2">{place.address}</p>
            {/* 모바일 주소 복사 버튼 */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(place.address).then(() => {
                  // 성공 알림
                  alert('주소가 복사되었습니다!');
                }).catch(err => {
                  console.error('주소 복사 실패:', err);
                  // 복사 실패 시 알림
                  alert('주소 복사에 실패했습니다.');
                });
              }}
              className="p-1 hover:bg-gray-100 rounded transition-colors lg:hidden"
              title="주소 복사"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>

          {/* 운영시간 툴팁 */}
          <div className="ml-8">
            <OperatingHoursTooltip hours={place.operatingHours} currentDay={currentWeekday} />
          </div>
        </div>
      </div>
    );
  }

  // 드롭 존 컴포넌트 (개선된 크로스 데이 드래그 지원)
  const DropZone = ({ day, children }: { day: number, children: React.ReactNode }) => {
    const { isOver, setNodeRef } = useDroppable({
      id: `day-${day}`,
    });

    const activePlace = activeId ? places.find(p => p.id === activeId) : null;
    const isDraggingFromOtherDay = activePlace && activePlace.day !== day;
    const isDraggingToThisDay = isOver && isDraggingFromOtherDay;

    return (
      <div 
        ref={setNodeRef}
        className={`min-h-[500px] p-6 rounded-xl border-2 transition-all duration-300 relative ${
          isDraggingToThisDay
            ? 'border-blue-500 bg-blue-100/50 shadow-xl scale-[1.02] border-solid' 
            : isDraggingFromOtherDay
            ? 'border-blue-300 bg-blue-50/30 border-dashed'
            : 'border-gray-200 border-dashed'
        }`}
        style={{ 
          zIndex: isDraggingToThisDay ? 20 : 1,
          transform: isDraggingToThisDay ? 'translateY(-2px)' : 'translateY(0px)'
        }}
      >
        {/* 드롭 가능 표시 오버레이 */}
        {isDraggingToThisDay && (
          <div className="absolute inset-0 rounded-xl bg-blue-500/10 border-2 border-blue-500 flex items-center justify-center pointer-events-none">
            <div className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium shadow-lg">
              {day}일차에 추가하기
            </div>
          </div>
        )}
        
        <div className="relative" style={{ zIndex: 10 }}>
          {children}
        </div>
      </div>
    );
  };

  // 드래그 시작
  const handleDragStart = (event: DragStartEvent) => {
    console.log('드래그 시작:', event.active.id);
    setActiveId(event.active.id as string);
  };

  // 드래그 종료
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    console.log('드래그 종료:', { activeId: active.id, overId: over?.id });
    setActiveId(null);

    if (!over) {
      console.log('드롭 대상 없음');
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // 같은 위치면 아무것도 하지 않음
    if (activeId === overId) {
      console.log('같은 위치에 드롭');
      return;
    }

    const activePlace = places.find(p => p.id === activeId);
    if (!activePlace) {
      console.log('활성 장소를 찾을 수 없음');
      return;
    }

    console.log('현재 장소:', activePlace);

    // 드롭 대상이 날짜 컨테이너인지 확인 (빈 공간에 드롭)
    if (overId.startsWith('day-')) {
      const targetDay = parseInt(overId.replace('day-', ''));
      
      // 같은 날짜면 아무것도 하지 않음
      if (activePlace.day === targetDay) {
        console.log('같은 날짜에 드롭');
        return;
      }
      
      console.log(`${activePlace.day}일차에서 ${targetDay}일차로 이동 (마지막 위치)`);
      
      // API를 통한 순서 업데이트
      const targetDayPlaces = places.filter(p => p.day === targetDay);
      
      const newPlaces = places.map(place => {
        if (place.id === activeId) {
          console.log(`장소 이동: ${place.name} -> ${targetDay}일차`);
          return {
            ...place,
            day: targetDay,
            order: targetDayPlaces.length + 1
          };
        }
        return place;
      });

      // 기존 날짜의 순서 재정렬
      const oldDayPlaces = newPlaces.filter(p => p.day === activePlace.day && p.id !== activeId);
      oldDayPlaces.forEach((place, index) => {
        const placeIndex = newPlaces.findIndex(p => p.id === place.id);
        if (placeIndex !== -1) {
          newPlaces[placeIndex].order = index + 1;
        }
      });

      console.log('업데이트된 장소들:', newPlaces);
      await updatePlacesOrder(newPlaces);
      return;
    }

    // 다른 카드 위에 드롭한 경우 - 중간 삽입 지원
    const overPlace = places.find(p => p.id === overId);
    if (!overPlace) {
      console.log('드롭 대상 장소를 찾을 수 없음');
      return;
    }

    console.log(`카드 위에 드롭: ${activePlace.name} -> ${overPlace.name} 위치`);

    // 다른 날짜의 카드 위에 드롭한 경우 - 그 위치에 삽입
    if (activePlace.day !== overPlace.day) {
      console.log(`다른 날짜로 이동: ${activePlace.day}일차 -> ${overPlace.day}일차, ${overPlace.name} 앞에 삽입`);
      
      const targetDay = overPlace.day;
      const insertAtOrder = overPlace.order;
      
      const newPlaces = places.map(place => {
        if (place.id === activeId) {
          // 드래그한 카드를 타겟 위치에 삽입
          return { ...place, day: targetDay, order: insertAtOrder };
        }
        
        // 타겟 날짜에서 삽입 위치부터 순서 +1
        if (place.day === targetDay && place.order >= insertAtOrder && place.id !== activeId) {
          return { ...place, order: place.order + 1 };
        }
        
        // 기존 날짜에서 드래그한 카드 이후 순서들 -1로 당김
        if (place.day === activePlace.day && place.order > activePlace.order) {
          return { ...place, order: place.order - 1 };
        }
        
        return place;
      });

      await updatePlacesOrder(newPlaces);
      return;
    }

    // 같은 날짜 내에서 순서 변경 - 정확한 위치에 삽입
    console.log(`같은 날짜 내 순서 변경: ${activePlace.name} -> ${overPlace.name} 앞에 삽입`);

    const dayPlaces = places.filter(p => p.day === activePlace.day).sort((a, b) => a.order - b.order);
    const activeIndex = dayPlaces.findIndex(p => p.id === activeId);
    const overIndex = dayPlaces.findIndex(p => p.id === overId);

    if (activeIndex === overIndex) {
      console.log('같은 위치');
      return;
    }

    // arrayMove를 사용해서 정확한 위치로 이동
    const reorderedPlaces = arrayMove(dayPlaces, activeIndex, overIndex);
    
    // 새로운 순서 번호 할당
    const newPlaces = places.map(place => {
      if (place.day !== activePlace.day) return place;
      
      const reorderedIndex = reorderedPlaces.findIndex(p => p.id === place.id);
      if (reorderedIndex !== -1) {
        return { ...place, order: reorderedIndex + 1 };
      }
      return place;
    });
    
    await updatePlacesOrder(newPlaces);
  };

  // Google Places API 검색 함수
  const searchPlaces = async (query: string) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      // Google Maps API가 로드되었는지 확인
      if (!window.google || !window.google.maps) {
        console.error('Google Maps API가 로드되지 않았습니다.');
        // 백업으로 목업 데이터 사용
        const mockResults: PlaceResult[] = [
          {
            place_id: 'mock1',
            name: query.includes('스타벅스') ? '스타벅스 강남점' : `${query} 검색 결과 1`,
            formatted_address: '서울특별시 강남구 테헤란로 123',
            geometry: { location: { lat: 37.5665, lng: 126.9780 } },
            types: ['cafe', 'establishment'],
            opening_hours: {
              weekday_text: ['월요일: 07:00~22:00', '화요일: 07:00~22:00', '수요일: 07:00~22:00', '목요일: 07:00~22:00', '금요일: 07:00~22:00', '토요일: 08:00~22:00', '일요일: 08:00~21:00']
            }
          }
        ];
        setSearchResults(mockResults);
        setIsSearching(false);
        return;
      }

      // Google Places API 사용
      const service = new window.google.maps.places.PlacesService(document.createElement('div'));
      
      const request = {
        query: query,
        fields: ['place_id', 'name', 'formatted_address', 'geometry', 'types', 'opening_hours'],
        language: 'ko'
      };

      service.textSearch(request, (results: PlaceResult[] | null, status: string) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          const formattedResults: PlaceResult[] = results.slice(0, 5).map(place => ({
            place_id: place.place_id,
            name: place.name,
            formatted_address: place.formatted_address,
            geometry: {
              location: {
                lat: (place.geometry.location as any).lat(),
                lng: (place.geometry.location as any).lng()
              }
            },
            types: place.types,
            opening_hours: place.opening_hours ? {
              weekday_text: place.opening_hours.weekday_text
            } : undefined
          }));
          
          setSearchResults(formattedResults);
        } else {
          console.error('Places API 검색 실패:', status);
          // 백업으로 목업 데이터 사용
          const mockResults: PlaceResult[] = [
            {
              place_id: 'mock1',
              name: `${query} (API 오류 - 목업 데이터)`,
              formatted_address: '검색된 주소 정보',
              geometry: { location: { lat: 37.5665, lng: 126.9780 } },
              types: ['establishment']
            }
          ];
          setSearchResults(mockResults);
        }
        setIsSearching(false);
      });
      
    } catch (error) {
      console.error('장소 검색 오류:', error);
      // 오류 시 목업 데이터 사용
      const mockResults: PlaceResult[] = [
        {
          place_id: 'error1',
          name: `${query} (오류 발생 - 목업 데이터)`,
          formatted_address: '오류로 인한 임시 주소',
          geometry: { location: { lat: 37.5665, lng: 126.9780 } },
          types: ['establishment']
        }
      ];
      setSearchResults(mockResults);
      setIsSearching(false);
    }
  };

  // 새 장소 추가 함수 (수정)
  const openAddModal = (day: number) => {
    setSelectedDayForAdd(day);
    setShowAddModal(true);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPlace(null);
    setDuration('1시간');
    setStartTime('09:00');
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setSelectedPlace(null);
    setSearchQuery('');
    setSearchResults([]);
    setIsManualMode(false);
    setManualPlace({ name: '', address: '', category: 'restaurant' });
  };

  // 수동 추가 모드 전환
  const switchToManualMode = () => {
    setIsManualMode(true);
    setSearchResults([]);
    setSelectedPlace(null);
    // 검색어가 있으면 장소명에 자동 입력
    if (searchQuery.trim()) {
      setManualPlace({...manualPlace, name: searchQuery.trim()});
    }
  };

  const switchToSearchMode = () => {
    setIsManualMode(false);
    setManualPlace({ name: '', address: '', category: 'restaurant' });
  };

  // 수동으로 장소 추가
  const addManualPlace = async () => {
    if (!manualPlace.name.trim()) return;

    await addPlace({
      name: manualPlace.name,
      address: manualPlace.address || '주소 미입력',
      time: `${startTime}-${calculateEndTime(startTime, duration)}`,
      duration: duration,
      day: selectedDayForAdd,
      order: places.filter(p => p.day === selectedDayForAdd).length + 1,
      category: manualPlace.category,
      operatingHours: {
        월: '정보 없음',
        화: '정보 없음', 
        수: '정보 없음',
        목: '정보 없음',
        금: '정보 없음',
        토: '정보 없음',
        일: '정보 없음'
      },
      tripId: actualTripId!
    });
    closeAddModal();
  };

  const addPlaceFromSearch = async () => {
    if (!selectedPlace) return;

    // 카테고리 자동 감지
    const getPlaceCategory = (types: string[]): TravelPlace['category'] => {
      if (types.includes('lodging')) return 'hotel';
      if (types.includes('restaurant') || types.includes('food')) return 'restaurant';
      if (types.includes('shopping_mall') || types.includes('store')) return 'shopping';
      if (types.includes('transit_station')) return 'transport';
      return 'attraction';
    };

    // 운영시간 변환
    const convertOpeningHours = (weekdayText?: string[]) => {
      if (!weekdayText) {
        return {
          '일': '00:00~24:00', '월': '00:00~24:00', '화': '00:00~24:00',
          '수': '00:00~24:00', '목': '00:00~24:00', '금': '00:00~24:00', '토': '00:00~24:00'
        };
      }

      const dayMap: { [key: string]: string } = {
        'Monday': '월', 'Tuesday': '화', 'Wednesday': '수', 'Thursday': '목',
        'Friday': '금', 'Saturday': '토', 'Sunday': '일'
      };

      const hours: { [key: string]: string } = {};
      weekdayText.forEach(text => {
        Object.keys(dayMap).forEach(eng => {
          if (text.includes(eng)) {
            const time = text.split(': ')[1] || '00:00~24:00';
            hours[dayMap[eng]] = time;
          }
        });
      });

      return hours;
    };

    const endTime = calculateEndTime(startTime, duration);
    
    await addPlace({
      name: selectedPlace.name,
      address: selectedPlace.formatted_address,
      time: `${startTime}-${endTime}`,
      duration: duration,
      order: getDayPlaces(selectedDayForAdd).length + 1,
      day: selectedDayForAdd,
      category: getPlaceCategory(selectedPlace.types),
      operatingHours: convertOpeningHours(selectedPlace.opening_hours?.weekday_text),
      tripId: actualTripId!,
      placeId: selectedPlace.place_id
    });

    closeAddModal();
  };

  // 시간 계산 헬퍼 함수
  const calculateEndTime = (start: string, duration: string): string => {
    const [hours, minutes] = start.split(':').map(Number);
    const durationHours = parseInt(duration.replace(/[^0-9]/g, '')) || 1;
    
    const endHours = (hours + durationHours) % 24;
    return `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // 현재 드래그 중인 아이템 찾기
  const activePlace = activeId ? places.find(p => p.id === activeId) : null;

  // Trip 데이터가 없으면 로딩
  if (!tripData || !actualTripId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">여행 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 비용 페이지인 경우 ExpenseManager 컴포넌트 렌더링
  if (currentPage === 'expense') {
    return (
      <ExpenseManager 
        tripData={tripData} 
        tripId={actualTripId!}
        onBack={() => setCurrentPage('schedule')}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onPageChange={setCurrentPage}
      />
    );
  }

  // 모바일 레이아웃
  if (isMobile) {
          return (
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
      >
        <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
          {/* 상단 헤더 - 모바일용 햄버거 메뉴 포함 */}
          <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200 p-4 flex-shrink-0 z-20">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900">{tripData.title}</h1>
              <div className="w-10"></div> {/* Spacer for centering */}
            </div>
            <div className="text-sm text-gray-600 text-center">
              {tripData.dates.start} - {tripData.dates.end}
            </div>
          </div>

          {/* 모바일 사이드바 오버레이 */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-white bg-opacity-20 backdrop-blur-sm z-40"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* 모바일 사이드바 */}
          <div className={`w-64 bg-white border-r border-gray-200 flex flex-col shadow-xl transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed h-full z-50`}>
            {/* 헤더 */}
            <div className="p-6 border-b border-gray-100">
              <h1 className="text-xl font-bold text-gray-900 mb-1">{tripData.title}</h1>
              <div className="text-sm text-gray-500">
                {tripData.dates.start} ~ {tripData.dates.end}
              </div>
            </div>

            {/* 메뉴 네비게이션 */}
            <div className="flex-1 py-6">
              <nav className="space-y-2 px-4">
                <button
                  onClick={() => {
                    setCurrentPage('schedule');
                    setSidebarOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">일정 관리</span>
                </button>
                
                <button
                  onClick={() => {
                    setCurrentPage('expense');
                    setSidebarOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 text-gray-700 hover:bg-gray-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <span className="font-medium">비용 관리</span>
                </button>
              </nav>
            </div>

            {/* 하단 정보 */}
            <div className="p-4 border-t border-gray-100">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>{tripData.totalDays}일 여행</span>
                </div>
              </div>
            </div>
          </div>

          {/* 날짜별 탭 */}
          <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200 px-4 py-3 flex-shrink-0 z-10">
            <div className="flex space-x-2 overflow-x-auto">
              {Array.from({ length: tripData.totalDays }, (_, i) => i + 1).map(day => (
            <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`flex-shrink-0 px-6 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 ${
                    selectedDay === day
                      ? `bg-gradient-to-r ${getDayGradient(day)} text-white shadow-lg transform scale-105`
                      : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm'
                  }`}
                >
                  {day}일차
                </button>
              ))}
            </div>
          </div>

          {/* 선택된 날짜의 일정 - 스크롤 가능한 영역 */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 pb-4">
              <div className="max-w-2xl mx-auto">
                {/* 날짜 헤더 */}
                <div className="text-center">
                  <div className={`inline-block px-8 py-4 rounded-3xl text-white font-bold text-xl shadow-xl bg-gradient-to-r ${getDayGradient(selectedDay)}`}>
                    {selectedDay}일차
                  </div>
                  <div className="text-sm text-gray-600 mt-3">
                    {formatDate(tripData.dates.start, selectedDay - 1).date}({formatDate(tripData.dates.start, selectedDay - 1).weekday})
                  </div>
                </div>

                {/* 타임라인 */}
                <SortableContext items={getDayPlaces(selectedDay).map(p => p.id)} strategy={verticalListSortingStrategy}>
                  <DropZone day={selectedDay}>
                    <div className="space-y-0">
                      {getDayPlaces(selectedDay).map((place, index, array) => {
                        const dayInfo = formatDate(tripData.dates.start, selectedDay - 1);
                        return (
                          <DraggableTimelineItem 
                            key={place.id} 
                            place={place} 
                            index={index} 
                            array={array} 
                            isDragging={false}
                          />
                        );
                      })}
                      
                      {/* 새 일정 추가 버튼 */}
                      <div className="flex justify-center py-6">
                        <button
                          onClick={() => openAddModal(selectedDay)}
                          className="flex items-center space-x-2 px-6 py-3 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-all duration-200"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span>새 일정 추가</span>
                        </button>
                      </div>
                      
                      {/* 하단 여백 */}
                      <div className="h-4"></div>
                    </div>
                  </DropZone>
                </SortableContext>
              </div>
            </div>
          </div>
        </div>

        {/* DragOverlay 추가 (깔끔한 단일 카드) */}
        <DragOverlay>
          {activePlace ? (
            <div 
              className="w-full max-w-sm mx-auto"
              style={{
                transform: 'rotate(2deg) scale(1.03)',
                cursor: 'grabbing',
                boxShadow: '0 12px 24px rgba(0, 0, 0, 0.2)',
              }}
            >
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${getCategoryColor(activePlace.category)}`}></div>
                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    {getCategoryName(activePlace.category)}
                  </span>
                </div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-900 text-lg leading-tight flex-1 mr-4">
                    {activePlace.name}
                  </h3>
                  <div className="text-right space-y-1">
                    <div className="text-sm font-medium text-gray-700">{activePlace.time}</div>
                    <div className="text-xs text-gray-500">{activePlace.duration}</div>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{activePlace.address}</p>
              </div>
            </div>
          ) : null}
        </DragOverlay>

        {/* 장소 검색 모달 - 모바일용 */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* 모달 헤더 */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">새 일정 추가</h2>
                  <button
                    onClick={closeAddModal}
                    className="p-1 hover:bg-gray-100 rounded-lg"
                  >
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-2">{selectedDayForAdd}일차에 추가</p>
                
                {/* 검색/수동 전환 탭 */}
                <div className="flex mt-4 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={switchToSearchMode}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                      !isManualMode 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    🔍 검색으로 추가
                  </button>
                  <button
                    onClick={switchToManualMode}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                      isManualMode 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    ✏️ 직접 입력
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {!isManualMode ? (
                  <>
                    {/* 장소 검색 */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">장소 검색</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchPlaces(searchQuery)}
                      placeholder="장소명을 입력하세요 (예: 스타벅스, 경복궁)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                    />
                    <button
                      onClick={() => searchPlaces(searchQuery)}
                      disabled={isSearching}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 hover:text-blue-700 disabled:opacity-50"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 검색 결과 */}
                {isSearching && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-gray-500 mt-2">검색 중...</p>
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">검색 결과</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {searchResults.map((place) => (
                        <button
                          key={place.place_id}
                          onClick={() => setSelectedPlace(place)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            selectedPlace?.place_id === place.place_id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-medium text-gray-900">{place.name}</div>
                          <div className="text-sm text-gray-600">{place.formatted_address}</div>
                        </button>
                      ))}
                    </div>
                    
                    {/* 직접 추가 버튼 */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <button
                        onClick={switchToManualMode}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg border border-dashed border-gray-300 hover:border-gray-400 transition-all duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>원하는 곳이 없나요? 직접 추가하기</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 검색했지만 결과가 없을 때도 직접 추가 버튼 표시 */}
                {searchQuery && searchResults.length === 0 && !isSearching && (
                  <div className="mb-6">
                    <div className="text-center py-6">
                      <div className="text-gray-400 mb-3">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 mb-4">"{searchQuery}"에 대한 검색 결과가 없습니다</p>
                      <button
                        onClick={switchToManualMode}
                        className="inline-flex items-center space-x-2 px-6 py-3 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-all duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>직접 추가하기</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 시간 설정 */}
                {selectedPlace && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">시작 시간</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">머무는 시간</label>
                      <select
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        <option value="30분">30분</option>
                        <option value="1시간">1시간</option>
                        <option value="1시간 30분">1시간 30분</option>
                        <option value="2시간">2시간</option>
                        <option value="3시간">3시간</option>
                        <option value="4시간">4시간</option>
                        <option value="반나절">반나절</option>
                        <option value="하루">하루</option>
                      </select>
                    </div>

                    {/* 선택된 장소 미리보기 */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">선택된 장소</h4>
                      <p className="text-sm text-gray-700">{selectedPlace.name}</p>
                      <p className="text-xs text-gray-500">{selectedPlace.formatted_address}</p>
                      <p className="text-xs text-blue-600 mt-1">
                        {startTime} - {calculateEndTime(startTime, duration)} ({duration})
                      </p>
                    </div>
                  </div>
                )}
                  </>
                ) : (
                  <>
                    {/* 수동 입력 폼 */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">장소명 *</label>
                        <input
                          type="text"
                          value={manualPlace.name}
                          onChange={(e) => setManualPlace({...manualPlace, name: e.target.value})}
                          placeholder="장소명을 입력하세요"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">주소</label>
                        <input
                          type="text"
                          value={manualPlace.address}
                          onChange={(e) => setManualPlace({...manualPlace, address: e.target.value})}
                          placeholder="주소를 입력하세요 (선택사항)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
                        <select
                          value={manualPlace.category}
                          onChange={(e) => setManualPlace({...manualPlace, category: e.target.value as TravelPlace['category']})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                        >
                          <option value="restaurant">🍽️ 식당</option>
                          <option value="tourist_attraction">🏛️ 관광지</option>
                          <option value="shopping">🛍️ 쇼핑</option>
                          <option value="hotel">🏨 숙박</option>
                          <option value="flight">✈️ 항공</option>
                          <option value="transport">🚌 교통</option>
                          <option value="attraction">🎢 놀거리</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">시작 시간</label>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">머무는 시간</label>
                        <select
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                        >
                          <option value="30분">30분</option>
                          <option value="1시간">1시간</option>
                          <option value="1시간 30분">1시간 30분</option>
                          <option value="2시간">2시간</option>
                          <option value="3시간">3시간</option>
                          <option value="4시간">4시간</option>
                          <option value="반나절">반나절</option>
                          <option value="하루">하루</option>
                        </select>
                      </div>

                      {/* 입력된 내용 미리보기 */}
                      {manualPlace.name && (
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-2">미리보기</h4>
                          <p className="text-sm text-gray-700">{manualPlace.name}</p>
                          {manualPlace.address && <p className="text-xs text-gray-500">{manualPlace.address}</p>}
                          <p className="text-xs text-blue-600 mt-1">
                            {startTime} - {calculateEndTime(startTime, duration)} ({duration})
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* 모달 푸터 */}
              <div className="p-6 border-t border-gray-200 flex-shrink-0">
                <div className="flex space-x-3">
                  <button
                    onClick={closeAddModal}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={isManualMode ? addManualPlace : addPlaceFromSearch}
                    disabled={isManualMode ? !manualPlace.name.trim() : !selectedPlace}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    추가
                  </button>
            </div>
          </div>
        </div>
      </div>
                 )}

        {/* 일정 이동 모달 - 모바일용 */}
        {showMoveModal && selectedPlaceForMove && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6">
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900 mb-4">일정 이동</h3>
                <p className="text-sm text-gray-600 mb-6">
                  {places.find(p => p.id === selectedPlaceForMove)?.name}을<br/>
                  어느 날짜로 이동하시겠습니까?
                </p>
                
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {Array.from({ length: tripData.totalDays }, (_, i) => i + 1).map(day => {
                    const currentPlace = places.find(p => p.id === selectedPlaceForMove);
                    const isCurrentDay = currentPlace?.day === day;
                    
                    return (
                      <button
                        key={day}
                        onClick={async () => {
                          if (selectedPlaceForMove && !isCurrentDay) {
                            const placeToMove = places.find(p => p.id === selectedPlaceForMove);
                            if (placeToMove) {
                              const targetDayPlaces = places.filter(p => p.day === day);
                              
                              const newPlaces = places.map(place => {
                                if (place.id === selectedPlaceForMove) {
                                  return {
                                    ...place,
                                    day: day,
                                    order: targetDayPlaces.length + 1
                                  };
                                }
                                // 기존 날짜의 순서 재정렬
                                if (place.day === placeToMove.day && place.order > placeToMove.order) {
                                  return { ...place, order: place.order - 1 };
                                }
                                return place;
                              });

                              await updatePlacesOrder(newPlaces);
                              setShowMoveModal(false);
                              setSelectedPlaceForMove(null);
                            }
                          }
                        }}
                        disabled={isCurrentDay}
                        className={`py-3 px-4 rounded-lg font-medium transition-all ${
                          isCurrentDay
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {day}일차
                        {isCurrentDay && <div className="text-xs">(현재)</div>}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => {
                    setShowMoveModal(false);
                    setSelectedPlaceForMove(null);
                  }}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </DndContext>
    );
  }

  // 데스크탑 레이아웃
  return (
          <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
      >
        <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex relative">
        {/* 모바일 헤더 */}
        <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 p-4 z-50">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-gray-900">{tripData.title}</h1>
            <div className="w-10"></div> {/* Spacer for centering */}
          </div>
        </div>

        {/* 모바일 사이드바 오버레이 */}
        {sidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* 왼쪽 사이드바 (어드민 스타일 메뉴) */}
        <div className={`w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:relative fixed h-full z-50`}>
          {/* 헤더 */}
          <div className="p-6 border-b border-gray-100">
            <h1 className="text-xl font-bold text-gray-900 mb-1">{tripData.title}</h1>
            <div className="text-sm text-gray-500">
              Made for 수인♥️
            </div>
            <div className="text-sm text-gray-500">
              {tripData.dates.start} ~ {tripData.dates.end}
            </div>
          </div>

          {/* 메뉴 네비게이션 */}
          <div className="flex-1 py-6">
            <nav className="space-y-2 px-4">
              <button
                onClick={() => {
                  setCurrentPage('schedule');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                  (currentPage as string) === 'schedule'
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">일정 관리</span>
              </button>
              
              <button
                onClick={() => {
                  setCurrentPage('expense');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                  (currentPage as string) === 'expense'
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <span className="font-medium">비용 관리</span>
              </button>
            </nav>
          </div>

          {/* 하단 정보 */}
          <div className="p-4 border-t border-gray-100">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>{tripData.totalDays}일 여행</span>
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽 메인 컨텐츠 */}
        <div className="flex-1 overflow-auto pt-20 lg:pt-0">
          <div className="p-4 lg:p-8">
            {/* 날짜별 컬럼 헤더 (개선된 디자인) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8 mb-8">
              {Array.from({ length: tripData.totalDays }, (_, i) => i + 1).map(day => {
                const dayInfo = formatDate(tripData.dates.start, day - 1);
                return (
                  <div key={day} className="text-center">
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {day}일차
                      </div>
                      <div className="text-sm text-gray-500 font-medium">
                        {dayInfo.date}
                      </div>
                      <div className="text-xs text-gray-400">
                        {dayInfo.weekday}요일
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 날짜별 일정 컬럼들 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
              {Array.from({ length: tripData.totalDays }, (_, i) => i + 1).map(day => {
                const dayPlaces = getDayPlaces(day);
                const dayInfo = formatDate(tripData.dates.start, day - 1);
                
                return (
                  <DropZone key={day} day={day}>
                    <SortableContext 
                      items={dayPlaces.map(p => p.id)} 
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-0">
                        {dayPlaces.map((place, index) => (
                          <DraggableTimelineItem 
                            key={place.id} 
                            place={place} 
                            index={index} 
                            array={dayPlaces}
                            isDragging={false}
                          />
                        ))}
                        
                        {/* 새 일정 추가 버튼 */}
                        <div className="flex justify-center py-4">
                          <button
                            onClick={() => openAddModal(day)}
                            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-all duration-200"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>새 일정 추가</span>
                          </button>
                        </div>
                      </div>
                    </SortableContext>
                  </DropZone>
                );
              })}
          </div>
          </div>
        </div>

      {/* DragOverlay 추가 (데스크탑용 - 깔끔한 단일 카드) */}
      <DragOverlay>
        {activePlace ? (
          <div 
            className="w-full max-w-sm mx-auto"
            style={{
              transform: 'rotate(2deg) scale(1.03)',
              cursor: 'grabbing',
              boxShadow: '0 12px 24px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${getCategoryColor(activePlace.category)}`}></div>
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  {getCategoryName(activePlace.category)}
                </span>
              </div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-gray-900 text-lg leading-tight flex-1 mr-4">
                  {activePlace.name}
                </h3>
                <div className="text-right space-y-1">
                  <div className="text-sm font-medium text-gray-700">{activePlace.time}</div>
                  <div className="text-xs text-gray-500">{activePlace.duration}</div>
                </div>
              </div>
              <p className="text-sm text-gray-600">{activePlace.address}</p>
            </div>
          </div>
        ) : null}
      </DragOverlay>

      {/* 장소 검색 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* 모달 헤더 */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">새 일정 추가</h2>
                <button
                  onClick={closeAddModal}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">{selectedDayForAdd}일차에 추가</p>
              
              {/* 검색/수동 전환 탭 */}
              <div className="flex mt-4 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={switchToSearchMode}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    !isManualMode 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🔍 검색으로 추가
                </button>
                <button
                  onClick={switchToManualMode}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    isManualMode 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  ✏️ 직접 입력
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {!isManualMode ? (
                <>
                  {/* 장소 검색 */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">장소 검색</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchPlaces(searchQuery)}
                    placeholder="장소명을 입력하세요 (예: 스타벅스, 경복궁)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                  />
                  <button
                    onClick={() => searchPlaces(searchQuery)}
                    disabled={isSearching}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 hover:text-blue-700 disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 검색 결과 */}
              {isSearching && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-gray-500 mt-2">검색 중...</p>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">검색 결과</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {searchResults.map((place) => (
                      <button
                        key={place.place_id}
                        onClick={() => setSelectedPlace(place)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedPlace?.place_id === place.place_id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-gray-900">{place.name}</div>
                        <div className="text-sm text-gray-600">{place.formatted_address}</div>
                      </button>
                    ))}
                  </div>
                  
                  {/* 직접 추가 버튼 */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <button
                      onClick={switchToManualMode}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg border border-dashed border-gray-300 hover:border-gray-400 transition-all duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>원하는 곳이 없나요? 직접 추가하기</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 검색했지만 결과가 없을 때도 직접 추가 버튼 표시 */}
              {searchQuery && searchResults.length === 0 && !isSearching && (
                <div className="mb-6">
                  <div className="text-center py-6">
                    <div className="text-gray-400 mb-3">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 mb-4">"{searchQuery}"에 대한 검색 결과가 없습니다</p>
                    <button
                      onClick={switchToManualMode}
                      className="inline-flex items-center space-x-2 px-6 py-3 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-all duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>직접 추가하기</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 시간 설정 */}
              {selectedPlace && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">시작 시간</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">머무는 시간</label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="30분">30분</option>
                      <option value="1시간">1시간</option>
                      <option value="1시간 30분">1시간 30분</option>
                      <option value="2시간">2시간</option>
                      <option value="3시간">3시간</option>
                      <option value="4시간">4시간</option>
                      <option value="반나절">반나절</option>
                      <option value="하루">하루</option>
                    </select>
                  </div>

                  {/* 선택된 장소 미리보기 */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">선택된 장소</h4>
                    <p className="text-sm text-gray-700">{selectedPlace.name}</p>
                    <p className="text-xs text-gray-500">{selectedPlace.formatted_address}</p>
                    <p className="text-xs text-blue-600 mt-1">
                      {startTime} - {calculateEndTime(startTime, duration)} ({duration})
                    </p>
                  </div>
                </div>
              )}
                </>
              ) : (
                <>
                  {/* 수동 입력 폼 */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">장소명 *</label>
                      <input
                        type="text"
                        value={manualPlace.name}
                        onChange={(e) => setManualPlace({...manualPlace, name: e.target.value})}
                        placeholder="장소명을 입력하세요"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">주소</label>
                      <input
                        type="text"
                        value={manualPlace.address}
                        onChange={(e) => setManualPlace({...manualPlace, address: e.target.value})}
                        placeholder="주소를 입력하세요 (선택사항)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
                      <select
                        value={manualPlace.category}
                        onChange={(e) => setManualPlace({...manualPlace, category: e.target.value as TravelPlace['category']})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        <option value="restaurant">🍽️ 식당</option>
                        <option value="tourist_attraction">🏛️ 관광지</option>
                        <option value="shopping">🛍️ 쇼핑</option>
                        <option value="hotel">🏨 숙박</option>
                        <option value="flight">✈️ 항공</option>
                        <option value="transport">🚌 교통</option>
                        <option value="attraction">🎢 놀거리</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">시작 시간</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">머무는 시간</label>
                      <select
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        <option value="30분">30분</option>
                        <option value="1시간">1시간</option>
                        <option value="1시간 30분">1시간 30분</option>
                        <option value="2시간">2시간</option>
                        <option value="3시간">3시간</option>
                        <option value="4시간">4시간</option>
                        <option value="반나절">반나절</option>
                        <option value="하루">하루</option>
                      </select>
                    </div>

                    {/* 입력된 내용 미리보기 */}
                    {manualPlace.name && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">미리보기</h4>
                        <p className="text-sm text-gray-700">{manualPlace.name}</p>
                        {manualPlace.address && <p className="text-xs text-gray-500">{manualPlace.address}</p>}
                        <p className="text-xs text-blue-600 mt-1">
                          {startTime} - {calculateEndTime(startTime, duration)} ({duration})
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="p-6 border-t border-gray-200 flex-shrink-0">
              <div className="flex space-x-3">
                <button
                  onClick={closeAddModal}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={isManualMode ? addManualPlace : addPlaceFromSearch}
                  disabled={isManualMode ? !manualPlace.name.trim() : !selectedPlace}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  추가
                </button>
          </div>
        </div>
      </div>
    </div>
      )}
    </div>
    </DndContext>
  );
} 