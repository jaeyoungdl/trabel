'use client';

import { useState, useEffect } from 'react';
import { ArrowUpDown, Calculator } from 'lucide-react';

interface ExchangeCalculatorProps {
  exchangeRate?: number;
}

export default function ExchangeCalculator({ exchangeRate = 38.5 }: ExchangeCalculatorProps) {
  const [bahtAmount, setBahtAmount] = useState<string>('');
  const [krwAmount, setKrwAmount] = useState<string>('');
  const [isFromBaht, setIsFromBaht] = useState(true);

  useEffect(() => {
    if (isFromBaht && bahtAmount) {
      const converted = parseFloat(bahtAmount) * exchangeRate;
      setKrwAmount(converted.toLocaleString('ko-KR'));
    } else if (!isFromBaht && krwAmount) {
      const converted = parseFloat(krwAmount.replace(/,/g, '')) / exchangeRate;
      setBahtAmount(converted.toFixed(2));
    }
  }, [bahtAmount, krwAmount, exchangeRate, isFromBaht]);

  const handleBahtChange = (value: string) => {
    setBahtAmount(value);
    setIsFromBaht(true);
    if (value === '') {
      setKrwAmount('');
    }
  };

  const handleKrwChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setKrwAmount(numericValue);
    setIsFromBaht(false);
    if (value === '') {
      setBahtAmount('');
    }
  };

  const swapCurrencies = () => {
    const tempBaht = bahtAmount;
    const tempKrw = krwAmount;
    setBahtAmount(tempKrw.replace(/,/g, ''));
    setKrwAmount(tempBaht);
    setIsFromBaht(!isFromBaht);
  };

  const clearAll = () => {
    setBahtAmount('');
    setKrwAmount('');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Calculator className="w-6 h-6 text-blue-500" />
        <h2 className="text-xl font-semibold text-gray-800">환율 계산기</h2>
      </div>

      {/* 현재 환율 표시 */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <div className="text-center">
          <div className="text-sm text-blue-600 mb-1">현재 환율</div>
          <div className="text-2xl font-bold text-blue-700">
            1 THB = {exchangeRate}원
          </div>
        </div>
      </div>

      {/* 계산기 인터페이스 */}
      <div className="space-y-4">
        {/* 바트 입력 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            태국 바트 (THB)
          </label>
          <div className="relative">
            <input
              type="number"
              value={bahtAmount}
              onChange={(e) => handleBahtChange(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            />
            <span className="absolute right-3 top-3 text-gray-500 font-medium">
              ฿
            </span>
          </div>
        </div>

        {/* 변환 버튼 */}
        <div className="flex justify-center">
          <button
            onClick={swapCurrencies}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <ArrowUpDown className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 원화 입력 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            한국 원화 (KRW)
          </label>
          <div className="relative">
            <input
              type="text"
              value={krwAmount}
              onChange={(e) => handleKrwChange(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            />
            <span className="absolute right-3 top-3 text-gray-500 font-medium">
              ₩
            </span>
          </div>
        </div>
      </div>

      {/* 빠른 계산 버튼들 */}
      <div className="mt-6">
        <div className="text-sm font-medium text-gray-700 mb-3">빠른 계산</div>
        <div className="grid grid-cols-3 gap-2">
          {[100, 500, 1000, 5000, 10000, 50000].map((amount) => (
            <button
              key={amount}
              onClick={() => handleBahtChange(amount.toString())}
              className="py-2 px-3 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {amount.toLocaleString()}฿
            </button>
          ))}
        </div>
      </div>

      {/* 초기화 버튼 */}
      <button
        onClick={clearAll}
        className="w-full mt-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
      >
        초기화
      </button>

      {/* 참고 정보 */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        * 환율은 실시간으로 변동될 수 있습니다
      </div>
    </div>
  );
} 