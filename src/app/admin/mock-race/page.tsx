"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  mockDrivers,
  mockRaceResults,
  mockPicksForRace,
  calculateMockRacePoints,
  getMockFinishingPositions,
} from "@/lib/mock/mockData";
import type { RaceState } from "@/lib/mock/raceStateManager";

const RACE_ID = "mock-race-1";

export default function MockRacePage() {
  const [raceState, setRaceState] = useState<RaceState | null>(null);
  const [simulationSpeed, setSimulationSpeed] = useState(100); // milliseconds per lap
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial race state
  useEffect(() => {
    fetchRaceState();
  }, []);

  // Auto-advance race simulation
  useEffect(() => {
    if (raceState?.isRunning && !raceState?.isComplete) {
      intervalRef.current = setInterval(async () => {
        const nextLap = (raceState.lapNumber || 0) + 1;
        if (nextLap >= 400) {
          await completeRace();
        } else {
          await updateRace(nextLap);
        }
      }, simulationSpeed);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [raceState?.isRunning, raceState?.isComplete, raceState?.lapNumber, simulationSpeed]);

  const fetchRaceState = async () => {
    try {
      const response = await fetch(`/api/mock-race/${RACE_ID}`);
      const data = await response.json();
      setRaceState(data);
    } catch (error) {
      console.error("Failed to fetch race state:", error);
    }
  };

  const performAction = async (action: string, lapNumber?: number, showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await fetch(`/api/mock-race/${RACE_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, lapNumber }),
      });
      const data = await response.json();
      setRaceState(data);
    } catch (error) {
      console.error(`Failed to ${action} race:`, error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const startRace = () => performAction("start");
  const pauseRace = () => performAction("pause");
  const resumeRace = () => performAction("resume");
  const updateRace = (lap: number) => performAction("update", lap, false); // Don't show loading for auto-updates
  const completeRace = () => performAction("complete");
  const resetRace = () => performAction("reset");

  const handleStartRace = () => {
    startRace();
  };

  const handlePauseResume = () => {
    if (raceState?.isRunning) {
      pauseRace();
    } else {
      resumeRace();
    }
  };

  const handleCompleteRace = () => {
    completeRace();
  };

  const handleReset = () => {
    resetRace();
  };

  const handleAdvanceLap = () => {
    const currentLap = raceState?.lapNumber || 0;
    updateRace(Math.min(currentLap + 10, 400));
  };

  const handleSpeedChange = (speed: number) => {
    setSimulationSpeed(speed);
  };

  if (!raceState) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center">Loading race state...</div>
      </div>
    );
  }

  const { lapNumber, totalLaps, isRunning, isComplete, positions, stage, progress } = raceState;
  const raceStarted = lapNumber > 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Mock Race Testing</h1>
        <p className="text-muted-foreground">Test pick submission, scoring, and standings functionality</p>
      </div>

      <div className="grid gap-6">
        {/* Race Status */}
        <Card>
          <CardHeader>
            <CardTitle>Race Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-lg font-semibold">
                  {!raceStarted ? "Not Started" : isComplete ? "Complete" : "In Progress"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lap</p>
                <p className="text-lg font-semibold">{lapNumber}/{totalLaps}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="text-lg font-semibold">{progress}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stage</p>
                <p className="text-lg font-semibold">{stage}</p>
              </div>
            </div>

            {raceStarted && (
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleStartRace} disabled={raceStarted || loading} variant="default">
                Start Auto Simulation
              </Button>
              <Button
                onClick={handlePauseResume}
                disabled={!raceStarted || isComplete || loading}
                variant="outline"
              >
                {isRunning ? "Pause" : "Resume"}
              </Button>
              <Button onClick={handleAdvanceLap} disabled={!raceStarted || isComplete || isRunning || loading} variant="outline">
                Advance 10 Laps
              </Button>
              <Button onClick={handleCompleteRace} disabled={!raceStarted || isComplete || loading} variant="default">
                Complete Race
              </Button>
              <Button onClick={handleReset} disabled={loading} variant="outline">
                Reset
              </Button>
            </div>

            {raceStarted && !isComplete && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Simulation Speed</p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => handleSpeedChange(50)}
                    variant={simulationSpeed === 50 ? "default" : "outline"}
                    size="sm"
                  >
                    2x Fast
                  </Button>
                  <Button
                    onClick={() => handleSpeedChange(100)}
                    variant={simulationSpeed === 100 ? "default" : "outline"}
                    size="sm"
                  >
                    Normal
                  </Button>
                  <Button
                    onClick={() => handleSpeedChange(200)}
                    variant={simulationSpeed === 200 ? "default" : "outline"}
                    size="sm"
                  >
                    Slow
                  </Button>
                  <Button
                    onClick={() => handleSpeedChange(500)}
                    variant={simulationSpeed === 500 ? "default" : "outline"}
                    size="sm"
                  >
                    Very Slow
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Leaderboard - During Race */}
        {raceStarted && !isComplete && (
          <Card>
            <CardHeader>
              <CardTitle>Live Leaderboard</CardTitle>
              <CardDescription>Current positions and projected points</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {positions.map(({ driverId, position, projectedFinishPts, earnedStagePts, totalPts }) => {
                  const driver = mockDrivers.find((d) => d.id === driverId);
                  if (!driver) return null;

                  return (
                    <div key={driverId} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="w-8 text-center">{position}</Badge>
                        <div>
                          <p className="font-semibold">#{driver.car_number} {driver.last_name}</p>
                          <p className="text-xs text-muted-foreground">{driver.team}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{totalPts} pts</p>
                        <p className="text-xs text-muted-foreground">
                          Position: {projectedFinishPts} + Stage: {earnedStagePts}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mock Drivers */}
        {!raceStarted && (
          <Card>
            <CardHeader>
              <CardTitle>Available Drivers</CardTitle>
              <CardDescription>10 drivers for testing picks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mockDrivers.map((driver) => (
                  <div key={driver.id} className="p-3 border rounded-lg">
                    <p className="font-semibold">#{driver.car_number} {driver.full_name}</p>
                    <p className="text-sm text-muted-foreground">{driver.team}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Race Results (when complete) */}
        {isComplete && (
          <Card>
            <CardHeader>
              <CardTitle>Race Results</CardTitle>
              <CardDescription>Finishing positions and points</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockDrivers.map((driver) => {
                  const position = mockRaceResults.finishingPositions[driver.id as keyof typeof mockRaceResults.finishingPositions];
                  const totalPoints = mockRaceResults.points[driver.id as keyof typeof mockRaceResults.points];
                  const stagePoints = mockRaceResults.stagePoints[driver.id as keyof typeof mockRaceResults.stagePoints];
                  const finishPoints = totalPoints - stagePoints;

                  return (
                    <div key={driver.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-semibold">#{driver.car_number} {driver.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Finish: {finishPoints} pts | Stage: {stagePoints} pts
                        </p>
                      </div>
                      <div className="flex gap-4">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Position</p>
                          <p className="text-lg font-bold">{position}th</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Total Points</p>
                          <p className="text-lg font-bold">{totalPoints}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sample Picks & Scoring */}
        {isComplete && (
          <Card>
            <CardHeader>
              <CardTitle>Sample Picks & Scoring</CardTitle>
              <CardDescription>Example calculations for testing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(mockPicksForRace).map(([userId, picks]) => {
                const totalPoints = calculateMockRacePoints(picks as number[], mockRaceResults);
                const finishPositions = getMockFinishingPositions(picks as number[], mockRaceResults);
                const combinedFinish = finishPositions.reduce((a, b) => a + b, 0);

                return (
                  <div key={userId} className="p-4 border rounded-lg space-y-2">
                    <p className="font-semibold">{userId.toUpperCase()}</p>
                    <div className="space-y-1">
                      {(picks as number[]).map((driverId, idx) => {
                        const driver = mockDrivers.find((d) => d.id === driverId);
                        const totalPoints = mockRaceResults.points[driverId as keyof typeof mockRaceResults.points];
                        const stagePoints = mockRaceResults.stagePoints[driverId as keyof typeof mockRaceResults.stagePoints];
                        const finishPoints = totalPoints - stagePoints;
                        const position = mockRaceResults.finishingPositions[driverId as keyof typeof mockRaceResults.finishingPositions];
                        return (
                          <div key={idx} className="text-sm">
                            <div className="flex justify-between">
                              <span>
                                Pick {idx + 1}: #{driver?.car_number} {driver?.last_name}
                              </span>
                              <span className="font-semibold">
                                {totalPoints} pts
                              </span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground pl-4">
                              <span>{position}th place</span>
                              <span>Finish: {finishPoints} + Stage: {stagePoints}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="pt-2 border-t flex justify-between font-semibold">
                      <span>Total Points</span>
                      <span className="text-lg">{totalPoints}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Combined Finish Position: {combinedFinish}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>1. Click <strong>Start Auto Simulation</strong> to begin the race with automatic lap progression</p>
            <p>2. Use <strong>Pause/Resume</strong> to control the simulation</p>
            <p>3. Adjust <strong>Simulation Speed</strong> to control how fast laps advance</p>
            <p>4. Click <strong>Advance 10 Laps</strong> for manual control (when paused)</p>
            <p>5. Watch positions change dynamically as the race progresses</p>
            <p>6. Click <strong>Complete Race</strong> to jump to final results</p>
            <p>7. View sample picks and scoring calculations when race is complete</p>
            <p>8. Click <strong>Reset</strong> to start over</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
