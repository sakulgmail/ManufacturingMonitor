import { pgTable, text, serial, integer, boolean, real, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define custom types for our application
export type GaugeType = 'pressure' | 'temperature' | 'runtime' | 'electrical_power' | 'electrical_current';
export type MachineStatus = 'RUNNING' | 'STOP' | 'During Maintenance' | 'Out of Order';

// Define the machines table
export const machines = pgTable("machines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  machineNo: text("machine_no").notNull(),
  status: text("status").notNull(), // RUNNING, STOP, During Maintenance, Out of Order
});

// Define the stations table with relationship to machines
export const stations = pgTable("stations", {
  id: serial("id").primaryKey(),
  machineId: integer("machine_id").notNull().references(() => machines.id),
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
  step: real("step"),
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
  imageUrl: text("image_url"),
});

// Insert schemas for validation
export const insertMachineSchema = createInsertSchema(machines);
export const insertStationSchema = createInsertSchema(stations);
export const insertGaugeSchema = createInsertSchema(gauges);
export const insertStaffSchema = createInsertSchema(staff);
export const insertReadingSchema = createInsertSchema(readings);

// Types for insertion
export type InsertMachine = z.infer<typeof insertMachineSchema>;
export type InsertStation = z.infer<typeof insertStationSchema>;
export type InsertGauge = z.infer<typeof insertGaugeSchema>;
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type InsertReading = z.infer<typeof insertReadingSchema>;

// Types for selection
export type Machine = typeof machines.$inferSelect;
export type Station = typeof stations.$inferSelect;
export type Gauge = typeof gauges.$inferSelect;
export type Staff = typeof staff.$inferSelect;
export type Reading = typeof readings.$inferSelect;

// Extended Reading type with additional details for the frontend
export interface ReadingWithDetails extends Reading {
  stationName: string;
  gaugeName: string;
  unit: string;
  minValue: number;
  maxValue: number;
  staffName: string;
}

// Extended Station type with gauges for the frontend
export interface StationWithGauges extends Station {
  gauges: Gauge[];
}

// Extended Machine type with stations for the frontend
export interface MachineWithStations extends Machine {
  stations: StationWithGauges[];
}

// Define the users table for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: varchar("password", { length: 100 }).notNull(),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schema for users
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });

// Types for users
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
