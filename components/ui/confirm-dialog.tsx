'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { ptBR } from '@/lib/i18n/pt-BR';

interface ConfirmDialogProps {
  triggerLabel: string;
  onConfirm: () => Promise<void>;
  triggerClassName?: string;
}

export function ConfirmDialog({ triggerLabel, onConfirm, triggerClassName }: ConfirmDialogProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button type="button" className={triggerClassName}>{triggerLabel}</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
          <Dialog.Title className="text-lg font-semibold">{ptBR.dialog.confirmDeleteTitle}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-zinc-400">{ptBR.dialog.confirmDeleteDescription}</Dialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800">{ptBR.actions.cancel}</Dialog.Close>
            <Dialog.Close asChild>
              <button
                type="button"
                onClick={onConfirm}
                className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500"
              >
                {ptBR.actions.delete}
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
