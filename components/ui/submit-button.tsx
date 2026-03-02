'use client';

import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

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
          <Spinner />
          {pendingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
