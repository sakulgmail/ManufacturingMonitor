import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertReadingSchema } from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize test data
  await storage.initializeTestData();

  // Get all stations with gauges
  app.get('/api/stations', async (req, res) => {
    try {
      const stations = await storage.getAllStationsWithGauges();
      res.json(stations);
    } catch (error) {
      console.error("Error fetching stations:", error);
      res.status(500).json({ message: "Failed to fetch stations" });
    }
  });

  // Get a specific station with gauges
  app.get('/api/stations/:id', async (req, res) => {
    try {
      const stationId = parseInt(req.params.id);
      const station = await storage.getStationWithGauges(stationId);
      
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      
      res.json(station);
    } catch (error) {
      console.error("Error fetching station:", error);
      res.status(500).json({ message: "Failed to fetch station" });
    }
  });

  // Get readings for a specific station
  app.get('/api/stations/:id/readings', async (req, res) => {
    try {
      const stationId = parseInt(req.params.id);
      const readings = await storage.getReadingsByStation(stationId);
      res.json(readings);
    } catch (error) {
      console.error("Error fetching readings:", error);
      res.status(500).json({ message: "Failed to fetch readings" });
    }
  });

  // Save a new reading for a gauge
  app.post('/api/stations/:stationId/gauges/:gaugeId/readings', async (req, res) => {
    try {
      const stationId = parseInt(req.params.stationId);
      const gaugeId = parseInt(req.params.gaugeId);
      
      // Validate the request body
      const readingData = insertReadingSchema.parse({
        ...req.body,
        stationId,
        gaugeId,
        staffId: 1, // For demo purposes, use a default staff member
      });
      
      const station = await storage.getStation(stationId);
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      
      const gauge = await storage.getGauge(gaugeId);
      if (!gauge) {
        return res.status(404).json({ message: "Gauge not found" });
      }
      
      // Ensure timestamp is a string
      const timestamp = typeof readingData.timestamp === 'string' 
        ? readingData.timestamp 
        : (readingData.timestamp || new Date()).toISOString();
      
      // Save the reading
      const reading = await storage.createReading({
        ...readingData,
        timestamp
      });
      
      // Update the current reading and last checked timestamp for the gauge
      await storage.updateGaugeReading(gaugeId, readingData.value, timestamp);
      
      res.status(201).json(reading);
    } catch (error) {
      console.error("Error saving reading:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid reading data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save reading" });
    }
  });

  // Get all readings (with pagination if needed)
  app.get('/api/readings', async (req, res) => {
    try {
      const readings = await storage.getAllReadingsWithDetails();
      res.json(readings);
    } catch (error) {
      console.error("Error fetching all readings:", error);
      res.status(500).json({ message: "Failed to fetch readings" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
