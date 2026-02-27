function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-zinc-800/70 ${className}`} />;
}

export default function LoadingDashboard() {
  return (
    <section className="space-y-4">
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    </section>
  );
}
