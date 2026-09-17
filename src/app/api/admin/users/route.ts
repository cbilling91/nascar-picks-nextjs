import { NextRequest, NextResponse } from "next/server";
import { db, profiles } from "@/lib/db";
import { eq } from "drizzle-orm";
import { desc } from "drizzle-orm";
import { getCurrentUser, generateAuthToken, hashToken } from "@/lib/token-auth";

// GET /api/admin/users — list all users (admin only)
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await db.query.profiles.findMany({
      columns: {
        id: true,
        displayName: true,
        phoneNumber: true,
        textNotifications: true,
        isAdmin: true,
        authToken: true,
        createdAt: true,
      },
      orderBy: desc(profiles.createdAt),
    });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        display_name: u.displayName,
        phone_number: u.phoneNumber,
        text_notifications: u.textNotifications,
        is_admin: u.isAdmin,
        auth_token: u.authToken,
        created_at: u.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error loading users:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/users — create a new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { display_name, phone_number, text_notifications, is_admin } = body;

    if (!display_name?.trim()) {
      return NextResponse.json({ error: "Display name is required" }, { status: 400 });
    }

    const rawToken = generateAuthToken();
    const tokenHash = hashToken(rawToken);

    const [newUser] = await db
      .insert(profiles)
      .values({
        displayName: display_name.trim(),
        phoneNumber: phone_number || null,
        textNotifications: text_notifications ?? false,
        isAdmin: is_admin ?? false,
        authToken: tokenHash,
      })
      .returning();

    return NextResponse.json({
      user: {
        id: newUser.id,
        display_name: newUser.displayName,
        phone_number: newUser.phoneNumber,
        text_notifications: newUser.textNotifications,
        is_admin: newUser.isAdmin,
        auth_token: rawToken, // return raw token so admin can share it
        created_at: newUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/admin/users — update a user (admin only)
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, display_name, phone_number, text_notifications, is_admin } = body;

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (display_name !== undefined) updateData.displayName = display_name.trim();
    if (phone_number !== undefined) updateData.phoneNumber = phone_number || null;
    if (text_notifications !== undefined) updateData.textNotifications = text_notifications;
    if (is_admin !== undefined) updateData.isAdmin = is_admin;

    await db.update(profiles).set(updateData).where(eq(profiles.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/users — delete a user (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    await db.delete(profiles).where(eq(profiles.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}