import { Express, Request, Response, NextFunction } from "express";
import { createServer, Server } from "http";
import { storage } from "./storage";
import { insertReadingSchema, insertUserSchema } from "@shared/schema";
import session from "express-session";
import bcrypt from "bcrypt";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up session middleware
  app.use(session({
    secret: 'factory-monitor-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
  }));

  // Initialize test data only if no stations exist yet
  const existingStations = await storage.getAllStations();
  if (existingStations.length === 0) {
    await storage.initializeTestData();
  }

  // Authentication routes
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Hash the password before storing
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      // Don't send the password back to the client
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json({
        message: "User created successfully",
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid user data", errors: error.errors });
      } else if (error.message === 'Username already exists') {
        res.status(409).json({ message: "Username already exists" });
      } else {
        res.status(500).json({ message: "Failed to create user" });
      }
    }
  });
  
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Validate required fields
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      // Find user by username
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Verify password
      const passwordMatches = await bcrypt.compare(password, user.password);
      if (!passwordMatches) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Set user in session
      req.session.userId = user.id;
      req.session.isAdmin = user.isAdmin;
      
      // Don't send the password back to the client
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({
        message: "Login successful",
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ message: "An error occurred during login" });
    }
  });
  
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logout successful" });
    });
  });
  
  app.get('/api/auth/me', async (req, res) => {
    try {
      // Check if user is logged in
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Get user data
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send the password back to the client
      const { password, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user data" });
    }
  });

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
  
  // Get readings for a specific gauge
  app.get('/api/stations/:stationId/gauges/:gaugeId/readings', async (req, res) => {
    try {
      const gaugeId = parseInt(req.params.gaugeId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      let readings = await storage.getReadingsByGauge(gaugeId);
      
      // Sort by timestamp descending (most recent first)
      readings = readings.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      // Limit results if requested
      if (limit) {
        readings = readings.slice(0, limit);
      }
      
      res.json(readings);
    } catch (error) {
      console.error("Error fetching gauge readings:", error);
      res.status(500).json({ message: "Failed to fetch gauge readings" });
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