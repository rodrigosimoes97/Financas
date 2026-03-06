'use client';

import { useMemo, useState } from 'react';
import { Category, Goal, GoalContribution } from '@/types/models';
import { EmptyState } from '@/components/ui/empty-state';
import { SavingsGoalCard } from '@/components/goals/savings-goal-card';
import { SpendLimitCard } from '@/components/goals/spend-limit-card';
import { GoalFormModal } from '@/components/goals/goal-form-modal';

interface GoalsTabsProps {
  goals: Goal[];
  categories: Category[];
  contributionsByGoalId: Record<string, GoalContribution[]>;
  selectedMonth: string;
}

export function GoalsTabs({ goals, categories, contributionsByGoalId, selectedMonth }: GoalsTabsProps) {
  const [activeTab, setActiveTab] = useState<'SAVINGS_GOAL' | 'SPEND_LIMIT'>('SAVINGS_GOAL');
  const [openModal, setOpenModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const savingsGoals = useMemo(() => goals.filter((goal) => goal.type === 'SAVINGS_GOAL' && goal.status !== 'ARCHIVED'), [goals]);
  const limits = useMemo(() => goals.filter((goal) => goal.type === 'SPEND_LIMIT' && goal.month?.startsWith(selectedMonth)), [goals, selectedMonth]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-900 p-1">
          <button type="button" onClick={() => setActiveTab('SAVINGS_GOAL')} className={`rounded-lg px-3 py-1.5 text-sm ${activeTab === 'SAVINGS_GOAL' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-300'}`}>Guardar dinheiro</button>
          <button type="button" onClick={() => setActiveTab('SPEND_LIMIT')} className={`rounded-lg px-3 py-1.5 text-sm ${activeTab === 'SPEND_LIMIT' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-300'}`}>Limites por categoria</button>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingGoal(null);
            setOpenModal(true);
          }}
          className="rounded-xl bg-emerald-400 px-3 py-2 text-sm font-medium text-emerald-950"
        >
          Nova meta
        </button>
      </div>

      {activeTab === 'SAVINGS_GOAL' ? (
        savingsGoals.length === 0 ? <EmptyState title="Nenhuma meta de economia" description="Crie sua primeira meta para acompanhar seus aportes." /> : (
          <div className="grid gap-3 lg:grid-cols-2">
            {savingsGoals.map((goal) => (
              <SavingsGoalCard key={goal.id} goal={goal} contributions={contributionsByGoalId[goal.id] ?? []} onEdit={(selected) => { setEditingGoal(selected); setOpenModal(true); }} />
            ))}
          </div>
        )
      ) : (
        limits.length === 0 ? <EmptyState title="Nenhum limite para este mês" description="Adicione limites por categoria para monitorar gastos." /> : (
          <div className="grid gap-3 lg:grid-cols-2">
            {limits.map((goal) => (
              <SpendLimitCard key={goal.id} goal={goal} onEdit={(selected) => { setEditingGoal(selected); setOpenModal(true); }} />
            ))}
          </div>
        )
      )}

      <GoalFormModal
        open={openModal}
        onOpenChange={setOpenModal}
        mode={editingGoal ? 'edit' : 'create'}
        initialType={editingGoal?.type ?? activeTab}
        categories={categories}
        goal={editingGoal}
      />
    </div>
  );
}
