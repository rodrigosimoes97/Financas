export type GoalStatus = 'ok' | 'attention' | 'exceeded';
export function getGoalProgress(currentAmount: number, targetAmount: number): number { if (targetAmount <= 0) return 0; return Math.max(0, (currentAmount / targetAmount) * 100); }
export function getSpendLimitStatus(currentAmount: number, targetAmount: number): GoalStatus { const progress = getGoalProgress(currentAmount, targetAmount); if (progress >= 100) return 'exceeded'; if (progress >= 85) return 'attention'; return 'ok'; }
