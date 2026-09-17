import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  decimal,
  jsonb,
  uuid,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";

// =============================================================================
// Profiles (users)
// =============================================================================
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    displayName: text("display_name").notNull(),
    avatarUrl: text("avatar_url"),
    phoneNumber: text("phone_number"),
    textNotifications: boolean("text_notifications").default(false),
    isAdmin: boolean("is_admin").default(false),
    authToken: text("auth_token").unique(), // hashed token
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_profiles_auth_token").on(table.authToken),
  ]
);

// =============================================================================
// Seasons
// =============================================================================
export const seasons = pgTable("seasons", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull().unique(),
  entryFee: decimal("entry_fee", { precision: 10, scale: 2 }).default("30.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// =============================================================================
// Drivers
// =============================================================================
export const drivers = pgTable(
  "drivers",
  {
    id: serial("id").primaryKey(),
    nascarDriverId: integer("nascar_driver_id").notNull().unique(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    fullName: text("full_name").notNull(),
    team: text("team"),
    carNumber: text("car_number"),
    imageUrl: text("image_url"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_drivers_nascar_id").on(table.nascarDriverId),
  ]
);

// =============================================================================
// Races
// =============================================================================
export const races = pgTable(
  "races",
  {
    id: serial("id").primaryKey(),
    nascarRaceId: integer("nascar_race_id").notNull().unique(),
    seasonId: integer("season_id").references(() => seasons.id),
    raceName: text("race_name").notNull(),
    trackName: text("track_name").notNull(),
    raceDate: timestamp("race_date", { withTimezone: true }).notNull(),
    raceType: text("race_type").notNull(),
    raceNumber: integer("race_number"),
    tournamentRound: text("tournament_round"),
    isComplete: boolean("is_complete").default(false),
    resultsJson: jsonb("results_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_races_date").on(table.raceDate),
    index("idx_races_season").on(table.seasonId),
  ]
);

// =============================================================================
// Picks
// =============================================================================
export const picks = pgTable(
  "picks",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    raceId: integer("race_id")
      .notNull()
      .references(() => races.id, { onDelete: "cascade" }),
    driver1Id: integer("driver_1_id").references(() => drivers.id),
    driver2Id: integer("driver_2_id").references(() => drivers.id),
    driver3Id: integer("driver_3_id").references(() => drivers.id),
    isPublic: boolean("is_public").default(false),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("idx_picks_user_race").on(table.userId, table.raceId),
    index("idx_picks_race").on(table.raceId),
  ]
);

// =============================================================================
// User Race Results
// =============================================================================
export const userRaceResults = pgTable(
  "user_race_results",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    raceId: integer("race_id")
      .notNull()
      .references(() => races.id, { onDelete: "cascade" }),
    driver1Points: integer("driver_1_points").default(0),
    driver2Points: integer("driver_2_points").default(0),
    driver3Points: integer("driver_3_points").default(0),
    droppedDriverId: integer("dropped_driver_id").references(() => drivers.id),
    droppedDriverPoints: integer("dropped_driver_points").default(0),
    totalPoints: integer("total_points").default(0),
    weeklyWinBonus: integer("weekly_win_bonus").default(0),
    finalPoints: integer("final_points").default(0),
    isWeeklyWinner: boolean("is_weekly_winner").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_user_race_results_user_race").on(table.userId, table.raceId),
    index("idx_user_race_results_race").on(table.raceId),
    index("idx_user_race_results_user").on(table.userId),
  ]
);

// =============================================================================
// Standings
// =============================================================================
export const standings = pgTable(
  "standings",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    seasonId: integer("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    totalPoints: integer("total_points").default(0),
    weeklyWins: integer("weekly_wins").default(0),
    chaseSeed: integer("chase_seed"),
    chasePoints: integer("chase_points"),
    isEliminated: boolean("is_eliminated").default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_standings_user_season").on(table.userId, table.seasonId),
    index("idx_standings_season").on(table.seasonId),
  ]
);

// =============================================================================
// Tournament Brackets
// =============================================================================
export const tournamentBrackets = pgTable("tournament_brackets", {
  id: serial("id").primaryKey(),
  seasonId: integer("season_id")
    .notNull()
    .references(() => seasons.id, { onDelete: "cascade" }),
  round: text("round").notNull(),
  raceId: integer("race_id").references(() => races.id),
  player1Id: uuid("player_1_id").references(() => profiles.id),
  player2Id: uuid("player_2_id").references(() => profiles.id),
  winnerId: uuid("winner_id").references(() => profiles.id),
  player1Points: integer("player_1_points"),
  player2Points: integer("player_2_points"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});