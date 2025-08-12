'use client';

import { useState } from 'react';
import { CheckSquare, Square, Plus, Trash2, Package } from 'lucide-react';

interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  category: string;
}

const defaultCategories = ['의류', '전자제품', '약품/화장품', '여행용품', '서류', '기타'];

const sampleItems: ChecklistItem[] = [
  { id: '1', title: '여권', completed: true, category: '서류' },
  { id: '2', title: '항공권', completed: true, category: '서류' },
  { id: '3', title: '여행자보험', completed: false, category: '서류' },
  { id: '4', title: '충전기', completed: true, category: '전자제품' },
  { id: '5', title: '어댑터', completed: false, category: '전자제품' },
  { id: '6', title: '반팔 티셔츠 5장', completed: false, category: '의류' },
  { id: '7', title: '반바지 3장', completed: false, category: '의류' },
  { id: '8', title: '선크림', completed: false, category: '약품/화장품' },
  { id: '9', title: '모기퇴치제', completed: true, category: '약품/화장품' },
  { id: '10', title: '캐리어', completed: true, category: '여행용품' },
];

export default function ChecklistManager() {
  const [items, setItems] = useState<ChecklistItem[]>(sampleItems);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('기타');
  const [filterCategory, setFilterCategory] = useState('전체');

  const addItem = () => {
    if (newItemTitle.trim()) {
      const newItem: ChecklistItem = {
        id: Date.now().toString(),
        title: newItemTitle.trim(),
        completed: false,
        category: selectedCategory,
      };
      setItems([...items, newItem]);
      setNewItemTitle('');
    }
  };

  const toggleItem = (id: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const filteredItems = filterCategory === '전체' 
    ? items 
    : items.filter(item => item.category === filterCategory);

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Package className="w-6 h-6 text-green-500" />
        <h2 className="text-xl font-semibold text-gray-800">준비물 체크리스트</h2>
      </div>

      {/* 진행률 표시 */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>진행률</span>
          <span>{completedCount}/{totalCount} 완료</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-green-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <div className="text-center text-sm text-gray-600 mt-1">
          {progressPercentage.toFixed(0)}% 완료
        </div>
      </div>

      {/* 새 항목 추가 */}
      <div className="mb-6 space-y-3">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            placeholder="새 준비물 추가..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && addItem()}
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            {defaultCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <button
            onClick={addItem}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 카테고리 필터 */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterCategory('전체')}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filterCategory === '전체' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            전체 ({items.length})
          </button>
          {defaultCategories.map(category => {
            const count = items.filter(item => item.category === category).length;
            if (count === 0) return null;
            
            return (
              <button
                key={category}
                onClick={() => setFilterCategory(category)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  filterCategory === category 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {category} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* 체크리스트 항목들 */}
      <div className="space-y-2">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {filterCategory === '전체' ? '준비물이 없습니다.' : `${filterCategory} 카테고리에 항목이 없습니다.`}
          </div>
        ) : (
          filteredItems.map(item => (
            <div
              key={item.id}
              className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                item.completed 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <button
                onClick={() => toggleItem(item.id)}
                className={`transition-colors ${
                  item.completed ? 'text-green-500' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {item.completed ? <CheckSquare size={20} /> : <Square size={20} />}
              </button>
              
              <div className="flex-1">
                <div className={`${item.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                  {item.title}
                </div>
                <div className="text-xs text-gray-500">{item.category}</div>
              </div>

              <button
                onClick={() => deleteItem(item.id)}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* 요약 정보 */}
      {totalCount > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600">완료된 항목</div>
              <div className="font-semibold text-green-600">{completedCount}개</div>
            </div>
            <div>
              <div className="text-gray-600">남은 항목</div>
              <div className="font-semibold text-orange-600">{totalCount - completedCount}개</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 