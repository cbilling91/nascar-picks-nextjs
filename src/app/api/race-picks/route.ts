import { NextRequest, NextResponse } from "next/server";
import { db, picks, profiles } from "@/lib/db";
import { eq } from "drizzle-orm";

// GET /api/race-picks?raceId=123 — get all picks for a race with user display names
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const raceId = searchParams.get("raceId");

    if (!raceId) {
      return NextResponse.json({ error: "raceId is required" }, { status: 400 });
    }

    // Join picks with profiles to get display names
    const racePicks = await db
      .select({
        userId: picks.userId,
        raceId: picks.raceId,
        driver1Id: picks.driver1Id,
        driver2Id: picks.driver2Id,
        driver3Id: picks.driver3Id,
        displayName: profiles.displayName,
      })
      .from(picks)
      .innerJoin(profiles, eq(picks.userId, profiles.id))
      .where(eq(picks.raceId, parseInt(raceId)));

    const formattedPicks = racePicks.map((pick) => ({
      user_id: pick.userId,
      race_id: pick.raceId,
      driver_1_id: pick.driver1Id,
      driver_2_id: pick.driver2Id,
      driver_3_id: pick.driver3Id,
      profiles: {
        display_name: pick.displayName ?? "Unknown",
      },
    }));

    return NextResponse.json({ picks: formattedPicks });
  } catch (error) {
    console.error("Error loading race picks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
