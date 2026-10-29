export function AppSkeleton() {
  return (
    <div className="container-app page-pad animate-pulse">
      <div className="h-8 w-52 rounded-full bg-surface-2/70" />
      <div className="mt-3 h-4 w-72 max-w-full rounded-full bg-surface-2/50" />
      <div className="mt-7 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="h-[300px] rounded-[20px] border border-line bg-surface-2/40" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-[140px] rounded-[20px] bg-surface-2/40" />
          <div className="h-[140px] rounded-[20px] bg-surface-2/40" />
          <div className="h-[140px] rounded-[20px] bg-surface-2/40" />
          <div className="h-[140px] rounded-[20px] bg-surface-2/40" />
        </div>
      </div>
    </div>
  );
}
