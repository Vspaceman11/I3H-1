"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, FileText, Star, LogIn } from "lucide-react";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  const t = useTranslations("profile");

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-bold">{t("title")}</h1>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <User className="h-10 w-10 text-primary" />
          </div>
          <p className="text-muted-foreground">Guest</p>
          <Button>
            <LogIn className="mr-2 h-4 w-4" />
            {t("signIn")}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-4">
            <Star className="h-6 w-6 text-amber-500" />
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-muted-foreground">{t("totalPoints")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-4">
            <FileText className="h-6 w-6 text-primary" />
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-muted-foreground">{t("myReports")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
