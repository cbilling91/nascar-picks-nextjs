// Mock data for testing without NASCAR API

export const mockDrivers = [
  { id: 1, nascar_driver_id: 1, first_name: "Chase", last_name: "Elliott", full_name: "Chase Elliott", car_number: "9", team: "Hendrick Motorsports" },
  { id: 2, nascar_driver_id: 2, first_name: "Denny", last_name: "Hamlin", full_name: "Denny Hamlin", car_number: "11", team: "Joe Gibbs Racing" },
  { id: 3, nascar_driver_id: 3, first_name: "Kyle", last_name: "Larson", full_name: "Kyle Larson", car_number: "5", team: "Hendrick Motorsports" },
  { id: 4, nascar_driver_id: 4, first_name: "Christopher", last_name: "Bell", full_name: "Christopher Bell", car_number: "20", team: "Joe Gibbs Racing" },
  { id: 5, nascar_driver_id: 5, first_name: "Tyler", last_name: "Reddick", full_name: "Tyler Reddick", car_number: "45", team: "23XI Racing" },
  { id: 6, nascar_driver_id: 6, first_name: "Bubba", last_name: "Wallace", full_name: "Bubba Wallace", car_number: "23", team: "23XI Racing" },
  { id: 7, nascar_driver_id: 7, first_name: "Ryan", last_name: "Blaney", full_name: "Ryan Blaney", car_number: "12", team: "Team Penske" },
  { id: 8, nascar_driver_id: 8, first_name: "Joey", last_name: "Logano", full_name: "Joey Logano", car_number: "22", team: "Team Penske" },
  { id: 9, nascar_driver_id: 9, first_name: "Austin", last_name: "Cindric", full_name: "Austin Cindric", car_number: "2", team: "Team Penske" },
  { id: 10, nascar_driver_id: 10, first_name: "William", last_name: "Byron", full_name: "William Byron", car_number: "24", team: "Hendrick Motorsports" },
];

// Generate placeholder drivers for positions 11-40
export function getAllRaceDrivers() {
  const allDrivers = [...mockDrivers];
  for (let i = 11; i <= 40; i++) {
    allDrivers.push({
      id: i,
      nascar_driver_id: i,
      first_name: "Driver",
      last_name: `#${i}`,
      full_name: `Driver #${i}`,
      car_number: String(i),
      team: "Other Team",
    });
  }
  return allDrivers;
}

export const mockRaceResults = {
  // Finishing positions (1-40) for each driver
  finishingPositions: {
    1: 1,  // Chase Elliott - 1st
    2: 3,  // Denny Hamlin - 3rd
    3: 2,  // Kyle Larson - 2nd
    4: 5,  // Christopher Bell - 5th
    5: 4,  // Tyler Reddick - 4th
    6: 8,  // Bubba Wallace - 8th
    7: 6,  // Ryan Blaney - 6th
    8: 12, // Joey Logano - 12th
    9: 15, // Austin Cindric - 15th
    10: 7, // William Byron - 7th
  },
  // Stage points earned (Stage 1 + Stage 2)
  // Stage winners get 10 points, 2nd-10th get 9,8,7,6,5,4,3,2,1 respectively
  stagePoints: {
    1: 18,  // Chase Elliott - Won Stage 1 (10) + 8th in Stage 2 (3) = 13 points, bumped to 18 for realism
    2: 15,  // Denny Hamlin - 2nd in Stage 1 (9) + 4th in Stage 2 (7) = 16, adjusted to 15
    3: 20,  // Kyle Larson - Won Stage 1 (10) + Won Stage 2 (10) = 20 points
    4: 12,  // Christopher Bell - 5th in Stage 1 (6) + 3rd in Stage 2 (8) = 14, adjusted to 12
    5: 10,  // Tyler Reddick - 3rd in Stage 1 (8) + 9th in Stage 2 (2) = 10 points
    6: 5,   // Bubba Wallace - 7th in Stage 1 (4) + 10th in Stage 2 (1) = 5 points
    7: 8,   // Ryan Blaney - 4th in Stage 1 (7) + outside top 10 Stage 2 (0) = 7, adjusted to 8
    8: 3,   // Joey Logano - 9th in Stage 1 (2) + outside top 10 Stage 2 (0) = 2, adjusted to 3
    9: 0,   // Austin Cindric - No stage points
    10: 7,  // William Byron - 6th in Stage 1 (5) + 9th in Stage 2 (2) = 7 points
  },
  // TOTAL points earned (finishing position points + stage points)
  // This is what the competition uses per spec: "you receive the points your drivers earned"
  points: {
    1: 58,  // Chase Elliott - 1st place (40) + stage (18) = 58 points
    2: 49,  // Denny Hamlin - 3rd place (34) + stage (15) = 49 points
    3: 55,  // Kyle Larson - 2nd place (35) + stage (20) = 55 points
    4: 44,  // Christopher Bell - 5th place (32) + stage (12) = 44 points
    5: 43,  // Tyler Reddick - 4th place (33) + stage (10) = 43 points
    6: 34,  // Bubba Wallace - 8th place (29) + stage (5) = 34 points
    7: 39,  // Ryan Blaney - 6th place (31) + stage (8) = 39 points
    8: 28,  // Joey Logano - 12th place (25) + stage (3) = 28 points
    9: 22,  // Austin Cindric - 15th place (22) + stage (0) = 22 points
    10: 37, // William Byron - 7th place (30) + stage (7) = 37 points
  },
};

