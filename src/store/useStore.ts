import { create } from 'zustand';

export type TransactionType = 'INCOME' | 'EXPENSE';
export type PaymentMethod = 'CASH' | 'CARD';

export interface Transaction {
  id: number;
  amount: number;
  type: TransactionType;
  category: string;
  paymentMethod: PaymentMethod;
  date: string;
  description?: string;
}

export interface QuickAction {
  id: number;
  name: string;
  amount: number;
  category: string;
  paymentMethod: PaymentMethod;
}

interface AppState {
  balance: number;
  transactions: Transaction[];
  initialBalance: number;
  quickActions: QuickAction[];
  
  setInitialData: (initialBalance: number, transactions: Transaction[], quickActions: QuickAction[]) => void;
  addTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: number) => void;
  updateInitialBalance: (newBalance: number) => void;
  setQuickActions: (actions: QuickAction[]) => void;
  addQuickAction: (action: QuickAction) => void;
  deleteQuickAction: (id: number) => void;
}

export const useStore = create<AppState>((set) => ({
  balance: 0,
  transactions: [],
  initialBalance: 0,
  quickActions: [],

  setInitialData: (initialBalance, transactions, quickActions) => {
    const calculatedBalance = transactions.reduce((acc, tx) => {
      return acc + (tx.type === 'INCOME' ? tx.amount : -tx.amount);
    }, initialBalance);

    set({ initialBalance, transactions, balance: calculatedBalance, quickActions });
  },

  addTransaction: (tx) => set((state) => {
    const newBalance = state.balance + (tx.type === 'INCOME' ? tx.amount : -tx.amount);
    return {
      transactions: [tx, ...state.transactions],
      balance: newBalance
    };
  }),

  deleteTransaction: (id) => set((state) => {
    const txToDelete = state.transactions.find((t) => t.id === id);
    if (!txToDelete) return {};
    const newBalance = state.balance - (txToDelete.type === 'INCOME' ? txToDelete.amount : -txToDelete.amount);
    return {
      transactions: state.transactions.filter((t) => t.id !== id),
      balance: newBalance
    };
  }),

  updateInitialBalance: (newBalance) => set((state) => {
    const difference = newBalance - state.initialBalance;
    return {
      initialBalance: newBalance,
      balance: state.balance + difference
    };
  }),

  setQuickActions: (actions) => set({ quickActions: actions }),

  addQuickAction: (action) => set((state) => ({
    quickActions: [...state.quickActions, action]
  })),

  deleteQuickAction: (id) => set((state) => ({
    quickActions: state.quickActions.filter((a) => a.id !== id)
  }))
}));
