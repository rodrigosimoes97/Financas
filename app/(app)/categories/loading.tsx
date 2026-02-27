function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-zinc-800/70 ${className}`} />;
}

export default function LoadingCategories() {
  return (
    <section className="space-y-4">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </section>
  );
}
