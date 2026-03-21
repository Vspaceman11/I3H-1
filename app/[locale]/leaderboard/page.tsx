"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

export const dynamic = "force-dynamic";

type LeaderboardUser = {
  _id: Id<"users">;
  _creationTime: number;
  clerkId: string;
  name: string;
  points: number;
  reportsCount: number;
};

export default function LeaderboardPage() {
  const t = useTranslations("leaderboard");
  const users = useQuery(api.users.leaderboard) as
    | LeaderboardUser[]
    | undefined;

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-bold">{t("title")}</h1>

      {users && users.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {users?.map((user: LeaderboardUser, index: number) => (
          <Card key={user._id}>
            <CardContent className="flex items-center gap-3 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {index < 3 ? (
                  <Trophy
                    className={`h-4 w-4 ${
                      index === 0
                        ? "text-amber-500"
                        : index === 1
                          ? "text-zinc-400"
                          : "text-amber-700"
                    }`}
                  />
                ) : (
                  index + 1
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">
                  {user.reportsCount} {t("reports")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-primary">
                  {user.points}
                </p>
                <p className="text-xs text-muted-foreground">{t("points")}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
