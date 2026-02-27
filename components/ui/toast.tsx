'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setItems((prev) => prev.filter((item) => item.id !== id)), 3000);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'min-w-72 rounded-xl border px-4 py-3 text-sm shadow-xl',
              item.type === 'success'
                ? 'border-emerald-800 bg-emerald-950/90 text-emerald-100'
                : 'border-rose-800 bg-rose-950/90 text-rose-100'
            )}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser usado dentro de ToastProvider');
  }
  return context;
}
