export interface NASCARRace {
  raceId: number;
  name: string;
  date: string;
  track: string;
  type: string;
}

export interface NASCARDriver {
  id: number;
  number: number;
  name: string;
  badgeImage: string;
  manufacturerImage?: string;
  teamName?: string;
  manufacturer?: string;
  firesuitImage?: string;
}

export interface RaceResult {
  driverId: number;
  driverName: string;
  finishingPosition: number;
  lapsCompleted: number;
  pointsEarned: number;
  finishingStatus: string;
}

export interface RaceStageInfo {
  stage1Laps: number;
  stage2Laps: number;
  stage3Laps: number;
  totalLaps: number;
}

export interface UserRaceResult {
  userId: string;
  username: string;
  picks: number[];
  totalPoints: number;
  driverResults: {
    driverId: number;
    finishingPosition: number;
    pointsEarned: number;
  }[];
  isWeeklyWinner: boolean;
}

export interface LiveStagePoints {
  driverId: number;
  stage1Points: number;
  stage2Points: number;
  stage3Points: number;
  lastStagePosition: number;
}

export interface LiveLapData {
  currentLap: number;
  flagState: number; // 1=green, 2=caution, etc.
  runningPositions: Map<number, number>; // driverId -> running position
  leader: { driverId: number; name: string } | null;
}

// NASCAR Cup Series Points System
const FINISHING_POSITION_POINTS: { [key: number]: number } = {
  1: 55, 2: 35, 3: 34, 4: 33, 5: 32, 6: 31, 7: 30, 8: 29, 9: 28, 10: 27,
  11: 26, 12: 25, 13: 24, 14: 23, 15: 22, 16: 21, 17: 20, 18: 19, 19: 18, 20: 17,
  21: 16, 22: 15, 23: 14, 24: 13, 25: 12, 26: 11, 27: 10, 28: 9, 29: 8, 30: 7,
  31: 6, 32: 5, 33: 4, 34: 3, 35: 2, 36: 1
};

const STAGE_POINTS: { [key: number]: number } = {
  1: 10, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1
};

export async function isRaceLiveOrUpcoming(raceId: number, raceDate: string): Promise<boolean> {
  try {
    const response = await fetch(`https://cf.nascar.com/cacher/2026/1/${raceId}/weekend-feed.json`);
    const data = await response.json();

    if (!data.weekend_race || !Array.isArray(data.weekend_race) || data.weekend_race.length === 0) {
      return false;
    }

    const race = data.weekend_race[0];

    // Check if race is finished: total_race_time is populated when race completes
    if (race.total_race_time && race.total_race_time !== "") {
      return false;
    }

    // Check if race has started: any driver has laps_completed > 0
    if (!race.results || !Array.isArray(race.results)) {
      return false;
    }

    const hasLapsCompleted = race.results.some((r: any) => r.laps_completed > 0);
    if (hasLapsCompleted) {
      return true;
    }

    // If no laps completed yet, check if race is within 1 hour before start time
    // This covers pre-race ceremonies and races that haven't started yet
    const raceStartTime = new Date(raceDate).getTime();
    const now = new Date().getTime();
    const oneHourInMs = 60 * 60 * 1000;

    // Race is considered "live" if it's within 1 hour before or after start time
    return now >= raceStartTime - oneHourInMs && now <= raceStartTime + oneHourInMs;
  } catch (error) {
    console.error(`Error checking race status for ${raceId}:`, error);
    return false;
  }
}

