// In-memory race state manager for mock races
// This simulates server-side race state that multiple users can access

import { mockDrivers, mockRaceResults, getProjectedPoints } from './mockData';

export interface DriverPosition {
  driverId: number;
  position: number;
  projectedFinishPts: number;
  earnedStagePts: number;
  totalPts: number;
}

export interface RaceState {
  raceId: string;
  lapNumber: number;
  totalLaps: number;
  isRunning: boolean;
  isComplete: boolean;
  positions: DriverPosition[];
  stage: number;
  progress: number;
  lastUpdated: Date;
}

// In-memory storage
const raceStates = new Map<string, RaceState>();

// Calculate earned stage points based on race progress
// Stage points are only awarded to top 10 finishers in each stage
function calculateEarnedStagePoints(driverId: number, lapNumber: number, currentPosition: number): number {
  const finalStagePoints = mockRaceResults.stagePoints[driverId as keyof typeof mockRaceResults.stagePoints] || 0;

  if (lapNumber < 100) {
    // Stage 1 hasn't finished yet - no stage points earned
    return 0;
  } else if (lapNumber < 200) {
    // Stage 1 complete, Stage 2 in progress
    // Award approximately half of the driver's final stage points (Stage 1 results)
    // Only top 10 get stage points
    const stage1Estimate = currentPosition <= 10 ? Math.round(finalStagePoints * 0.5) : 0;
    return stage1Estimate;
  } else {
    // Both stages complete - use actual total stage points
    return finalStagePoints;
  }
}

// Calculate driver positions for a given lap
function calculatePositions(lapNumber: number): DriverPosition[] {
  if (lapNumber === 0) {
    return mockDrivers.map((driver, idx) => ({
      driverId: driver.id,
      position: idx + 1,
      projectedFinishPts: getProjectedPoints(idx + 1),
      earnedStagePts: 0,
      totalPts: getProjectedPoints(idx + 1),
    }));
  }

  const raceProgress = lapNumber / 400;

  // Calculate scores for each driver
  const driverScores = mockDrivers.map((driver, idx) => {
    const driverSpeed = Math.sin(driver.id * 0.5) * 0.3 + 1;

    let variance;
    if (raceProgress < 0.25) {
      variance = Math.sin(lapNumber / 20 + idx * 1.3) * 3.5;
    } else if (raceProgress < 0.75) {
      variance = Math.sin(lapNumber / 40 + idx * 1.3) * 2.5 + Math.cos(lapNumber / 15 + idx) * 1.5;
    } else {
      const finalPos = mockRaceResults.finishingPositions[driver.id as keyof typeof mockRaceResults.finishingPositions];
      const convergeFactor = (raceProgress - 0.75) / 0.25;
      const currentVar = Math.sin(lapNumber / 50 + idx * 1.3) * 1.5;
      variance = currentVar * (1 - convergeFactor) + (finalPos - (idx + 1)) * convergeFactor;
    }

    const score = (idx + 1) + variance * driverSpeed;
    return { driver, score };
  });

  // Sort and assign positions
  const sortedByScore = [...driverScores].sort((a, b) => a.score - b.score);

  return sortedByScore.map((item, idx) => {
    const position = idx + 1;
    const projectedFinishPts = getProjectedPoints(position);
    const earnedStagePts = calculateEarnedStagePoints(item.driver.id, lapNumber, position);
    const totalPts = projectedFinishPts + earnedStagePts;

    return {
      driverId: item.driver.id,
      position,
      projectedFinishPts,
      earnedStagePts,
      totalPts,
    };
  });
}

export const raceStateManager = {
  // Create or reset a race
  createRace(raceId: string): RaceState {
    const state: RaceState = {
      raceId,
      lapNumber: 0,
      totalLaps: 400,
      isRunning: false,
      isComplete: false,
      positions: calculatePositions(0),
      stage: 1,
      progress: 0,
      lastUpdated: new Date(),
    };
    raceStates.set(raceId, state);
    return state;
  },

  // Get race state
  getRaceState(raceId: string): RaceState | null {
    return raceStates.get(raceId) || null;
  },

  // Start a race
  startRace(raceId: string): RaceState | null {
    const state = raceStates.get(raceId);
    if (!state) return null;

    state.isRunning = true;
    state.lapNumber = 1;
    state.positions = calculatePositions(1);
    state.progress = Math.round((1 / state.totalLaps) * 100);
    state.stage = 1;
    state.lastUpdated = new Date();

    return state;
  },

  // Update race (advance laps)
  updateRace(raceId: string, newLapNumber: number): RaceState | null {
    const state = raceStates.get(raceId);
    if (!state) return null;

    // Clamp lap number
    const lapNumber = Math.min(Math.max(0, newLapNumber), state.totalLaps);

    state.lapNumber = lapNumber;
    state.positions = calculatePositions(lapNumber);
    state.progress = Math.round((lapNumber / state.totalLaps) * 100);
    state.stage = lapNumber < 100 ? 1 : lapNumber < 200 ? 2 : lapNumber < 300 ? 3 : 4;
    state.lastUpdated = new Date();

    if (lapNumber >= state.totalLaps) {
      state.isComplete = true;
      state.isRunning = false;
    }

    return state;
  },

  // Pause race
  pauseRace(raceId: string): RaceState | null {
    const state = raceStates.get(raceId);
    if (!state) return null;

    state.isRunning = false;
    state.lastUpdated = new Date();
    return state;
  },

  // Resume race
  resumeRace(raceId: string): RaceState | null {
    const state = raceStates.get(raceId);
    if (!state || state.isComplete || state.lapNumber === 0) return null;

    state.isRunning = true;
    state.lastUpdated = new Date();
    return state;
  },

  // Complete race (jump to end)
  completeRace(raceId: string): RaceState | null {
    const state = raceStates.get(raceId);
    if (!state) return null;

    state.lapNumber = state.totalLaps;
    state.isComplete = true;
    state.isRunning = false;
    state.positions = calculatePositions(state.totalLaps);
    state.progress = 100;
    state.stage = 4;
    state.lastUpdated = new Date();

    return state;
  },

  // Reset race
  resetRace(raceId: string): RaceState | null {
    return this.createRace(raceId);
  },

  // Get all races (for admin/debugging)
  getAllRaces(): RaceState[] {
    return Array.from(raceStates.values());
  },
};
