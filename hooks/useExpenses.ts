import { useState, useEffect } from 'react'

export interface Expense {
  id: string
  amount: number
  description: string
  category: string
  date: string
  currency: string
  placeId?: string
  tripId: string
  place_name?: string
  place_day?: number
  createdAt: Date
  updatedAt: Date
}

export function useExpenses(tripId: string) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchExpenses = async () => {
    if (!tripId || tripId === 'loading') return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/expenses?tripId=${tripId}`)
      if (!response.ok) throw new Error('Failed to fetch expenses')
      
      const data = await response.json()
      // amount를 명시적으로 숫자로 변환
      const processedData = data.map((expense: any) => ({
        ...expense,
        amount: parseFloat(expense.amount) || 0
      }))
      setExpenses(processedData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const addExpense = async (expenseData: {
    amount: number
    description: string
    category: string
    date: string
    currency?: string
    placeId?: string
    tripId: string
  }) => {
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData)
      })

      if (!response.ok) throw new Error('Failed to add expense')

      const newExpense = await response.json()
      // amount를 명시적으로 숫자로 변환
      const processedExpense = {
        ...newExpense,
        amount: parseFloat(newExpense.amount) || 0
      }
      setExpenses(prev => [...prev, processedExpense])
      return newExpense
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!response.ok) throw new Error('Failed to update expense')

      const updatedExpense = await response.json()
      // amount를 명시적으로 숫자로 변환
      const processedExpense = {
        ...updatedExpense,
        amount: parseFloat(updatedExpense.amount) || 0
      }
      setExpenses(prev => prev.map(expense => 
        expense.id === id ? { ...expense, ...processedExpense } : expense
      ))
      return updatedExpense
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  const deleteExpense = async (id: string) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete expense')

      setExpenses(prev => prev.filter(expense => expense.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // 통계 계산 함수들
  const getTotalSpent = () => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0)
  }

  const getCategoryTotals = () => {
    const categoryTotals: { [key: string]: number } = {}
    expenses.forEach(expense => {
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount
    })
    return categoryTotals
  }

  const getDailyExpenses = () => {
    const dailyExpenses: { [key: number]: Expense[] } = {}
    expenses.forEach(expense => {
      if (expense.place_day) {
        if (!dailyExpenses[expense.place_day]) {
          dailyExpenses[expense.place_day] = []
        }
        dailyExpenses[expense.place_day].push(expense)
      }
    })
    return dailyExpenses
  }

  const getExpensesByPlace = (placeId: string) => {
    return expenses.filter(expense => expense.placeId === placeId)
  }

  useEffect(() => {
    fetchExpenses()
  }, [tripId])

  return {
    expenses,
    loading,
    error,
    addExpense,
    updateExpense,
    deleteExpense,
    refetch: fetchExpenses,
    // 통계 함수들
    getTotalSpent,
    getCategoryTotals,
    getDailyExpenses,
    getExpensesByPlace
  }
} 