import { pgTable, text, serial, integer, boolean, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define the stations table
export const stations = pgTable("stations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
});

// Define the gauges table with relationship to stations
export const gauges = pgTable("gauges", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").notNull().references(() => stations.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // pressure, temperature, runtime, electrical_power, electrical_current
  unit: text("unit").notNull(),
  minValue: real("min_value").notNull(),
  maxValue: real("max_value").notNull(),
  currentReading: real("current_reading").notNull().default(0),
  lastChecked: text("last_checked").notNull().default(''),
  step: real("step").default(1),
});

// Define the staff members table
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

// Define the readings table to store history of readings
export const readings = pgTable("readings", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").notNull().references(() => stations.id),
  gaugeId: integer("gauge_id").notNull().references(() => gauges.id),
  value: real("value").notNull(),
  timestamp: text("timestamp").notNull().default(''),
  staffId: integer("staff_id").references(() => staff.id),
});

// Insert schemas for validation
export const insertStationSchema = createInsertSchema(stations);
export const insertGaugeSchema = createInsertSchema(gauges);
export const insertStaffSchema = createInsertSchema(staff);
export const insertReadingSchema = createInsertSchema(readings);

// Types for insertion
export type InsertStation = z.infer<typeof insertStationSchema>;
export type InsertGauge = z.infer<typeof insertGaugeSchema>;
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type InsertReading = z.infer<typeof insertReadingSchema>;

// Types for selection
export type Station = typeof stations.$inferSelect;
export type Gauge = typeof gauges.$inferSelect;
export type Staff = typeof staff.$inferSelect;
export type Reading = typeof readings.$inferSelect;
