'use client';

import { useState } from 'react';
import { Calendar, Clock, MapPin, Plus, Check, Trash2 } from 'lucide-react';

interface ScheduleItem {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  location?: string;
  completed: boolean;
}

const sampleSchedules: ScheduleItem[] = [
  {
    id: '1',
    title: '인천공항 출발',
    description: '체크인 2시간 전 도착',
    date: '2024-03-15',
    time: '09:30',
    location: '인천국제공항 터미널1',
    completed: true
  },
  {
    id: '2',
    title: '방콕 도착',
    description: '수완나품 공항 도착',
    date: '2024-03-15',
    time: '13:45',
    location: '수완나품 공항',
    completed: true
  },
  {
    id: '3',
    title: '호텔 체크인',
    description: '숙소로 이동 후 체크인',
    date: '2024-03-15',
    time: '16:00',
    location: '방콕 시내 호텔',
    completed: false
  },
  {
    id: '4',
    title: '짐톰슨 하우스 방문',
    description: '태국 전통 건축물 관람',
    date: '2024-03-16',
    time: '10:00',
    location: '짐톰슨 하우스',
    completed: false
  },
  {
    id: '5',
    title: '왓 포 사원 관람',
    description: '와불상과 마사지 체험',
    date: '2024-03-16',
    time: '14:00',
    location: '왓 포 사원',
    completed: false
  },
  {
    id: '6',
    title: '차이나타운 투어',
    description: '야시장 및 먹거리 탐방',
    date: '2024-03-16',
    time: '18:00',
    location: '야오와랏 로드',
    completed: false
  }
];

export default function ScheduleManager() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>(sampleSchedules);
  const [selectedDate, setSelectedDate] = useState('2024-03-15');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    title: '',
    description: '',
    time: '',
    location: ''
  });

  // 날짜별로 일정 그룹화
  const schedulesByDate = schedules.reduce((acc, schedule) => {
    const date = schedule.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(schedule);
    return acc;
  }, {} as Record<string, ScheduleItem[]>);

  // 사용 가능한 날짜들 (정렬됨)
  const availableDates = Object.keys(schedulesByDate).sort();

  const toggleComplete = (id: string) => {
    setSchedules(schedules.map(schedule => 
      schedule.id === id ? { ...schedule, completed: !schedule.completed } : schedule
    ));
  };

  const deleteSchedule = (id: string) => {
    setSchedules(schedules.filter(schedule => schedule.id !== id));
  };

  const addSchedule = () => {
    if (newSchedule.title.trim()) {
      const schedule: ScheduleItem = {
        id: Date.now().toString(),
        title: newSchedule.title.trim(),
        description: newSchedule.description.trim() || undefined,
        date: selectedDate,
        time: newSchedule.time || undefined,
        location: newSchedule.location.trim() || undefined,
        completed: false
      };
      setSchedules([...schedules, schedule]);
      setNewSchedule({ title: '', description: '', time: '', location: '' });
      setShowAddForm(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = days[date.getDay()];
    return `${date.getMonth() + 1}월 ${date.getDate()}일 (${dayName})`;
  };

  const currentDateSchedules = schedulesByDate[selectedDate] || [];
  const completedCount = currentDateSchedules.filter(s => s.completed).length;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Calendar className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-semibold text-gray-800">여행 일정</h2>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>일정 추가</span>
        </button>
      </div>

      {/* 날짜 선택 탭 */}
      <div className="mb-6">
        <div className="flex overflow-x-auto space-x-2 pb-2">
          {availableDates.map(date => {
            const daySchedules = schedulesByDate[date];
            const completed = daySchedules.filter(s => s.completed).length;
            const total = daySchedules.length;
            
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`flex-shrink-0 px-4 py-3 rounded-lg border-2 transition-colors ${
                  selectedDate === date
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">{formatDate(date)}</div>
                <div className="text-xs mt-1">
                  {completed}/{total} 완료
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 새 일정 추가 폼 */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-800 mb-3">새 일정 추가</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="일정 제목"
              value={newSchedule.title}
              onChange={(e) => setNewSchedule({...newSchedule, title: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <textarea
              placeholder="설명 (선택사항)"
              value={newSchedule.description}
              onChange={(e) => setNewSchedule({...newSchedule, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="time"
                placeholder="시간"
                value={newSchedule.time}
                onChange={(e) => setNewSchedule({...newSchedule, time: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="장소"
                value={newSchedule.location}
                onChange={(e) => setNewSchedule({...newSchedule, location: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={addSchedule}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                추가
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 선택된 날짜의 일정 목록 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">
            {formatDate(selectedDate)}
          </h3>
          <div className="text-sm text-gray-600">
            {completedCount}/{currentDateSchedules.length} 완료
          </div>
        </div>

        {currentDateSchedules.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            이 날짜에 등록된 일정이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {currentDateSchedules
              .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
              .map(schedule => (
                <div
                  key={schedule.id}
                  className={`p-4 border rounded-lg transition-all ${
                    schedule.completed
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <button
                      onClick={() => toggleComplete(schedule.id)}
                      className={`mt-1 transition-colors ${
                        schedule.completed ? 'text-green-500' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <Check size={20} />
                    </button>

                    <div className="flex-1">
                      <div className={`font-medium ${
                        schedule.completed ? 'line-through text-gray-500' : 'text-gray-900'
                      }`}>
                        {schedule.title}
                      </div>
                      
                      {schedule.description && (
                        <div className="text-sm text-gray-600 mt-1">
                          {schedule.description}
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        {schedule.time && (
                          <div className="flex items-center space-x-1">
                            <Clock size={14} />
                            <span>{schedule.time}</span>
                          </div>
                        )}
                        {schedule.location && (
                          <div className="flex items-center space-x-1">
                            <MapPin size={14} />
                            <span>{schedule.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => deleteSchedule(schedule.id)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
} 