export async function getNASCARSchedule(): Promise<NASCARRace[]> {
  try {
    const response = await fetch("https://cf.nascar.com/cacher/2026/1/schedule-feed.json");
    const data = await response.json();

    // Parse the schedule feed and extract races
    // Filter for race events (not practice/qualifying) and deduplicate by race_id
    const races = Array.isArray(data) ? data : data.races || [];
    const raceMap = new Map<number, any>();

    races.forEach((event: any) => {
      // Include actual races and qualifying races (Duels)
      if (event.race_id && (event.event_name === "Race" || event.event_name?.includes("Qualifying Race"))) {
        // Keep the first occurrence of each race_id
        if (!raceMap.has(event.race_id)) {
          raceMap.set(event.race_id, event);
        }
      }
    });

    return Array.from(raceMap.values()).map((race: any) => {
      // Detect race type from race name
      let raceType = "regular";
      const raceName = race.race_name || "";

      if (raceName.toLowerCase().includes("duel")) {
        raceType = "duel";
      } else if (raceName.toLowerCase().includes("clash")) {
        raceType = "clash";
      } else if (raceName.toLowerCase().includes("all-star")) {
        raceType = "allstar";
      }

      return {
        raceId: race.race_id,
        name: race.race_name,
        // Use local start_time without Z suffix - JS will interpret as local time
        date: race.start_time || '',
        track: race.track_name,
        type: raceType,
      };
    });
  } catch (error) {
    console.error("Error fetching NASCAR schedule:", error);
    return [];
  }
}

export async function isRaceLiveFromAPI(raceId: number): Promise<boolean> {
  try {
    const response = await fetch(`https://cf.nascar.com/cacher/2026/1/${raceId}/weekend-feed.json`);
    const data = await response.json();

    if (!data.weekend_race || !Array.isArray(data.weekend_race) || data.weekend_race.length === 0) {
      return false;
    }

    const race = data.weekend_race[0];

    // Check if race is finished: total_race_time is populated when race completes
    if (race.total_race_time && race.total_race_time !== "") {
      return false;
    }

    // Check if race has started: any driver has laps_completed > 0
    if (!race.results || !Array.isArray(race.results)) {
      return false;
    }

    const hasLapsCompleted = race.results.some((r: any) => r.laps_completed > 0);

    // Race is live if it has started but hasn't finished
    return hasLapsCompleted;
  } catch (error) {
    console.error(`Error checking race status for ${raceId}:`, error);
    return false;
  }
}

export async function getNASCARDrivers(): Promise<NASCARDriver[]> {
  try {
    const response = await fetch("https://cf.nascar.com/cacher/drivers.json");
    const data = await response.json();

    // Parse the drivers feed and filter by Cup Series
    const drivers = data.response || [];

    return drivers
      .filter((driver: any) =>
        driver.Driver_Series === "nascar-cup-series" &&
        driver.Driver_Part_Time !== "" &&
        driver.Driver_Post_Status === "publish"
      )
      .map((driver: any) => {
        // Extract team name from Team field
        let teamName = driver.Team || "";
        // Remove URLs if present
        if (teamName && teamName.startsWith("http")) {
          teamName = "";
        }

        return {
          id: driver.Nascar_Driver_ID,
          number: parseInt(driver.Badge) || driver.Nascar_Driver_ID,
          name: driver.Full_Name || `${driver.First_Name} ${driver.Last_Name}`,
          badgeImage: driver.Badge_Image,
          manufacturerImage: driver.Manufacturer_Small,
          teamName: teamName || undefined,
          manufacturer: driver.Manufacturer,
          firesuitImage: driver.Firesuit_Image,
        };
      });
  } catch (error) {
    console.error("Error fetching NASCAR drivers:", error);
    return [];
  }
}

export async function getRaceResults(raceId: number): Promise<RaceResult[]> {
  try {
    const response = await fetch(`https://cf.nascar.com/cacher/2026/1/${raceId}/weekend-feed.json`);
    const data = await response.json();

    if (!data.weekend_race || !Array.isArray(data.weekend_race) || data.weekend_race.length === 0) {
      return [];
    }

    const race = data.weekend_race[0];

    if (!race.results || !Array.isArray(race.results)) {
      return [];
    }

    return race.results.map((result: any) => ({
      driverId: result.driver_id,
      driverName: result.driver_fullname || result.driver_name || "",
      finishingPosition: result.finishing_position || 0,
      lapsCompleted: result.laps_completed || 0,
      pointsEarned: result.points_earned || 0,
      finishingStatus: result.finishing_status || "",
    }));
  } catch (error) {
    console.error(`Error fetching race results for ${raceId}:`, error);
    return [];
  }
}

