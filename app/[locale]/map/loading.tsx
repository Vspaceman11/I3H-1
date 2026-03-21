import { Skeleton } from "@/components/ui/skeleton";

export default function MapLoading() {
  return (
    <div className="flex flex-col gap-3 p-4">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-[400px] w-full rounded-lg" />
    </div>
  );
}
