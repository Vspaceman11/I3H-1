import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Skeleton className="h-7 w-24" />
      <div className="flex flex-col items-center gap-4 py-8">
        <Skeleton className="h-20 w-20 rounded-full" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    </div>
  );
}
