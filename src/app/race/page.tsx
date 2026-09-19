"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, animate, MotionConfig } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Radio, Trophy, ChevronLeft, PencilLine, LayoutGrid, Table2, TrendingUp, TrendingDown, EyeOff } from "lucide-react";
import {
  getNASCARSchedule,
  getNASCARDrivers,
  getRaceResults,
  isRaceLiveOrUpcoming,
  getLiveStagePoints,
  getLiveLapData,
  getRaceStageInfo,
  getTrackImageUrl,
  calculateRacePoints,
  calculateLiveProjectedPoints,
  type NASCARRace,
  type NASCARDriver,
  type UserRaceResult,
  type LiveStagePoints,
  type RaceStageInfo,
  type LiveLapData,
} from "@/lib/nascar-api";

const VIEW_MODE_KEY = "raceViewMode";

// Count-up animation for point totals when they change between polls
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const previousRef = useRef(value);

  useEffect(() => {
    const from = previousRef.current;
    previousRef.current = value;
    if (from === value) return;
    const controls = animate(from, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value]);

  return <>{display}</>;
}

// Per-driver stage points chips (S1/S2/S3). Stage wins (10 pts) get gold.
function StageChips({ stagePoints }: { stagePoints?: LiveStagePoints }) {
  if (!stagePoints) return null;
  const chips = [
    { label: "S1", points: stagePoints.stage1Points },
    { label: "S2", points: stagePoints.stage2Points },
    { label: "S3", points: stagePoints.stage3Points },
  ].filter((chip) => chip.points > 0);
  if (chips.length === 0) return null;

  return (
    <div className="flex gap-0.5 mt-0.5 justify-center flex-wrap">
      {chips.map((chip) => (
        <motion.span
          key={chip.label}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          className={`text-[10px] px-1 rounded font-medium ${
            chip.points === 10
              ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {chip.label} +{chip.points}
        </motion.span>
      ))}
    </div>
  );
}

// Position gain/loss indicator vs. the previous poll
function PositionDelta({ delta }: { delta?: number }) {
  if (delta === undefined || delta === 0) return null;
  const gained = delta > 0;
  return (
    <motion.span
      initial={{ opacity: 0, y: gained ? 4 : -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${
        gained ? "text-green-500" : "text-red-500"
      }`}
    >
      {gained ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(delta)}
    </motion.span>
  );
}

function stageTotal(stagePoints?: LiveStagePoints): number {
  if (!stagePoints) return 0;
  return stagePoints.stage1Points + stagePoints.stage2Points + stagePoints.stage3Points;
}

function ResultsTable({
  results,
  drivers,
  race,
  stagePointsMap,
}: {
  results: UserRaceResult[];
  drivers: NASCARDriver[];
  race: NASCARRace;
  stagePointsMap: Map<number, LiveStagePoints>;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b">
                <th className="py-3 pl-4 pr-2 w-8">#</th>
                <th className="py-3 pr-4">Player</th>
                <th className="py-3 pr-4">Driver 1</th>
                <th className="py-3 pr-4">Driver 2</th>
                <th className="py-3 pr-4">Driver 3</th>
                <th className="py-3 pr-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr
                  key={result.userId}
                  className={`border-b last:border-0 ${result.isWeeklyWinner ? "bg-yellow-500/10" : ""}`}
                >
                  <td className="py-3 pl-4 pr-2 font-bold text-muted-foreground">{index + 1}</td>
                  <td className="py-3 pr-4 font-medium whitespace-nowrap">
                    {result.username}
                    {result.isWeeklyWinner && <span className="ml-1">🏆</span>}
                  </td>
                  {result.driverResults.map((driverResult) => {
                    const driver = drivers.find((d) => d.id === driverResult.driverId);
                    const stages = stageTotal(stagePointsMap.get(driverResult.driverId));
                    return (
                      <td key={driverResult.driverId} className="py-3 pr-4">
                        <div className="font-medium leading-tight">{driver?.name ?? driverResult.driverId}</div>
                        <div className="text-xs text-muted-foreground">
                          {race.type === "regular"
                            ? `P${driverResult.finishingPosition || "-"}${stages > 0 ? ` · Stg +${stages}` : ""} · ${driverResult.pointsEarned} pts`
                            : `P${driverResult.finishingPosition || "-"}`}
                        </div>
                      </td>
                    );
                  })}
                  <td className="py-3 pr-4 text-right font-bold">
                    <AnimatedNumber value={result.totalPoints} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function UserResultCard({
  result,
  index,
  isLive,
  race,
  drivers,
  stagePointsMap,
  positionDeltas,
}: {
  result: UserRaceResult;
  index: number;
  isLive: boolean;
  race: NASCARRace;
  drivers: NASCARDriver[];
  stagePointsMap: Map<number, LiveStagePoints>;
  positionDeltas: Map<number, number>;
}) {
  return (
    <Card
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
            <p className="text-2xl font-bold">
              <AnimatedNumber value={result.totalPoints} />
            </p>
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
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  {race.type === "regular" ? (
                    <span>{driverResult.pointsEarned} pts</span>
                  ) : (
                    <span>P{driverResult.finishingPosition || "-"}</span>
                  )}
                  {isLive && <PositionDelta delta={positionDeltas.get(driver.id)} />}
                </div>
                {race.type === "regular" && (
                  <StageChips stagePoints={stagePointsMap.get(driver.id)} />
                )}
              </div>
            );
          })}
        </div>

        {/* Points breakdown */}
        <div className="border-t pt-3 space-y-1">
          {result.driverResults.map((driverResult) => {
            const driver = drivers.find((d) => d.id === driverResult.driverId);
            if (!driver) return null;

            const stages = stageTotal(stagePointsMap.get(driverResult.driverId));
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
              pointsBreakdown = `P${driverResult.finishingPosition || "-"}${stages > 0 ? ` · Stages +${stages}` : ""} · ${driverResult.pointsEarned} pts (projected)`;
            } else {
              pointsBreakdown = `P${driverResult.finishingPosition}${stages > 0 ? ` · Stages +${stages}` : ""} = ${driverResult.pointsEarned} pts`;
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
  );
}

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
  const [stagePointsMap, setStagePointsMap] = useState<Map<number, LiveStagePoints>>(new Map());
  const [picksHidden, setPicksHidden] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [positionDeltas, setPositionDeltas] = useState<Map<number, number>>(new Map());
  const positionsRef = useRef<Map<number, number>>(new Map());

  // Restore the preferred view mode
  useEffect(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    if (saved === "table" || saved === "cards") setViewMode(saved);
  }, []);

  const changeViewMode = (mode: "cards" | "table") => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  };

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

            // Compute position changes since the previous poll
            const deltas = new Map<number, number>();
            liveLapData.runningPositions.forEach((pos, driverId) => {
              const before = positionsRef.current.get(driverId);
              if (before !== undefined && before !== pos) {
                deltas.set(driverId, before - pos); // positive = positions gained
              }
            });
            setPositionDeltas(deltas);
            positionsRef.current = liveLapData.runningPositions;
          }
        }

        if (liveStagePoints) {
          setStagePointsMap(liveStagePoints);
        }

        // Fetch all user picks for this race via API.
        // The API hides everyone's picks until the race starts (green flag).
        const picksRes = await fetch(`/api/race-picks?raceId=${raceId}`);
        const picksData = picksRes.ok ? await picksRes.json() : { picks: [] };

        if (picksData.picksHidden) {
          setPicksHidden(true);
          setResults([]);
          setLoading(false);
          return;
        }
        setPicksHidden(false);

        const picks = picksData.picks || [];

        if (picks.length === 0) {
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
    <MotionConfig reducedMotion="user">
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <Button asChild variant="ghost" size="sm">
          <Link href="/schedule">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Schedule
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          {!isLive && (
            <Button asChild size="sm">
              <Link href={`/picks?raceId=${raceId}`}>
                <PencilLine className="h-4 w-4 mr-1" />
                Make/Edit Picks
              </Link>
            </Button>
          )}
          {!picksHidden && results.length > 0 && (
            <div className="flex rounded-md border overflow-hidden">
              <button
                type="button"
                onClick={() => changeViewMode("cards")}
                className={`p-2 ${viewMode === "cards" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}
                aria-label="Card view"
                title="Card view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => changeViewMode("table")}
                className={`p-2 ${viewMode === "table" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}
                aria-label="Table view"
                title="Table view"
              >
                <Table2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6">
        {isLive ? <Radio className="h-6 w-6 animate-pulse text-red-500" /> : <Trophy className="h-6 w-6" />}
        <h1 className="text-2xl font-bold">{isLive ? "Live Race" : "Race Results"}</h1>
        {isLive && (
          <Badge className="bg-red-600 animate-pulse">LIVE</Badge>
        )}
      </div>

      <Card className="mb-6">
        <CardHeader>
          {race.trackId && (
            <div className="inline-flex items-center mb-3">
              <img
                src={getTrackImageUrl(race.trackId)}
                alt={`${race.track} logo`}
                className="h-12 object-contain rounded dark:invert dark:hue-rotate-180"
                onError={(e) => {
                  (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                }}
              />
            </div>
          )}
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
                <div className={`p-3 rounded border ${flagBorder} bg-card ${flagState === 2 ? "caution-stripes" : ""} ${flagState === 4 ? "red-flag-pulse" : ""}`}>
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

      {picksHidden ? (
        <Card>
          <CardContent className="text-center py-10">
            <EyeOff className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="font-semibold mb-1">Picks are hidden until the green flag</p>
            <p className="text-sm text-muted-foreground mb-4">
              Everyone's picks will be revealed once the race starts.
            </p>
            <Button asChild>
              <Link href={`/picks?raceId=${raceId}`}>
                <PencilLine className="h-4 w-4 mr-1" />
                Make/Edit Your Picks
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : results.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No picks found for this race</p>
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        <ResultsTable
          results={results}
          drivers={drivers}
          race={race}
          stagePointsMap={stagePointsMap}
        />
      ) : (
        <div className="space-y-3">
          {results.map((result, index) => (
            <motion.div
              key={result.userId}
              layout
              transition={{ type: "spring", stiffness: 350, damping: 32 }}
            >
              <UserResultCard
                result={result}
                index={index}
                isLive={isLive}
                race={race}
                drivers={drivers}
                stagePointsMap={stagePointsMap}
                positionDeltas={positionDeltas}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
    </MotionConfig>
  );
}
