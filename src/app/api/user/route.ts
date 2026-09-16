import { NextResponse } from "next/server";
import { db, picks } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/token-auth";

// GET /api/user — get current user info and all their picks
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ user: null, picks: {} });
    }

    // Get all picks for this user
    const userPicks = await db.query.picks.findMany({
      where: eq(picks.userId, currentUser.id),
      columns: {
        raceId: true,
        driver1Id: true,
        driver2Id: true,
        driver3Id: true,
      },
    });

    const picksMap: Record<number, number[]> = {};
    userPicks.forEach((pick) => {
      picksMap[pick.raceId] = [pick.driver1Id, pick.driver2Id, pick.driver3Id].filter(Boolean) as number[];
    });

    return NextResponse.json({
      user: {
        id: currentUser.id,
        display_name: currentUser.display_name,
        is_admin: currentUser.is_admin,
      },
      picks: picksMap,
    });
  } catch (error) {
    console.error("Error loading user:", error);
    return NextResponse.json({ user: null, picks: {} });
  }
}