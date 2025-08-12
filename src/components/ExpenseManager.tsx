'use client';

import { useState } from 'react';
import { useExpenses } from '../../hooks/useExpenses';
import { usePlaces } from '../../hooks/usePlaces';

interface ExpenseManagerProps {
  tripData: {
    title: string;
    dates: {
      start: string;
      end: string;
    };
    totalDays: number;
  };
  tripId: string;
  onBack: () => void;
  sidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean) => void;
  onPageChange?: (page: 'schedule' | 'expense') => void;
}

export default function ExpenseManager({ tripData, tripId, onBack, sidebarOpen, setSidebarOpen }: ExpenseManagerProps) {
  const { expenses, loading, addExpense, updateExpense, deleteExpense, getTotalSpent, getCategoryTotals, getDailyExpenses } = useExpenses(tripId);
  const { places } = usePlaces(tripId);
  
  const [showPlaceExpenseModal, setShowPlaceExpenseModal] = useState(false);
  const [showMiscExpenseModal, setShowMiscExpenseModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [budget] = useState(3000000);
  
  // 환율 설정 (1 바트 = 43원)
  const EXCHANGE_RATE = 43;
  
  // 일정별 비용 추가 폼 상태 (금액만)
  const [placeExpenseAmount, setPlaceExpenseAmount] = useState('');
  const [placeExpenseCurrency, setPlaceExpenseCurrency] = useState('KRW');
  
  // 기타 비용 추가 폼 상태 (전체 정보)
  const [miscExpense, setMiscExpense] = useState({
    amount: '',
    description: '',
    category: 'flight' as string,
    date: new Date().toISOString().split('T')[0],
    currency: 'KRW'
  });
  const [miscExpenseCurrency, setMiscExpenseCurrency] = useState('KRW');

  const totalSpent = getTotalSpent();
  const remaining = budget - totalSpent;
  const categoryTotals = getCategoryTotals();
  const dailyExpenses = getDailyExpenses();

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'flight': return '✈️';
      case 'accommodation': return '🏨';
      case 'food': return '🍽️';
      case 'transport': return '🚗';
      case 'shopping': return '🛍️';
      case 'activity': return '🎯';
      case 'entrance': return '🎫';
      case 'restaurant': return '🍽️';
      case 'tourist_attraction': return '🏛️';
      case 'hotel': return '🏨';
      case 'attraction': return '🎢';
      default: return '💰';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'flight': return '항공료';
      case 'accommodation': return '숙박';
      case 'food': return '식비';
      case 'transport': return '교통';
      case 'shopping': return '쇼핑';
      case 'activity': return '액티비티';
      case 'entrance': return '입장료';
      case 'restaurant': return '맛집';
      case 'tourist_attraction': return '명소';
      case 'hotel': return '숙소';
      case 'attraction': return '기타';
      default: return '기타';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  // 일정별 비용 추가/수정 (금액만 입력)
  const handleAddPlaceExpense = async () => {
    if (!placeExpenseAmount || !selectedPlace) return;

    const place = places.find(p => p.id === selectedPlace);
    if (!place) return;

    try {
      // 바트를 원으로 환산
      const amountInKRW = placeExpenseCurrency === 'THB' 
        ? parseFloat(placeExpenseAmount) * EXCHANGE_RATE 
        : parseFloat(placeExpenseAmount);

      // 기존 비용이 있는지 확인
      const existingExpenses = expenses.filter(expense => expense.placeId === selectedPlace);
      
      if (existingExpenses.length > 0) {
        // 기존 비용이 있으면 첫 번째 항목을 수정
        await updateExpense(existingExpenses[0].id, {
          amount: amountInKRW
        });
      } else {
        // 새로 추가
        const tripStartDate = new Date(tripData.dates.start.replace(/\./g, '-'));
        const targetDate = new Date(tripStartDate);
        targetDate.setDate(targetDate.getDate() + (selectedDay! - 1));
        const targetDateStr = targetDate.toISOString().split('T')[0];

        await addExpense({
          amount: amountInKRW,
          description: place.name, // 장소명을 설명으로 사용
          category: place.category === 'restaurant' ? 'food' : 
                   place.category === 'tourist_attraction' ? 'entrance' :
                   place.category === 'hotel' ? 'accommodation' :
                   place.category === 'flight' ? 'flight' :
                   place.category === 'transport' ? 'transport' : 'activity',
          date: targetDateStr, // 여행 일정의 해당 날짜
          currency: 'KRW',
          placeId: selectedPlace,
          tripId
        });
      }

      // 폼 초기화
      setPlaceExpenseAmount('');
      setPlaceExpenseCurrency('KRW');
      setSelectedPlace(null);
      setSelectedDay(null);
      setShowPlaceExpenseModal(false);
    } catch (error) {
      console.error('일정 비용 처리 실패:', error);
    }
  };

  // 기타 비용 추가 (전체 정보 입력)
  const handleAddMiscExpense = async () => {
    if (!miscExpense.amount || !miscExpense.description) return;

    try {
      // 바트를 원으로 환산
      const amountInKRW = miscExpenseCurrency === 'THB' 
        ? parseFloat(miscExpense.amount) * EXCHANGE_RATE 
        : parseFloat(miscExpense.amount);

      await addExpense({
        amount: amountInKRW,
        description: miscExpense.description,
        category: miscExpense.category,
        date: miscExpense.date,
        currency: 'KRW',
        tripId
      });

      // 폼 초기화
      setMiscExpense({
        amount: '',
        description: '',
        category: 'transport',
        date: new Date().toISOString().split('T')[0],
        currency: 'KRW'
      });
      setMiscExpenseCurrency('KRW');
      setShowMiscExpenseModal(false);
    } catch (error) {
      console.error('기타 비용 추가 실패:', error);
    }
  };

  const openPlaceExpenseModal = (placeId: string, day: number) => {
    setSelectedPlace(placeId);
    setSelectedDay(day);
    
    // 기존 비용이 있으면 해당 값으로 초기화
    const placeExpenses = expenses.filter(expense => expense.placeId === placeId);
    const total = placeExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    setPlaceExpenseAmount(total > 0 ? total.toString() : '');
    
    setShowPlaceExpenseModal(true);
  };

  const openMiscExpenseModal = () => {
    // 오늘 날짜를 초기값으로 설정하고 카테고리를 항공료로 초기화
    const today = new Date().toISOString().split('T')[0];
    
    setMiscExpense({
      amount: '',
      description: '',
      category: 'flight',
      date: today,
      currency: 'KRW'
    });
    
    setShowMiscExpenseModal(true);
  };

  const getPlacesByDay = (day: number) => {
    return places.filter(place => place.day === day);
  };

  const getDayTotal = (day: number) => {
    const dayExpenses = dailyExpenses[day] || [];
    return dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  };

  // 해당 날짜의 기타 비용 가져오기
  const getMiscExpensesByDay = (day: number) => {
    const tripStartDate = new Date(tripData.dates.start.replace(/\./g, '-'));
    const targetDate = new Date(tripStartDate);
    targetDate.setDate(targetDate.getDate() + (day - 1));
    const targetDateStr = targetDate.toISOString().split('T')[0];
    
    return expenses.filter(expense => 
      !expense.placeId && 
      expense.date === targetDateStr
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">비용 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex relative">
      {/* 모바일 헤더 */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 p-4 z-50">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen && setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">💰 비용 관리</h1>
          <button
            onClick={() => {
              onBack();
              setSidebarOpen && setSidebarOpen(false);
            }}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* 모바일 전체화면 사이드바 */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-white z-50 flex flex-col h-screen">
          {/* 모바일 전체화면 헤더 */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold text-gray-900">💰 비용 관리</h1>
              <button
                onClick={() => setSidebarOpen && setSidebarOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* 모바일 전체화면 내용 */}
          <div className="flex-1 overflow-y-scroll" style={{ height: 'calc(100vh - 80px)' }}>
            <div className="p-6 space-y-6">
              {/* 태국 환율 정보 */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">🇹🇭 태국 환율</h3>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">1 바트 = {EXCHANGE_RATE}원</span>
                </div>
              </div>

              {/* 예산 현황 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 예산 현황</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">총 예산</span>
                    <span className="font-bold text-gray-900">{formatCurrency(budget)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">사용</span>
                    <span className="font-bold text-red-600">{formatCurrency(totalSpent)} ({((totalSpent / budget) * 100).toFixed(1)}%)</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-3">
                    <span className="text-gray-600">남은 예산</span>
                    <span className={`font-bold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(remaining)}
                    </span>
                  </div>
                  
                  {/* 예산 진행률 바 */}
                  <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${
                        totalSpent > budget ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min((totalSpent / budget) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* 카테고리별 지출 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 카테고리별 지출</h3>
                <div className="space-y-3">
                  {Object.entries(categoryTotals).map(([category, total]) => {
                    const percentage = totalSpent > 0 ? (total / totalSpent) * 100 : 0;

                    return (
                      <div key={category} className="bg-white rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{getCategoryIcon(category)}</span>
                            <span className="font-medium text-gray-900">{getCategoryName(category)}</span>
                          </div>
                          <span className="font-semibold text-gray-900">{formatCurrency(total)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 기타 지출 추가 버튼 */}
              <button
                onClick={() => {
                  setShowMiscExpenseModal(true);
                  setSidebarOpen && setSidebarOpen(false);
                }}
                className="w-full py-4 bg-gradient-to-r from-stone-500 to-stone-600 text-white rounded-xl font-semibold hover:from-stone-600 hover:to-stone-700 transition-all duration-300 shadow-lg"
              >
                기타 지출 추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 데스크탑 사이드바 */}
      <div className={`w-80 bg-white/90 backdrop-blur-lg border-r border-gray-200 flex-col shadow-xl lg:flex ${
        sidebarOpen ? 'hidden' : 'hidden lg:flex'
      }`}>
        {/* 헤더 */}
        <div className="p-6 border-b border-gray-100">
          <button
            onClick={() => {
              onBack();
              setSidebarOpen && setSidebarOpen(false);
            }}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">일정으로 돌아가기</span>
          </button>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">💰 비용 관리</h1>
          <div className="text-sm text-gray-500 mb-4">
            {tripData.dates.start} - {tripData.dates.end}
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>{tripData.totalDays}일 여행</span>
          </div>
        </div>

        {/* 태국 환율 정보 */}
        <div className="p-2 border-b border-gray-100">
          <div className="bg-blue-50 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">🇹🇭 태국 환율</h3>
            <div className="text-sm text-gray-700">
              <span className="font-medium">1 바트 = {EXCHANGE_RATE}원</span>
            </div>
          </div>
        </div>

        {/* 예산 요약 */}
        <div className="p-6 border-b border-gray-100">
          <div className="bg-gradient-to-r from-slate-500 to-slate-600 rounded-xl p-4 text-white">
            <div className="text-sm opacity-90 mb-1">총 예산</div>
            <div className="text-2xl font-bold">{formatCurrency(budget)}</div>
            <div className="text-sm opacity-90 mt-2">
              사용: {formatCurrency(totalSpent)} ({Math.round((totalSpent / budget) * 100)}%)
            </div>
            <div className="text-sm opacity-90">
              남은 예산: {formatCurrency(remaining)}
            </div>

            {/* 진행률 바 */}
            <div className="w-full bg-white/20 rounded-full h-2 mt-3">
              <div
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((totalSpent / budget) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* 카테고리별 요약 */}
        <div className="flex-1 overflow-auto p-6">
          <h3 className="font-semibold text-gray-900 mb-4">카테고리별 지출</h3>
          <div className="space-y-3">
            {['flight', 'accommodation', 'food', 'transport', 'shopping', 'activity', 'entrance'].map(category => {
              const total = categoryTotals[category] || 0;
              const percentage = budget > 0 ? (total / budget) * 100 : 0;

              return (
                <div key={category} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getCategoryIcon(category)}</span>
                      <span className="font-medium text-gray-900">{getCategoryName(category)}</span>
                    </div>
                    <span className="font-semibold text-gray-900">{formatCurrency(total)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 하단 액션 */}
        <div className="p-6 border-t border-gray-100">
          <button
            onClick={() => setShowMiscExpenseModal(true)}
            className="w-full py-3 bg-gradient-to-r from-stone-500 to-stone-600 text-white rounded-xl font-semibold hover:from-stone-600 hover:to-stone-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
          >
            기타 지출 추가
          </button>
        </div>
      </div>

      {/* 메인 컨텐츠 - 일자별 비용 관리 */}
      <div className="flex-1 overflow-auto pt-20 lg:pt-0">
        <div className="p-4 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">일자별 비용 관리</h2>
            <h4 className="text-xs text-gray-900 mb-2">모든 비용은 2인 기준으로 계산!!</h4>

            {/* 일자별 비용 카드들 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {Array.from({ length: tripData.totalDays }, (_, i) => i + 1).map(day => {
                const dayPlaces = getPlacesByDay(day);
                const dayTotal = getDayTotal(day);
                const dayExpenseList = dailyExpenses[day] || [];

                return (
                  <div key={day} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* 일자 헤더 */}
                    <div className="bg-gradient-to-r from-slate-500 to-slate-600 p-4 text-white">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold">{day}일차</h3>
                        <div className="text-right">
                          <div className="text-lg font-bold">{formatCurrency(dayTotal)}</div>
                          <div className="text-sm opacity-90">{dayExpenseList.length}개 항목</div>
                        </div>
                      </div>
                    </div>

                    {/* 일정별 비용 리스트 */}
                    <div className="p-4">
                      {dayPlaces.length > 0 ? (
                        <div className="space-y-3">
                          {dayPlaces.map(place => {
                            const placeExpenses = expenses.filter(expense => expense.placeId === place.id);
                            const placeTotal = placeExpenses.reduce((sum, expense) => sum + expense.amount, 0);

                                                         return (
                               <div key={place.id} className="border border-gray-200 rounded-lg p-3">
                                 <div className="flex items-center justify-between">
                                   <div className="flex-1">
                                     <div className="flex items-center space-x-2 mb-1">
                                       <span>{getCategoryIcon(place.category)}</span>
                                       <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                         {getCategoryName(place.category)}
                                       </span>
                                     </div>
                                     <h4 className="font-medium text-gray-900">{place.name}</h4>
                                     <p className="text-sm text-gray-500">{place.time}</p>
                                   </div>
                                   <div className="text-right">
                                     <div className="font-semibold text-gray-900 mb-1">{formatCurrency(placeTotal)}</div>
                                     <button
                                       onClick={() => openPlaceExpenseModal(place.id, day)}
                                       className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                                     >
                                       {placeTotal > 0 ? '수정' : '추가'}
                                     </button>
                                   </div>
                                 </div>
                               </div>
                             );
                          })}


                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="text-gray-400 mb-3">
                            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <p className="text-gray-500 mb-4">아직 일정이 없습니다</p>
                          <p className="text-gray-500">이 일차에는 일정이 없습니다.</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 기타 비용 섹션 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-stone-500 to-stone-600 p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold flex items-center space-x-2">
                      <span>💳</span>
                      <span>기타 비용</span>
                    </h3>
                    <p className="text-sm opacity-90">교통비, 개인 지출, 쇼핑 등</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {formatCurrency(
                        expenses
                          .filter(expense => !expense.placeId)
                          .reduce((sum, expense) => sum + expense.amount, 0)
                      )}
                    </div>
                    <div className="text-sm opacity-90">
                      {expenses.filter(expense => !expense.placeId).length}개 항목
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* 기타 비용 목록 */}
                {expenses.filter(expense => !expense.placeId).length > 0 ? (
                  <div className="space-y-3 mb-6">
                    {expenses
                      .filter(expense => !expense.placeId)
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map(expense => {
                        // 날짜를 일차로 변환
                        const tripStartDate = new Date(tripData.dates.start.replace(/\./g, '-'));
                        const expenseDate = new Date(expense.date);
                        const dayDiff = Math.ceil((expenseDate.getTime() - tripStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                        
                                                 return (
                           <div key={expense.id} className="p-4 bg-gray-50 rounded-lg">
                             {/* 첫 번째 줄: 아이콘, 제목, 금액 */}
                             <div className="flex items-center justify-between mb-2">
                               <div className="flex items-center space-x-3">
                                 <span className="text-2xl">{getCategoryIcon(expense.category)}</span>
                                 <h4 className="font-medium text-gray-900">{expense.description}</h4>
                               </div>
                               <div className="flex items-center space-x-2">
                                 <div className="text-lg font-semibold text-gray-900">
                                   {formatCurrency(expense.amount)}
                                 </div>
                                 <button
                                   onClick={() => deleteExpense(expense.id)}
                                   className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                 >
                                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                   </svg>
                                 </button>
                               </div>
                             </div>
                             
                             {/* 두 번째 줄: 카테고리, 일차, 날짜 */}
                             <div className="flex items-center space-x-2 text-sm text-gray-500 ml-11">
                               <span>{getCategoryName(expense.category)}</span>
                               <span>•</span>
                               <span>{dayDiff}일차</span>
                               <span>•</span>
                               <span>{new Date(expense.date).toLocaleDateString('ko-KR')}</span>
                             </div>
                           </div>
                         );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-3">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">기타 비용이 없습니다</h3>
                    <p className="text-gray-500 mb-4">교통비, 개인 지출 등을 추가해보세요</p>
                  </div>
                )}

                {/* 기타 비용 추가 버튼 */}
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowMiscExpenseModal(true)}
                    className="flex items-center space-x-2 px-6 py-3 bg-stone-500 text-white rounded-lg font-medium hover:bg-stone-600 transition-colors shadow-md hover:shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>기타 비용 추가</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 일정별 비용 추가 모달 (간단) */}
      {showPlaceExpenseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {(() => {
                    const placeExpenses = expenses.filter(expense => expense.placeId === selectedPlace);
                    return placeExpenses.length > 0 ? '비용 수정' : '비용 추가';
                  })()}
                </h2>
                <button
                  onClick={() => setShowPlaceExpenseModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {selectedPlace && (
                <p className="text-sm text-gray-600 mt-2">
                  📍 {places.find(p => p.id === selectedPlace)?.name}
                </p>
              )}
            </div>

            <div className="p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">금액 *</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={placeExpenseAmount}
                    onChange={(e) => setPlaceExpenseAmount(e.target.value)}
                    placeholder="사용한 금액을 입력하세요"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                    autoFocus
                  />
                  <select
                    value={placeExpenseCurrency}
                    onChange={(e) => setPlaceExpenseCurrency(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  >
                    <option value="KRW">원</option>
                    <option value="THB">바트</option>
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  장소명과 카테고리는 일정 정보를 사용합니다
                  {placeExpenseCurrency === 'THB' && (
                    <span className="block mt-1 text-blue-600">
                      바트로 입력 시 {EXCHANGE_RATE}원으로 환산되어 저장됩니다
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowPlaceExpenseModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleAddPlaceExpense}
                  disabled={!placeExpenseAmount}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {(() => {
                    const placeExpenses = expenses.filter(expense => expense.placeId === selectedPlace);
                    return placeExpenses.length > 0 ? '수정' : '추가';
                  })()}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 기타 비용 추가 모달 (상세) */}
      {showMiscExpenseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">기타 지출 추가</h2>
                <button
                  onClick={() => setShowMiscExpenseModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                📅 기타 지출 추가
              </p>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">지출 내용 *</label>
                  <input
                    type="text"
                    value={miscExpense.description}
                    onChange={(e) => setMiscExpense({...miscExpense, description: e.target.value})}
                    placeholder="예: 택시 요금, 편의점, 개인 쇼핑"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">금액 *</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={miscExpense.amount}
                      onChange={(e) => setMiscExpense({...miscExpense, amount: e.target.value})}
                      placeholder="0"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                    />
                    <select
                      value={miscExpenseCurrency}
                      onChange={(e) => setMiscExpenseCurrency(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    >
                      <option value="KRW">원</option>
                      <option value="THB">바트</option>
                    </select>
                  </div>
                  {miscExpenseCurrency === 'THB' && (
                    <p className="text-xs text-blue-600 mt-1">
                      바트로 입력 시 {EXCHANGE_RATE}원으로 환산되어 저장됩니다
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
                  <select
                    value={miscExpense.category}
                    onChange={(e) => setMiscExpense({...miscExpense, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="flight">✈️ 항공료</option>
                    <option value="transport">🚗 교통비</option>
                    <option value="food">🍽️ 식비</option>
                    <option value="shopping">🛍️ 쇼핑</option>
                    <option value="activity">🎯 기타 활동</option>
                    <option value="entrance">🎫 입장료</option>
                    <option value="accommodation">🏨 숙박</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">날짜</label>
                  <input
                    type="date"
                    value={miscExpense.date}
                    onChange={(e) => setMiscExpense({...miscExpense, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    여행 기간: {tripData.dates.start} ~ {tripData.dates.end}
                  </p>
                </div>
                

              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex-shrink-0">
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowMiscExpenseModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleAddMiscExpense}
                  disabled={!miscExpense.amount || !miscExpense.description}
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
  );
} 