export async function getRaceStageInfo(raceId: number): Promise<RaceStageInfo | null> {
  try {
    const response = await fetch(`https://cf.nascar.com/cacher/2026/1/${raceId}/weekend-feed.json`);
    const data = await response.json();

    if (!data.weekend_race || !Array.isArray(data.weekend_race) || data.weekend_race.length === 0) {
      return null;
    }

    const race = data.weekend_race[0];

    return {
      stage1Laps: race.stage_1_laps || 0,
      stage2Laps: race.stage_2_laps || 0,
      stage3Laps: race.stage_3_laps || 0,
      totalLaps: race.scheduled_laps || 0,
    };
  } catch (error) {
    console.error(`Error fetching race stage info for ${raceId}:`, error);
    return null;
  }
}

export async function getLiveStagePoints(raceId: number): Promise<Map<number, LiveStagePoints>> {
  try {
    const response = await fetch(`https://cf.nascar.com/cacher/2026/1/${raceId}/live-stage-points.json`);
    const data = await response.json();

    const stagePointsMap = new Map<number, LiveStagePoints>();

    if (!data || !Array.isArray(data)) {
      return stagePointsMap;
    }

    // API returns array of stage objects: [{stage_number, results: [{driver_id, stage_points}]}]
    data.forEach((stage: any) => {
      const stageNumber = stage.stage_number;
      const results = stage.results || [];

      results.forEach((result: any) => {
        const driverId = result.driver_id;
        if (!stagePointsMap.has(driverId)) {
          stagePointsMap.set(driverId, {
            driverId,
            stage1Points: 0,
            stage2Points: 0,
            stage3Points: 0,
            lastStagePosition: 0,
          });
        }

        const entry = stagePointsMap.get(driverId)!;
        // Track the position from the latest stage
        entry.lastStagePosition = result.position || 0;
        if (stageNumber === 1) {
          entry.stage1Points = result.stage_points || 0;
        } else if (stageNumber === 2) {
          entry.stage2Points = result.stage_points || 0;
        } else if (stageNumber === 3) {
          entry.stage3Points = result.stage_points || 0;
        }
      });
    });

    return stagePointsMap;
  } catch (error) {
    console.error(`Error fetching live stage points for ${raceId}:`, error);
    return new Map();
  }
}

export async function getLiveLapData(raceId: number): Promise<LiveLapData | null> {
  try {
    const response = await fetch(`https://cf.nascar.com/cacher/2026/1/${raceId}/lap-times.json`);
    const data = await response.json();

    const flags = data.flags || [];
    const lastFlag = flags.length > 0 ? flags[flags.length - 1] : null;
    const currentLap = lastFlag?.LapsCompleted || 0;
    const flagState = lastFlag?.FlagState || 0;

    const runningPositions = new Map<number, number>();
    let leader: { driverId: number; name: string } | null = null;

    const laps = data.laps || [];
    for (const entry of laps) {
      const driverId = entry.NASCARDriverID;
      const lapData = entry.Laps || [];
      if (lapData.length > 0) {
        const lastLap = lapData[lapData.length - 1];
        const pos = lastLap.RunningPos;
        runningPositions.set(driverId, pos);
        if (pos === 1) {
          leader = { driverId, name: entry.FullName };
        }
      }
    }

    return { currentLap, flagState, runningPositions, leader };
  } catch (error) {
    console.error(`Error fetching live lap data for ${raceId}:`, error);
    return null;
  }
}

function getCurrentStage(lapsCompleted: number, stageInfo: RaceStageInfo): number {
  if (lapsCompleted <= stageInfo.stage1Laps) {
    return 1;
  } else if (lapsCompleted <= stageInfo.stage1Laps + stageInfo.stage2Laps) {
    return 2;
  } else if (stageInfo.stage3Laps > 0 && lapsCompleted <= stageInfo.stage1Laps + stageInfo.stage2Laps + stageInfo.stage3Laps) {
    return 3;
  } else {
    return stageInfo.stage3Laps > 0 ? 4 : 3;
  }
}

function getProjectedStagePoints(position: number): number {
  // Returns projected stage points based on current position (top 10 only)
  return STAGE_POINTS[position] || 0;
}

