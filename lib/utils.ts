import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Transaction, EntryType } from '@/types/models';

const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const formatCurrencyBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const dateFromYMD = (ymd: string) => {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
};

const normalizeDateInput = (value: string | Date) => {
  if (value instanceof Date) return value;
  if (YMD_REGEX.test(value)) return dateFromYMD(value);
  return new Date(value);
};

export const formatDateBR = (date: string | Date) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(normalizeDateInput(date));

export const formatMonthBR = (date: string | Date) => {
  const parsedDate = normalizeDateInput(date);

  const month = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    timeZone: 'America/Sao_Paulo'
  }).format(parsedDate);

  const year = new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric',
    timeZone: 'America/Sao_Paulo'
  }).format(parsedDate);

  const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);

  return `${capitalizedMonth}/${year}`;
};

export const getMonthStartISO = (date: Date) =>
  new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1)).toISOString().slice(0, 10);

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
