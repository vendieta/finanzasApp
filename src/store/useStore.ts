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

interface AppState {
  balance: number;
  transactions: Transaction[];
  initialBalance: number;
  
  setInitialData: (initialBalance: number, transactions: Transaction[]) => void;
  addTransaction: (tx: Transaction) => void;
  updateInitialBalance: (newBalance: number) => void;
}

export const useStore = create<AppState>((set) => ({
  balance: 0,
  transactions: [],
  initialBalance: 0,

  setInitialData: (initialBalance, transactions) => {
    const calculatedBalance = transactions.reduce((acc, tx) => {
      return acc + (tx.type === 'INCOME' ? tx.amount : -tx.amount);
    }, initialBalance);

    set({ initialBalance, transactions, balance: calculatedBalance });
  },

  addTransaction: (tx) => set((state) => {
    const newBalance = state.balance + (tx.type === 'INCOME' ? tx.amount : -tx.amount);
    return {
      transactions: [tx, ...state.transactions],
      balance: newBalance
    };
  }),

  updateInitialBalance: (newBalance) => set((state) => {
    const difference = newBalance - state.initialBalance;
    return {
      initialBalance: newBalance,
      balance: state.balance + difference
    };
  })
}));
