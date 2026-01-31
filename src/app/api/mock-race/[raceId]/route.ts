import { NextRequest, NextResponse } from 'next/server';
import { raceStateManager } from '@/lib/mock/raceStateManager';

// GET /api/mock-race/[raceId] - Get race state
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ raceId: string }> }
) {
  const { raceId } = await params;

  let state = raceStateManager.getRaceState(raceId);

  // Auto-create race if it doesn't exist
  if (!state) {
    state = raceStateManager.createRace(raceId);
  }

  return NextResponse.json(state);
}

// POST /api/mock-race/[raceId] - Update race state
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ raceId: string }> }
) {
  const { raceId } = await params;
  const body = await request.json();
  const { action, lapNumber } = body;

  let state;

  switch (action) {
    case 'start':
      state = raceStateManager.startRace(raceId);
      break;

    case 'pause':
      state = raceStateManager.pauseRace(raceId);
      break;

    case 'resume':
      state = raceStateManager.resumeRace(raceId);
      break;

    case 'update':
      if (typeof lapNumber !== 'number') {
        return NextResponse.json(
          { error: 'lapNumber is required for update action' },
          { status: 400 }
        );
      }
      state = raceStateManager.updateRace(raceId, lapNumber);
      break;

    case 'complete':
      state = raceStateManager.completeRace(raceId);
      break;

    case 'reset':
      state = raceStateManager.resetRace(raceId);
      break;

    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
  }

  if (!state) {
    return NextResponse.json(
      { error: 'Race not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(state);
}

// DELETE /api/mock-race/[raceId] - Delete race
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ raceId: string }> }
) {
  const { raceId } = await params;
  raceStateManager.resetRace(raceId);

  return NextResponse.json({ success: true, message: 'Race deleted' });
}