export const mockPicksForRace = {
  user1: [1, 3, 7],      // Chase, Kyle, Ryan
  user2: [2, 4, 5],      // Denny, Christopher, Tyler
  user3: [1, 2, 3],      // Chase, Denny, Kyle
};

// Calculate points for a set of picks
export function calculateMockRacePoints(picks: number[], results: typeof mockRaceResults) {
  return picks.reduce((total, driverId) => {
    return total + (results.points[driverId as keyof typeof results.points] || 0);
  }, 0);
}

// Get finishing positions for picks
export function getMockFinishingPositions(picks: number[], results: typeof mockRaceResults) {
  return picks.map(driverId => results.finishingPositions[driverId as keyof typeof results.finishingPositions] || 99);
}

// Generate live race updates (simulating race progress)
export function generateLiveRaceUpdate(lapNumber: number, totalLaps: number = 400) {
  // Simulate position changes based on lap progress
  const progress = lapNumber / totalLaps;
  
  // Only generate positions for the 10 mock drivers
  const positions = mockDrivers.map((driver, idx) => {
    // Base positions vary by driver
    const basePos = idx + 1;
    // Add some randomness to positions as race progresses
    const variance = Math.floor(Math.sin(lapNumber / 50 + idx) * 2);
    return Math.max(1, Math.min(40, basePos + variance));
  });

  return {
    lapNumber,
    totalLaps,
    progress: Math.round(progress * 100),
    currentPositions: positions,
    stage: lapNumber < 100 ? 1 : lapNumber < 200 ? 2 : lapNumber < 300 ? 3 : 4,
    stageProgress: lapNumber % 100,
  };
}

// Calculate projected points based on current position
// NASCAR Cup Series Points System (2024-2026):
// 1st: 40, 2nd: 35, 3rd: 34, then decreasing by 1 point per position down to 36th (1 point)
// Positions 37-40 all receive 1 point
export function getProjectedPoints(currentPosition: number): number {
  const pointsTable: Record<number, number> = {
    1: 40, 2: 35, 3: 34, 4: 33, 5: 32, 6: 31, 7: 30, 8: 29, 9: 28, 10: 27,
    11: 26, 12: 25, 13: 24, 14: 23, 15: 22, 16: 21, 17: 20, 18: 19, 19: 18, 20: 17,
    21: 16, 22: 15, 23: 14, 24: 13, 25: 12, 26: 11, 27: 10, 28: 9, 29: 8, 30: 7,
    31: 6, 32: 5, 33: 4, 34: 3, 35: 2, 36: 1, 37: 1, 38: 1, 39: 1, 40: 1,
  };
  return pointsTable[currentPosition] || 0;
}
