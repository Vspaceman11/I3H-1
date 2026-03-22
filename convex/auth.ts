import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { DataModel } from "./_generated/dataModel";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      profile(params, ctx) {
        const name = (params.name as string) || (params.email as string)?.split("@")[0] || "User";
        const email = params.email as string;
        const now = new Date().toISOString();
        return {
          name,
          email,
          total_points: 0,
          role: "citizen" as const,
          created_at: now,
        };
      },
    }),
  ],
});
