import { Skeleton } from "@/components/ui/skeleton";

export default function ReportLoading() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-[250px] w-full rounded-lg" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}