export function calculateLiveProjectedPoints(
  currentPosition: number,
  lapsCompleted: number,
  stage1Points: number,
  stage2Points: number,
  stage3Points: number,
  stageInfo: RaceStageInfo | null
): number {
  // Projected finishing position points
  const projectedFinishPoints = FINISHING_POSITION_POINTS[currentPosition] || 1;

  // If no stage info, just use what we have
  if (!stageInfo || stageInfo.stage1Laps === 0) {
    return stage1Points + stage2Points + stage3Points + projectedFinishPoints;
  }

  const currentStage = getCurrentStage(lapsCompleted, stageInfo);

  let totalStage1Points = stage1Points;
  let totalStage2Points = stage2Points;
  let totalStage3Points = stage3Points;

  // Stage 1: Project stage 1 points if not earned yet
  if (currentStage === 1 && stage1Points === 0) {
    totalStage1Points = getProjectedStagePoints(currentPosition);
  }

  // Stage 2: Project stage 2 points if not earned yet
  if (currentStage <= 2 && stage2Points === 0) {
    totalStage2Points = getProjectedStagePoints(currentPosition);
  }

  // Stage 3: Project stage 3 points if not earned yet (for 4-stage races)
  if (stageInfo.stage3Laps > 0 && currentStage <= 3 && stage3Points === 0) {
    totalStage3Points = getProjectedStagePoints(currentPosition);
  }

  return totalStage1Points + totalStage2Points + totalStage3Points + projectedFinishPoints;
}

export function calculateRacePoints(
  driverIds: number[],
  raceResults: RaceResult[],
  raceType: string,
  isLive: boolean = false,
  liveStagePoints?: Map<number, LiveStagePoints>,
  stageInfo?: RaceStageInfo | null,
  liveLapData?: LiveLapData | null
): number {
  if (raceType === "duel") {
    // Duels: Points for top 10 finish (1st=10, 2nd=9, ..., 10th=1)
    let totalPoints = 0;
    driverIds.forEach((driverId) => {
      const result = raceResults.find((r) => r.driverId === driverId);
      if (result && result.finishingPosition > 0 && result.finishingPosition <= 10) {
        totalPoints += 11 - result.finishingPosition;
      }
    });
    return totalPoints;
  } else if (raceType === "clash" || raceType === "allstar") {
    // Clash/All-Star: Sum of finishing positions (lower is better for top 5 ranking)
    // Not calculating points here, just return combined finish position for ranking
    let combinedPosition = 0;
    driverIds.forEach((driverId) => {
      const result = raceResults.find((r) => r.driverId === driverId);
      if (result && result.finishingPosition > 0) {
        combinedPosition += result.finishingPosition;
      } else {
        combinedPosition += 999; // DNF or not found
      }
    });
    return combinedPosition;
  } else {
    // Regular season races
    let totalPoints = 0;

    if (isLive) {
      // Live race: stage points earned + projected finishing position points
      driverIds.forEach((driverId) => {
        const result = raceResults.find((r) => r.driverId === driverId);

        if (result) {
          if (result.pointsEarned > 0) {
            // Race finishing up - driver already has final points
            totalPoints += result.pointsEarned;
          } else {
            const stagePoints = liveStagePoints?.get(driverId);
            const stagePointsTotal = (stagePoints?.stage1Points || 0) +
                                    (stagePoints?.stage2Points || 0) +
                                    (stagePoints?.stage3Points || 0);

            // Best position source: weekend-feed > lap-times running position > stage position
            const position = result.finishingPosition > 0
              ? result.finishingPosition
              : (liveLapData?.runningPositions.get(driverId) || stagePoints?.lastStagePosition || 0);

            const finishingPoints = position > 0 ? (FINISHING_POSITION_POINTS[position] || 1) : 0;
            totalPoints += stagePointsTotal + finishingPoints;
          }
        }
      });
    } else {
      // Completed race: Use final points earned
      driverIds.forEach((driverId) => {
        const result = raceResults.find((r) => r.driverId === driverId);
        if (result) {
          totalPoints += result.pointsEarned;
        }
      });
    }

    return totalPoints;
  }
}
