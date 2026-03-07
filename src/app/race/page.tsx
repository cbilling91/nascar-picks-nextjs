"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Radio, Trophy, ChevronLeft } from "lucide-react";
import {
  getNASCARSchedule,
  getNASCARDrivers,
  getRaceResults,
  isRaceLiveOrUpcoming,
  getLiveStagePoints,
  getLiveLapData,
  getRaceStageInfo,
  calculateRacePoints,
  calculateLiveProjectedPoints,
  type NASCARRace,
  type NASCARDriver,
  type UserRaceResult,
  type LiveStagePoints,
  type RaceStageInfo,
  type LiveLapData,
} from "@/lib/nascar-api";
import { createClient } from "@/lib/supabase/client";

export default function LivePage() {
  const searchParams = useSearchParams();
  const raceId = searchParams.get("raceId");
  const [race, setRace] = useState<NASCARRace | null>(null);
  const [results, setResults] = useState<UserRaceResult[]>([]);
  const [drivers, setDrivers] = useState<NASCARDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [currentLap, setCurrentLap] = useState(0);
  const [totalLaps, setTotalLaps] = useState(0);
  const [leader, setLeader] = useState<string>("");
  const [flagState, setFlagState] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    const loadRaceData = async () => {
      if (!raceId) {
        setLoading(false);
        return;
      }

      try {
        const schedule = await getNASCARSchedule();
        const raceInfo = schedule.find((r) => r.raceId === parseInt(raceId));
        if (!raceInfo) {
          setLoading(false);
          return;
        }
        setRace(raceInfo);

        const driversList = await getNASCARDrivers();
        setDrivers(driversList);

        // Check if race is live or upcoming
        let liveStatus = await isRaceLiveOrUpcoming(parseInt(raceId), raceInfo.date);

        const raceResults = await getRaceResults(parseInt(raceId));

        // For regular races, always try to fetch stage points, stage info, and live lap data
        let liveStagePoints: Map<number, LiveStagePoints> | undefined;
        let stageInfo: RaceStageInfo | null = null;
        let liveLapData: LiveLapData | null = null;
        if (raceInfo.type === "regular") {
          liveStagePoints = await getLiveStagePoints(parseInt(raceId));
          stageInfo = await getRaceStageInfo(parseInt(raceId));
          liveLapData = await getLiveLapData(parseInt(raceId));

          // If lap-times shows laps in progress but isLive is false, the race is live
          // (weekend feed lags behind other APIs)
          if (!liveStatus && liveLapData && liveLapData.currentLap > 0) {
            const allPointsZero = raceResults.every((r) => r.pointsEarned === 0);
            if (allPointsZero) {
              liveStatus = true;
            }
          }
        }
        setIsLive(liveStatus);

        // Update live lap ticker from lap-times API (most reliable real-time source)
        if (liveStatus) {
          if (stageInfo) {
            setTotalLaps(stageInfo.totalLaps);
          }

          if (liveLapData) {
            setCurrentLap(liveLapData.currentLap);
            setFlagState(liveLapData.flagState);
            if (liveLapData.leader) {
              setLeader(liveLapData.leader.name);
            }
          }
        }

        // Fetch all user picks for this race using NASCAR race ID directly
        const { data: picks, error: picksError } = await supabase
          .from("picks")
          .select("user_id, race_id, driver_1_id, driver_2_id, driver_3_id, profiles!inner(display_name)")
          .eq("race_id", parseInt(raceId));

        if (picksError) {
          console.error("Error fetching picks:", picksError);
        }

        if (!picks || picks.length === 0) {
          setLoading(false);
          return;
        }

        // Calculate points for each user
        const userResults: UserRaceResult[] = picks.map((pick: any) => {
          const driverIds = [pick.driver_1_id, pick.driver_2_id, pick.driver_3_id].filter(Boolean);
          const totalPoints = calculateRacePoints(
            driverIds,
            raceResults,
            raceInfo.type,
            liveStatus,
            liveStagePoints,
            stageInfo,
            liveLapData
          );

          const driverResults = driverIds.map((driverId) => {
            const result = raceResults.find((r) => r.driverId === driverId);
            let pointsEarned = result?.pointsEarned || 0;

            // For live regular season races, calculate projected points
            if (liveStatus && raceInfo.type === "regular" && result) {
              const stagePoints = liveStagePoints?.get(driverId);
              // Best position source: lap-times running position > weekend feed > stage position
              const position = result.finishingPosition > 0
                ? result.finishingPosition
                : (liveLapData?.runningPositions.get(driverId) || stagePoints?.lastStagePosition || 0);

              if (position > 0) {
                const lapsCompleted = liveLapData?.currentLap || result.lapsCompleted;
                pointsEarned = calculateLiveProjectedPoints(
                  position,
                  lapsCompleted,
                  stagePoints?.stage1Points || 0,
                  stagePoints?.stage2Points || 0,
                  stagePoints?.stage3Points || 0,
                  stageInfo
                );
              }
            }

            // Use real-time running position during live races when finishingPosition is 0
            const displayPosition = result?.finishingPosition || 0;
            const livePosition = liveStatus && displayPosition === 0
              ? (liveLapData?.runningPositions.get(driverId) || liveStagePoints?.get(driverId)?.lastStagePosition || 0)
              : displayPosition;

            return {
              driverId,
              finishingPosition: livePosition,
              pointsEarned,
            };
          });

          return {
            userId: pick.user_id,
            username: pick.profiles.display_name,
            picks: driverIds,
            totalPoints,
            driverResults,
            isWeeklyWinner: false,
          };
        });

        // Sort and determine weekly winner
        if (raceInfo.type === "clash" || raceInfo.type === "allstar") {
          // Sort by combined finishing position (lower is better)
          userResults.sort((a, b) => a.totalPoints - b.totalPoints);

          // Award bonus points to top 5 (only if race is complete)
          if (!liveStatus) {
            const bonusPoints = [30, 20, 15, 10, 5];
            userResults.forEach((user, index) => {
              if (index < 5) {
                user.totalPoints = bonusPoints[index];
              } else {
                user.totalPoints = 0;
              }
            });
          }
        } else {
          // Regular race or duel - sort by points (higher is better)
          userResults.sort((a, b) => b.totalPoints - a.totalPoints);

          // Mark weekly winner and add 25 point bonus for regular races (only if race is complete)
          if (userResults.length > 0 && raceInfo.type === "regular" && !liveStatus) {
            userResults[0].isWeeklyWinner = true;
            userResults[0].totalPoints += 25;
          }
        }

        setResults(userResults);
      } catch (error) {
        console.error("Error loading race data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadRaceData();

    // Always set up auto-refresh interval — loadRaceData determines if race is live
    // and updates state accordingly. Refresh every 10 seconds.
    const interval = setInterval(loadRaceData, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [raceId]);

  if (!raceId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Radio className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Live Race</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>No Race Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>Select a race from the schedule to view live data or results.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground text-center">Loading race data...</p>
      </div>
    );
  }

  if (!race) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground text-center">Race not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/schedule">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Schedule
        </Link>
      </Button>

      <div className="flex items-center gap-2 mb-6">
        {isLive ? <Radio className="h-6 w-6 animate-pulse text-red-500" /> : <Trophy className="h-6 w-6" />}
        <h1 className="text-2xl font-bold">{isLive ? "Live Race" : "Race Results"}</h1>
        {isLive && (
          <Badge className="bg-red-600 animate-pulse">LIVE</Badge>
        )}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{race.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{race.track}</p>
          {isLive && (() => {
            const progress = totalLaps > 0 ? Math.round((currentLap / totalLaps) * 100) : 0;
            const flagColor = flagState === 2 ? "bg-yellow-400" : flagState === 4 ? "bg-red-500" : "bg-green-500";
            const flagBorder = flagState === 2 ? "border-yellow-400" : flagState === 4 ? "border-red-500" : "border-green-500";
            const flagLabel = flagState === 2 ? "Caution" : flagState === 4 ? "Red" : "Green";

            return (
              <div className="mt-4 space-y-3">
                <div className={`p-3 rounded border ${flagBorder} bg-card`}>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">Live Status</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        flagState === 2 ? "bg-yellow-400/20 text-yellow-700 dark:text-yellow-400" :
                        flagState === 4 ? "bg-red-500/20 text-red-700 dark:text-red-400" :
                        "bg-green-500/20 text-green-700 dark:text-green-400"
                      }`}>{flagLabel}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Updates every 10s</span>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-muted-foreground">Lap {currentLap}{totalLaps > 0 ? ` of ${totalLaps}` : ""}</span>
                      <span className="text-xs font-medium">{progress}%</span>
                    </div>
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${flagColor}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Leader</p>
                      <p className="text-sm font-semibold">{leader || "Loading..."}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {results.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No picks found for this race</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {results.map((result, index) => (
            <Card
              key={result.userId}
              className={index === 0 && !isLive ? "border-yellow-500 border-2 bg-yellow-50 dark:bg-yellow-950/20" : ""}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold text-muted-foreground w-8">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold">{result.username}</p>
                      {result.isWeeklyWinner && (
                        <Badge className="bg-yellow-600 text-xs mt-1">
                          Weekly Winner (+25)
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{result.totalPoints}</p>
                    <p className="text-xs text-muted-foreground">
                      {race.type === "clash" || race.type === "allstar" ? "combined pos" : "points"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 justify-center mb-3">
                  {result.driverResults.map((driverResult) => {
                    const driver = drivers.find((d) => d.id === driverResult.driverId);
                    if (!driver) return null;
                    return (
                      <div key={driver.id} className="flex flex-col items-center flex-1 max-w-[80px]">
                        <div className="w-full aspect-square bg-muted rounded overflow-hidden mb-0.5 flex items-center justify-center relative">
                          {driver.firesuitImage ? (
                            <img
                              src={driver.firesuitImage}
                              alt={`${driver.name} firesuit`}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="text-muted-foreground text-xs">No image</div>
                          )}
                          {driver.badgeImage && (
                            <img
                              src={driver.badgeImage}
                              alt={`${driver.name} badge`}
                              className="absolute top-0.5 left-0.5 h-4 w-4 object-contain bg-white rounded p-0.5"
                            />
                          )}
                        </div>
                        <p className="text-xs text-center line-clamp-1 leading-tight">{driver.name}</p>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {race.type === "regular" ? (
                            <span>{driverResult.pointsEarned} pts</span>
                          ) : (
                            <span>P{driverResult.finishingPosition || "-"}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Points breakdown */}
                <div className="border-t pt-3 space-y-1">
                  {result.driverResults.map((driverResult) => {
                    const driver = drivers.find((d) => d.id === driverResult.driverId);
                    if (!driver) return null;

                    let pointsBreakdown = "";
                    if (race.type === "duel") {
                      const duelPoints = driverResult.finishingPosition > 0 && driverResult.finishingPosition <= 10
                        ? 11 - driverResult.finishingPosition
                        : 0;
                      pointsBreakdown = `P${driverResult.finishingPosition} = ${duelPoints} pts`;
                    } else if (race.type === "clash" || race.type === "allstar") {
                      pointsBreakdown = `P${driverResult.finishingPosition}`;
                    } else if (isLive && race.type === "regular") {
                      // During live race, show projected points
                      pointsBreakdown = `${driverResult.pointsEarned} pts (projected)`;
                    } else {
                      pointsBreakdown = `P${driverResult.finishingPosition} = ${driverResult.pointsEarned} pts`;
                    }

                    return (
                      <div key={driver.id} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{driver.name}</span>
                        <span className="font-medium">{pointsBreakdown}</span>
                      </div>
                    );
                  })}
                  {result.isWeeklyWinner && (
                    <div className="flex justify-between text-xs font-semibold border-t pt-1 mt-1">
                      <span>Weekly Winner Bonus</span>
                      <span className="text-yellow-600">+25 pts</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
