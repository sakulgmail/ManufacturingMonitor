import { Express, Request, Response, NextFunction } from "express";
import { createServer, Server } from "http";
import { storage } from "./storage";
import { insertReadingSchema } from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize test data only if no stations exist yet
  const existingStations = await storage.getAllStations();
  if (existingStations.length === 0) {
    await storage.initializeTestData();
  }

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
  
  // Get gauges for a specific station
  app.get('/api/stations/:id/gauges', async (req, res) => {
    try {
      const stationId = parseInt(req.params.id);
      const gauges = await storage.getGaugesByStation(stationId);
      res.json(gauges);
    } catch (error) {
      console.error("Error fetching gauges:", error);
      res.status(500).json({ message: "Failed to fetch gauges" });
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
      
      const reading = await storage.createReading(readingData);
      
      // Update gauge current reading
      await storage.updateGaugeReading(gaugeId, readingData.value, readingData.timestamp);
      
      res.status(201).json(reading);
    } catch (error) {
      console.error("Error saving reading:", error);
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid reading data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to save reading" });
      }
    }
  });

  // Get all staff
  app.get('/api/staff', async (req, res) => {
    try {
      const staff = await storage.getAllStaff();
      res.json(staff);
    } catch (error) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  // Create a new reading 
  app.post('/api/readings', async (req, res) => {
    try {
      // Validate the request body
      const readingData = insertReadingSchema.parse(req.body);
      
      const station = await storage.getStation(readingData.stationId);
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      
      const gauge = await storage.getGauge(readingData.gaugeId);
      if (!gauge) {
        return res.status(404).json({ message: "Gauge not found" });
      }
      
      const reading = await storage.createReading(readingData);
      
      // Update gauge current reading
      await storage.updateGaugeReading(readingData.gaugeId, readingData.value, readingData.timestamp);
      
      res.status(201).json(reading);
    } catch (error) {
      console.error("Error saving reading:", error);
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid reading data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to save reading" });
      }
    }
  });

  // Get all readings with details
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