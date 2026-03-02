import { Skeleton } from '@/components/ui/skeleton';

export default function LoadingAccounts() {
  return (
    <section className="space-y-4">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </section>
  );
}
