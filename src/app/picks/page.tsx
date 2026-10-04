"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Flag, Check, Radio, X } from "lucide-react";
import { getNASCARSchedule, getNASCARDrivers, getLiveLapData, getTrackImageUrl, type NASCARRace, type NASCARDriver } from "@/lib/nascar-api";

function PicksContent() {
  const searchParams = useSearchParams();
  const raceId = searchParams.get("raceId") || "2";

  const [race, setRace] = useState<NASCARRace | null>(null);
  const [drivers, setDrivers] = useState<NASCARDriver[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<number[]>([]);
  const [savedDrivers, setSavedDrivers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [locked, setLocked] = useState(false);

  // Admin state: current user, the player list, and whose picks are being managed
  const [currentUser, setCurrentUser] = useState<{ id: string; display_name: string; is_admin: boolean } | null>(null);
  const [players, setPlayers] = useState<{ id: string; display_name: string }[]>([]);
  const [targetUserId, setTargetUserId] = useState(""); // "" = my own picks
  const isAdmin = !!currentUser?.is_admin;
  const targetPlayer = players.find((p) => p.id === targetUserId);
  // The race-start lock doesn't apply to admins
  const effectivelyLocked = locked && !isAdmin;

  // True when the current selection differs from what's saved in the DB
  const isDirty =
    JSON.stringify([...selectedDrivers].sort((a, b) => a - b)) !==
    JSON.stringify([...savedDrivers].sort((a, b) => a - b));

  // Shrink the sticky picks bar once it's pinned to the top of the viewport
  const [isStuck, setIsStuck] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasPicks = selectedDrivers.length > 0;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      setIsStuck(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { rootMargin: "-56px 0px 0px 0px" } // h-14 site header
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasPicks]);

  useEffect(() => {
    const loadRaceAndPicks = async () => {
      setLoading(true);
      try {
        // Fetch all races and find the one matching raceId
        const schedule = await getNASCARSchedule();
        const foundRace = schedule.find((r) => r.raceId === parseInt(raceId));
        setRace(foundRace || null);

        // Picks lock at the green flag (or at start time for race types without lap data)
        if (foundRace) {
          if (foundRace.type === "regular") {
            const lapData = await getLiveLapData(foundRace.raceId);
            setLocked(!!lapData && lapData.currentLap > 0);
          } else {
            setLocked(new Date(foundRace.date).getTime() < Date.now());
          }
        }

        // Fetch drivers
        const driversList = await getNASCARDrivers();
        setDrivers(driversList);

        // Load current user; admins also get the player list so they can
        // make or change picks on behalf of other players
        const userRes = await fetch("/api/user");
        if (userRes.ok) {
          const userData = await userRes.json();
          setCurrentUser(userData.user);
          if (userData.user?.is_admin) {
            const usersRes = await fetch("/api/admin/users");
            if (usersRes.ok) {
              const usersData = await usersRes.json();
              setPlayers(usersData.users || []);
            }
          }
        }

        // Load picks via API
        await loadUserPicks(targetUserId);
      } finally {
        setLoading(false);
      }
    };
    loadRaceAndPicks();
  }, [raceId]);

  // When an admin switches the selected player, load that player's picks
  useEffect(() => {
    if (!loading) {
      loadUserPicks(targetUserId);
    }
  }, [targetUserId]);

  const loadUserPicks = async (forUserId: string) => {
    try {
      const params = new URLSearchParams({ raceId });
      if (forUserId) params.set("userId", forUserId);
      const res = await fetch(`/api/picks?${params.toString()}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }

      const data = await res.json();
      const driverIds = data.picks
        ? [data.picks.driver_1_id, data.picks.driver_2_id, data.picks.driver_3_id].filter(Boolean)
        : [];
      setSelectedDrivers(driverIds);
      setSavedDrivers(driverIds);
    } catch (error) {
      console.error("Error loading picks:", error);
    }
    setLoading(false);
  };

  const toggleDriver = (driverId: number) => {
    setSelectedDrivers((prev) => {
      if (prev.includes(driverId)) {
        return prev.filter((id) => id !== driverId);
      } else if (prev.length < 3) {
        return [...prev, driverId];
      }
      return prev;
    });
  };

  const savePicks = async () => {
    if (selectedDrivers.length !== 3) {
      setMessage("Please select exactly 3 drivers");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raceId: parseInt(raceId),
          driver_1_id: selectedDrivers[0],
          driver_2_id: selectedDrivers[1],
          driver_3_id: selectedDrivers[2],
          // Admins: save picks on behalf of the selected player
          ...(targetUserId ? { userId: targetUserId } : {}),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessage(`Error saving picks: ${err.error}`);
      } else {
        setSavedDrivers([...selectedDrivers]);
        setMessage("Picks saved successfully!");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (error: any) {
      setMessage(error.message || "Error saving picks");
    }
    setSaving(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Flag className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Make Your Picks</h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/race?raceId=${raceId}`}>
            <Radio className="h-4 w-4 mr-1" />
            View Race
          </Link>
        </Button>
      </div>

      {isAdmin && (
        <Card className="mb-6 border-amber-500/50 bg-amber-500/10">
          <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="font-semibold text-sm">
                Admin{targetPlayer ? `: making picks for ${targetPlayer.display_name}` : ": manage picks"}
              </p>
              <p className="text-xs text-muted-foreground">
                You can make or change picks for any player, even after the race has started.
              </p>
            </div>
            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shrink-0"
            >
              <option value="">
                My picks{currentUser ? ` (${currentUser.display_name})` : ""}
              </option>
              {players
                .filter((p) => p.id !== currentUser?.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name}
                  </option>
                ))}
            </select>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          {race?.trackId && (
            <div className="inline-flex items-center mb-3">
              <img
                src={getTrackImageUrl(race.trackId)}
                alt={`${race.track} logo`}
                className="h-10 object-contain rounded dark:invert dark:hue-rotate-180"
                onError={(e) => {
                  (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                }}
              />
            </div>
          )}
          <CardTitle>{race?.name || "Race"}</CardTitle>
          <CardDescription>{race?.date && race?.track ? `${race.date} • ${race.track}` : "Loading race details..."}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Select 3 drivers for this race. Your picks will be locked at race start.
          </p>

          {message && (
            <div className="mb-4 p-3 rounded bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200 text-sm">
              {message}
            </div>
          )}

          {locked && isAdmin && (
            <div className="mb-4 p-3 rounded bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 text-sm">
              The race has started — as an admin you can still change {targetPlayer ? `${targetPlayer.display_name}'s` : "these"} picks.
            </div>
          )}

          {selectedDrivers.length > 0 && (
            <>
              {/* Sentinel: when it scrolls under the site header, the picks bar is stuck */}
              <div ref={sentinelRef} className="h-0" />

              {/* Sticky: pinned under the site header while scrolling; shrinks to a chip row when stuck */}
              <div className={`sticky top-14 z-30 bg-card -mx-6 px-6 border-b border-border/60 transition-all ${isStuck ? "py-2 mb-4" : "py-3 mb-6"}`}>
                {isStuck ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold shrink-0">
                      Picks ({selectedDrivers.length}/3)
                    </span>
                    {selectedDrivers.map((driverId) => {
                      const driver = drivers.find((d) => d.id === driverId);
                      if (!driver) return null;
                      return (
                        <button
                          key={driver.id}
                          type="button"
                          onClick={() => !effectivelyLocked && toggleDriver(driver.id)}
                          title={effectivelyLocked ? driver.name : `Remove ${driver.name}`}
                          className="flex items-center gap-1.5 bg-muted rounded-full pl-1.5 pr-2 py-1 shrink-0 group cursor-pointer"
                        >
                          {driver.badgeImage && (
                            <img
                              src={driver.badgeImage}
                              alt=""
                              className="h-5 w-5 object-contain bg-white rounded p-0.5"
                            />
                          )}
                          <span className="text-xs font-medium whitespace-nowrap">{driver.name}</span>
                          {!effectivelyLocked && (
                            <X className="h-3 w-3 text-muted-foreground group-hover:text-destructive" />
                          )}
                        </button>
                      );
                    })}
                    {!effectivelyLocked && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground ml-auto"
                        onClick={() => setSelectedDrivers([])}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold">
                        Your Picks ({selectedDrivers.length}/3)
                      </h3>
                      {!effectivelyLocked && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-muted-foreground"
                          onClick={() => setSelectedDrivers([])}
                        >
                          Clear all
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                {selectedDrivers.map((driverId) => {
                  const driver = drivers.find((d) => d.id === driverId);
                  if (!driver) return null;
                  return (
                    <button
                      key={driver.id}
                      type="button"
                      onClick={() => !effectivelyLocked && toggleDriver(driver.id)}
                      title={effectivelyLocked ? driver.name : `Remove ${driver.name}`}
                      className={`flex flex-col items-center group ${effectivelyLocked ? "cursor-default" : "cursor-pointer"}`}
                    >
                      <div className="w-full aspect-square bg-muted rounded-lg overflow-hidden mb-2 flex items-center justify-center relative">
                        {driver.firesuitImage ? (
                          <img
                            src={driver.firesuitImage}
                            alt={`${driver.name} firesuit`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-muted-foreground text-sm">No firesuit image</div>
                        )}
                        {driver.badgeImage && (
                          <img
                            src={driver.badgeImage}
                            alt={`${driver.name} badge`}
                            className="absolute top-2 left-2 h-12 w-12 object-contain bg-white rounded p-1"
                          />
                        )}
                        {!effectivelyLocked && (
                          <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity">
                            <X className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-center line-clamp-2">{driver.name}</p>
                      <p className="text-xs text-muted-foreground text-center">{driver.teamName}</p>
                    </button>
                  );
                })}
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3 mb-6">
                <Separator className="flex-1" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Choose Drivers
                </span>
                <Separator className="flex-1" />
              </div>
            </>
          )}

          {loading ? (
            <p className="text-muted-foreground">Loading your picks...</p>
          ) : effectivelyLocked ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">
                Picks are locked - the race has started.
              </p>
              <Button asChild>
                <Link href={`/race?raceId=${raceId}`}>
                  <Radio className="h-4 w-4 mr-1" />
                  Watch the Race
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                {drivers.map((driver: NASCARDriver) => (
                  <button
                    key={driver.id}
                    type="button"
                    onClick={() => toggleDriver(driver.id)}
                    className={`p-2 rounded-lg border-2 transition-all text-left flex flex-col cursor-pointer ${
                      selectedDrivers.includes(driver.id)
                        ? "border-primary bg-primary/10"
                        : "border-muted hover:border-primary/50"
                    }`}
                  >
                    <div className="w-full aspect-square bg-muted rounded overflow-hidden mb-1.5 flex items-center justify-center relative">
                      {driver.firesuitImage ? (
                        <img
                          src={driver.firesuitImage}
                          alt={`${driver.name}`}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-muted-foreground text-xs">No image</div>
                      )}
                      {driver.badgeImage && (
                        <img
                          src={driver.badgeImage}
                          alt={`${driver.name} badge`}
                          className="absolute top-1 left-1 h-10 w-10 object-contain bg-white rounded p-0.5"
                        />
                      )}
                      {selectedDrivers.includes(driver.id) && (
                        <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                          <Check className="w-8 h-8 text-primary drop-shadow" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-medium text-center line-clamp-1">{driver.name}</p>
                  </button>
                ))}
              </div>

              {/* Spacer so the sticky action bar doesn't cover the last row */}
              <div className="h-16" />

              {/* Sticky action bar: always-visible counter, clear, and submit */}
              <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
                  <div className="text-sm">
                    <span className="font-semibold">{selectedDrivers.length}</span>
                    <span className="text-muted-foreground"> / 3 selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDrivers([])}
                      disabled={selectedDrivers.length === 0 || saving}
                    >
                      Clear
                    </Button>
                    <Button
                      onClick={savePicks}
                      disabled={selectedDrivers.length !== 3 || saving}
                      size="sm"
                      className={isDirty && selectedDrivers.length === 3 ? "animate-pulse" : ""}
                    >
                      {saving
                        ? "Saving..."
                        : !isDirty && savedDrivers.length === 3
                          ? "Saved ✓"
                          : "Save Picks"}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PicksPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading...</div>}>
      <PicksContent />
    </Suspense>
  );
}