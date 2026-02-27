import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Transaction, EntryType } from '@/types/models';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const formatCurrencyBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const formatDateBR = (date: string | Date) =>
  new Intl.DateTimeFormat('pt-BR').format(new Date(date));

export const formatMonthBR = (date: string | Date) =>
  new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(date));

export const typeToLabel = (type: EntryType) => (type === 'income' ? 'Receita' : 'Despesa');

export const calculateMonthlyTotals = (transactions: Transaction[]) => {
  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const expenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return { income, expenses, balance: income - expenses };
};
