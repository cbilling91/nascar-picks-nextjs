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

export async function getNASCARSchedule(): Promise<NASCARRace[]> {
  try {
    const response = await fetch("https://cf.nascar.com/cacher/2026/1/schedule-feed.json");
    const data = await response.json();

    // Parse the schedule feed and extract races
    // Filter for race events (not practice/qualifying) and deduplicate by race_id
    const races = Array.isArray(data) ? data : data.races || [];
    const raceMap = new Map<number, any>();

    races.forEach((event: any) => {
      // Only include actual races (event_name = "Race")
      if (event.event_name === "Race" && event.race_id) {
        // Keep the first occurrence of each race_id
        if (!raceMap.has(event.race_id)) {
          raceMap.set(event.race_id, event);
        }
      }
    });

    return Array.from(raceMap.values()).map((race: any) => ({
      raceId: race.race_id,
      name: race.race_name,
      date: race.start_time,
      track: race.track_name,
      type: "regular", // Default type, can be enhanced with series info
    }));
  } catch (error) {
    console.error("Error fetching NASCAR schedule:", error);
    return [];
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
