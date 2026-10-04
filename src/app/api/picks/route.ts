import { NextRequest, NextResponse } from "next/server";
import { db, picks, profiles } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/token-auth";
import { hasRaceStarted } from "@/lib/race-status";

// GET /api/picks?raceId=123 — get the current user's picks for a race
// Admins can pass &userId=<uuid> to view another player's picks
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const raceId = searchParams.get("raceId");

    if (!raceId) {
      return NextResponse.json({ error: "raceId is required" }, { status: 400 });
    }

    // Admins can view another player's picks
    const userIdParam = searchParams.get("userId");
    let targetUserId = currentUser.id;
    if (userIdParam && userIdParam !== currentUser.id) {
      if (!currentUser.is_admin) {
        return NextResponse.json({ error: "Only admins can view other players' picks" }, { status: 403 });
      }
      targetUserId = userIdParam;
    }

    const pick = await db.query.picks.findFirst({
      where: and(
        eq(picks.userId, targetUserId),
        eq(picks.raceId, parseInt(raceId))
      ),
      columns: {
        driver1Id: true,
        driver2Id: true,
        driver3Id: true,
      },
    });

    if (!pick) {
      return NextResponse.json({ picks: null });
    }

    return NextResponse.json({
      picks: {
        driver_1_id: pick.driver1Id,
        driver_2_id: pick.driver2Id,
        driver_3_id: pick.driver3Id,
      },
    });
  } catch (error) {
    console.error("Error loading picks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/picks — save or update picks for a race
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { raceId, driver_1_id, driver_2_id, driver_3_id, userId } = body;

    if (!raceId || !driver_1_id || !driver_2_id || !driver_3_id) {
      return NextResponse.json({ error: "raceId and three driver IDs are required" }, { status: 400 });
    }

    // Admins can make picks on behalf of other players via userId
    const targetUserId: string = userId || currentUser.id;
    if (targetUserId !== currentUser.id && !currentUser.is_admin) {
      return NextResponse.json({ error: "Only admins can make picks for other players" }, { status: 403 });
    }

    // Picks lock at the green flag — admins can override (e.g. fixing picks after race start)
    if (!currentUser.is_admin && (await hasRaceStarted(parseInt(raceId)))) {
      return NextResponse.json({ error: "Picks are locked - the race has started" }, { status: 423 });
    }

    // Check if picks already exist for this user + race
    const existing = await db.query.picks.findFirst({
      where: and(
        eq(picks.userId, targetUserId),
        eq(picks.raceId, parseInt(raceId))
      ),
    });

    if (existing) {
      // Update existing pick
      await db
        .update(picks)
        .set({
          driver1Id: driver_1_id,
          driver2Id: driver_2_id,
          driver3Id: driver_3_id,
        })
        .where(
          and(
            eq(picks.userId, targetUserId),
            eq(picks.raceId, parseInt(raceId))
          )
        );
    } else {
      // Insert new pick
      await db.insert(picks).values({
        userId: targetUserId,
        raceId: parseInt(raceId),
        driver1Id: driver_1_id,
        driver2Id: driver_2_id,
        driver3Id: driver_3_id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving picks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}