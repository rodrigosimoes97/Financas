'use client';

import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/utils';

import type { ButtonHTMLAttributes } from 'react';

interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  pendingText?: string;
}

export function SubmitButton({ className, children, pendingText = 'Salvando...', ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button disabled={pending} className={cn('disabled:cursor-not-allowed disabled:opacity-70', className)} {...props}>
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {pendingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
