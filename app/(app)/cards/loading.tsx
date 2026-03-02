import { Skeleton } from '@/components/ui/skeleton';

export default function LoadingCards() {
  return (
    <section className="space-y-4">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </section>
  );
}
