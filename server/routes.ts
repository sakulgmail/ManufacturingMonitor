import { Express, Request, Response, NextFunction } from "express";
import { createServer, Server } from "http";
import { storage } from "./storage";
import { insertReadingSchema, insertUserSchema, insertStationSchema, insertGaugeSchema, insertMachineSchema, insertGaugeTypeSchema } from "@shared/schema";
import session from "express-session";
import bcrypt from "bcrypt";
import { ZodError } from "zod";
import MemoryStore from "memorystore";
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

// Extend session interface to include our custom properties
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    isAdmin?: boolean;
  }
}

// Also extend the Session interface directly  
declare module 'express-session' {
  interface Session {
    userId?: number;
    isAdmin?: boolean;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up memory session store with better persistence
  const MemStore = MemoryStore(session);
  
  // Set up session middleware with memory store
  app.use(session({
    store: new MemStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    secret: 'factory-monitor-secret-key',
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiration on activity
    cookie: { 
      secure: false, 
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      sameSite: 'lax'
    }
  }));

  // Test data initialization is handled in server/index.ts

  // Health check endpoint for container orchestration
  app.get('/api/health', (req, res) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  });

  // Public signup disabled - users must be created by administrators
  app.post('/api/auth/signup', async (req, res) => {
    res.status(403).json({ message: "Public registration is disabled. Contact an administrator for account access." });
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
      req.session.isAdmin = user.isAdmin ?? false;
      
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
    console.log('=== AUTH/ME DEBUG ===');
    console.log('Session exists:', !!req.session);
    console.log('Session userId:', req.session?.userId);
    console.log('Session isAdmin:', req.session?.isAdmin);
    console.log('Full session keys:', Object.keys(req.session || {}));
    console.log('====================');
    
    try {
      // Check if user is logged in
      if (!req.session.userId) {
        console.log('No userId in session for auth/me');
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

  // User management routes (Admin only)
  app.get('/api/users', async (req, res) => {
    try {
      // Check if user is authenticated and is admin
      if (!req.session || !req.session.userId || !req.session.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const users = await storage.getAllUsers();
      // Don't send passwords in response
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/users', async (req, res) => {
    try {
      // Check if user is authenticated and is admin
      if (!req.session || !req.session.userId || !req.session.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const userData = insertUserSchema.parse(req.body);
      // Hash the password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const userWithHashedPassword = { ...userData, password: hashedPassword };
      
      const newUser = await storage.createUser(userWithHashedPassword);
      // Don't send password in response
      const { password, ...safeUser } = newUser;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof Error && error.message === "Username already exists") {
        res.status(400).json({ message: "Username already exists" });
      } else {
        res.status(500).json({ message: "Failed to create user" });
      }
    }
  });

  app.put('/api/users/:id', async (req, res) => {
    try {
      // Check if user is authenticated and is admin
      if (!req.session || !req.session.userId || !req.session.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const userId = parseInt(req.params.id);
      const userData = req.body;
      
      const updatedUser = await storage.updateUser(userId, userData);
      // Don't send password in response
      const { password, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating user:", error);
      if (error instanceof Error && error.message === "User not found") {
        res.status(404).json({ message: "User not found" });
      } else {
        res.status(500).json({ message: "Failed to update user" });
      }
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      // Check if user is authenticated and is admin
      if (!req.session || !req.session.userId || !req.session.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const userId = parseInt(req.params.id);
      
      // Prevent admin from deleting themselves
      if (userId === req.session.userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      await storage.deleteUser(userId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      if (error instanceof Error && error.message === "User not found") {
        res.status(404).json({ message: "User not found" });
      } else {
        res.status(500).json({ message: "Failed to delete user" });
      }
    }
  });

  app.put('/api/users/:id/password', async (req, res) => {
    try {
      // Check if user is authenticated and is admin
      if (!req.session || !req.session.userId || !req.session.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const userId = parseInt(req.params.id);
      const { password } = req.body;
      
      if (!password || password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const updatedUser = await storage.updateUserPassword(userId, hashedPassword);
      
      // Don't send password in response
      const { password: _, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating user password:", error);
      if (error instanceof Error && error.message === "User not found") {
        res.status(404).json({ message: "User not found" });
      } else {
        res.status(500).json({ message: "Failed to update password" });
      }
    }
  });

  // Machine routes
  app.get('/api/machines', async (req, res) => {
    try {
      const machines = await storage.getAllMachinesWithStations();
      res.json(machines);
    } catch (error) {
      console.error("Error fetching machines:", error);
      res.status(500).json({ message: "Failed to fetch machines" });
    }
  });

  app.get('/api/machines/:id', async (req, res) => {
    try {
      const machineId = parseInt(req.params.id);
      const machine = await storage.getMachineWithStations(machineId);
      
      if (!machine) {
        return res.status(404).json({ message: "Machine not found" });
      }
      
      res.json(machine);
    } catch (error) {
      console.error("Error fetching machine:", error);
      res.status(500).json({ message: "Failed to fetch machine" });
    }
  });

  app.post('/api/machines/create', async (req, res) => {
    try {
      if (!req.session?.userId || !req.session?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const machineData = insertMachineSchema.parse(req.body);
      const machine = await storage.createMachine(machineData);
      res.status(201).json(machine);
    } catch (error) {
      console.error("Error creating machine:", error);
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid machine data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create machine" });
      }
    }
  });

  app.put('/api/machines/:id', async (req, res) => {
    try {
      if (!req.session?.userId || !req.session?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const machineId = parseInt(req.params.id);
      const machineData = insertMachineSchema.parse(req.body);
      
      const machine = await storage.updateMachine(machineId, machineData);
      res.json(machine);
    } catch (error) {
      console.error("Error updating machine:", error);
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid machine data", errors: error.errors });
      } else if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json({ message: "Machine not found" });
      } else {
        res.status(500).json({ message: "Failed to update machine" });
      }
    }
  });

  app.delete('/api/machines/:id', async (req, res) => {
    try {
      if (!req.session?.userId || !req.session?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const machineId = parseInt(req.params.id);
      await storage.deleteMachine(machineId);
      res.json({ message: "Machine deleted successfully" });
    } catch (error) {
      console.error("Error deleting machine:", error);
      res.status(500).json({ message: "Failed to delete machine" });
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
      
      // Debug what we're returning
      console.log(`Readings for gauge ${gaugeId}:`, 
        readings.map(r => ({id: r.id, value: r.value, hasImage: !!r.imageUrl}))
      );
      
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



  // Save a new reading for a gauge (legacy endpoint)
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
      await storage.updateGaugeReading(gaugeId, readingData.value, readingData.timestamp || new Date().toISOString());
      
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



  // Create a new station
  app.post('/api/stations/create', async (req, res) => {
    try {
      const stationData = insertStationSchema.parse(req.body);
      const station = await storage.createStation(stationData);
      res.status(201).json(station);
    } catch (error) {
      console.error("Error creating station:", error);
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid station data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create station" });
      }
    }
  });

  // Update a station
  app.put('/api/stations/:id', async (req, res) => {
    try {
      const stationId = parseInt(req.params.id);
      const stationData = insertStationSchema.parse(req.body);
      
      const updatedStation = await storage.updateStation(stationId, stationData);
      res.status(200).json(updatedStation);
    } catch (error) {
      console.error("Error updating station:", error);
      if (error instanceof Error && error.message === "Station not found") {
        res.status(404).json({ message: "Station not found" });
      } else {
        res.status(500).json({ message: "Failed to update station" });
      }
    }
  });

  // Delete a station
  app.delete('/api/stations/:id', async (req, res) => {
    try {
      const stationId = parseInt(req.params.id);
      
      await storage.deleteStation(stationId);
      res.status(200).json({ message: "Station deleted successfully" });
    } catch (error) {
      console.error("Error deleting station:", error);
      if (error instanceof Error && error.message === "Station not found") {
        res.status(404).json({ message: "Station not found" });
      } else {
        res.status(500).json({ message: "Failed to delete station" });
      }
    }
  });

  // Get all gauges
  app.get('/api/gauges', async (req, res) => {
    try {
      const gauges = await storage.getAllGauges();
      res.json(gauges);
    } catch (error) {
      console.error("Error fetching gauges:", error);
      res.status(500).json({ message: "Failed to fetch gauges" });
    }
  });

  // Create a new gauge
  app.post('/api/gauges', async (req, res) => {
    try {
      const gaugeData = insertGaugeSchema.parse(req.body);
      const gauge = await storage.createGauge(gaugeData);
      res.status(201).json(gauge);
    } catch (error) {
      console.error("Error creating gauge:", error);
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid gauge data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create gauge" });
      }
    }
  });

  // Update a gauge
  app.put('/api/gauges/:id', async (req, res) => {
    try {
      const gaugeId = parseInt(req.params.id);
      const gaugeData = insertGaugeSchema.parse(req.body);
      
      const updatedGauge = await storage.updateGauge(gaugeId, gaugeData);
      res.status(200).json(updatedGauge);
    } catch (error) {
      console.error("Error updating gauge:", error);
      if (error instanceof Error && error.message === "Gauge not found") {
        res.status(404).json({ message: "Gauge not found" });
      } else {
        res.status(500).json({ message: "Failed to update gauge" });
      }
    }
  });

  // Delete a gauge
  app.delete('/api/gauges/:id', async (req, res) => {
    try {
      const gaugeId = parseInt(req.params.id);
      
      await storage.deleteGauge(gaugeId);
      res.status(200).json({ message: "Gauge deleted successfully" });
    } catch (error) {
      console.error("Error deleting gauge:", error);
      if (error instanceof Error && error.message === "Gauge not found") {
        res.status(404).json({ message: "Gauge not found" });
      } else {
        res.status(500).json({ message: "Failed to delete gauge" });
      }
    }
  });

  // Create a new reading 
  app.post('/api/readings', async (req, res) => {
    try {
      // Get userId from session
      const userId = req.session?.userId;
      console.log('=== READING CREATION DEBUG ===');
      console.log('Session exists:', !!req.session);
      console.log('Session ID:', req.session?.id);
      console.log('Session userId:', userId);
      console.log('Session isAdmin:', req.session?.isAdmin);
      console.log('Full session:', req.session);
      console.log('==============================');
      
      if (!userId) {
        console.error('No userId in session for reading creation');
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Handle image upload - convert Base64 to file if present
      let imageUrl = req.body.imageUrl;
      if (imageUrl && imageUrl.startsWith('data:image/')) {
        // It's a Base64 image, save it as a file
        const { saveBase64Image } = await import('./file-storage.js');
        imageUrl = await saveBase64Image(imageUrl);
        console.log('Saved image as file:', imageUrl);
      }
      
      // Validate the request body with userId
      const readingData = insertReadingSchema.parse({
        ...req.body,
        imageUrl,
        userId
      });
      
      console.log('Parsed reading data:', readingData);
      
      const station = await storage.getStation(readingData.stationId);
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      
      const gauge = await storage.getGauge(readingData.gaugeId);
      if (!gauge) {
        return res.status(404).json({ message: "Gauge not found" });
      }
      
      const reading = await storage.createReading(readingData);
      console.log('Created reading:', reading);
      
      // Update gauge current reading
      await storage.updateGaugeReading(readingData.gaugeId, readingData.value, readingData.timestamp || new Date().toISOString());
      
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

  // Get all readings with details (with pagination)
  app.get('/api/readings', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 25;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const readings = await storage.getAllReadingsWithDetailsPaginated(limit, offset);
      const totalCount = await storage.getReadingsCount();
      
      res.json({
        readings,
        totalCount,
        limit,
        offset
      });
    } catch (error) {
      console.error("Error fetching all readings:", error);
      res.status(500).json({ message: "Failed to fetch readings" });
    }
  });

  // Gauge Types API routes
  app.get('/api/gauge-types', async (req, res) => {
    try {
      const gaugeTypes = await storage.getAllGaugeTypes();
      res.json(gaugeTypes);
    } catch (error) {
      console.error("Error fetching gauge types:", error);
      res.status(500).json({ message: "Failed to fetch gauge types" });
    }
  });

  app.post('/api/gauge-types', async (req, res) => {
    // Temporarily disabled for testing
    // if (!req.session.userId || !req.session.isAdmin) {
    //   return res.status(403).json({ message: "Admin access required" });
    // }

    try {
      const validatedData = insertGaugeTypeSchema.parse(req.body);
      const newGaugeType = await storage.createGaugeType(validatedData);
      res.json(newGaugeType);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid gauge type data", errors: error.errors });
      }
      console.error("Error creating gauge type:", error);
      res.status(500).json({ message: "Failed to create gauge type" });
    }
  });

  app.put('/api/gauge-types/:id', async (req, res) => {
    // Temporarily disabled for testing
    // if (!req.session.userId || !req.session.isAdmin) {
    //   return res.status(403).json({ message: "Admin access required" });
    // }

    try {
      const gaugeTypeId = parseInt(req.params.id);
      console.log("Updating gauge type", gaugeTypeId, "with data:", req.body);
      const validatedData = insertGaugeTypeSchema.partial().parse(req.body);
      console.log("Validated data:", validatedData);
      const updatedGaugeType = await storage.updateGaugeType(gaugeTypeId, validatedData);
      console.log("Updated gauge type result:", updatedGaugeType);
      res.json(updatedGaugeType);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid gauge type data", errors: error.errors });
      }
      console.error("Error updating gauge type:", error);
      res.status(500).json({ message: "Failed to update gauge type" });
    }
  });

  app.delete('/api/gauge-types/:id', async (req, res) => {
    // Temporarily disabled for testing
    // if (!req.session.userId || !req.session.isAdmin) {
    //   return res.status(403).json({ message: "Admin access required" });
    // }

    try {
      const gaugeTypeId = parseInt(req.params.id);
      await storage.deleteGaugeType(gaugeTypeId);
      res.json({ message: "Gauge type deleted successfully" });
    } catch (error) {
      console.error("Error deleting gauge type:", error);
      res.status(500).json({ message: "Failed to delete gauge type" });
    }
  });

  // Reports endpoints
  app.get("/api/reports/run", async (req: Request, res: Response) => {
    try {
      const {
        machines = '',
        stations = '',
        gauges = '',
        dateFrom,
        dateTo,
        statusFilter = 'all',
        includeImages = 'true',
        includeComments = 'true'
      } = req.query;

      // Parse filters
      const machineIds = machines ? (machines as string).split(',').map(Number).filter(Boolean) : [];
      const stationIds = stations ? (stations as string).split(',').map(Number).filter(Boolean) : [];
      const gaugeIds = gauges ? (gauges as string).split(',').map(Number).filter(Boolean) : [];

      // Get all readings with details
      let readings = await storage.getAllReadingsWithDetails();

      // Apply filters
      if (machineIds.length > 0) {
        // Filter by machine through station relationship
        const machineStations = await storage.getAllStations();
        const validStationIds = machineStations
          .filter(station => machineIds.includes(station.machineId))
          .map(station => station.id);
        readings = readings.filter(reading => validStationIds.includes(reading.stationId));
      }

      if (stationIds.length > 0) {
        readings = readings.filter(reading => stationIds.includes(reading.stationId));
      }

      if (gaugeIds.length > 0) {
        readings = readings.filter(reading => gaugeIds.includes(reading.gaugeId));
      }

      // Date range filter
      if (dateFrom) {
        const fromDate = new Date(dateFrom as string);
        readings = readings.filter(reading => new Date(reading.timestamp) >= fromDate);
      }

      if (dateTo) {
        const toDate = new Date(dateTo as string);
        toDate.setHours(23, 59, 59, 999); // End of day
        readings = readings.filter(reading => new Date(reading.timestamp) <= toDate);
      }

      // Status filter
      if (statusFilter !== 'all') {
        readings = readings.filter(reading => {
          let isAlert = false;
          
          if (reading.gaugeType?.hasCondition) {
            isAlert = reading.value > 0;
          }
          
          if (reading.gaugeType?.hasMinValue || reading.gaugeType?.hasMaxValue) {
            let isOutOfRange = false;
            
            if (reading.gaugeType?.hasMinValue && reading.minValue != null) {
              isOutOfRange = isOutOfRange || reading.value < reading.minValue;
            }
            
            if (reading.gaugeType?.hasMaxValue && reading.maxValue != null) {
              isOutOfRange = isOutOfRange || reading.value > reading.maxValue;
            }
            
            isAlert = isOutOfRange;
          }

          return statusFilter === 'alert' ? isAlert : !isAlert;
        });
      }

      // Get machine data for report
      const allMachines = await storage.getAllMachines();
      const machineMap = new Map(allMachines.map(m => [m.id, m]));

      // Get station data
      const allStations = await storage.getAllStations();
      const stationMap = new Map(allStations.map(s => [s.id, s]));

      // Format report results
      const reportResults = readings.map(reading => {
        const station = stationMap.get(reading.stationId);
        const machine = station ? machineMap.get(station.machineId) : null;
        
        let isAlert = false;
        if (reading.gaugeType?.hasCondition) {
          isAlert = reading.value > 0;
        }
        if (reading.gaugeType?.hasMinValue || reading.gaugeType?.hasMaxValue) {
          let isOutOfRange = false;
          if (reading.gaugeType?.hasMinValue && reading.minValue != null) {
            isOutOfRange = isOutOfRange || reading.value < reading.minValue;
          }
          if (reading.gaugeType?.hasMaxValue && reading.maxValue != null) {
            isOutOfRange = isOutOfRange || reading.value > reading.maxValue;
          }
          isAlert = isOutOfRange;
        }

        return {
          id: reading.id,
          timestamp: reading.timestamp,
          machineName: machine?.name || 'Unknown',
          stationName: reading.stationName,
          gaugeName: reading.gaugeName,
          value: reading.gaugeType?.hasCondition ? (reading.condition || 'N/A') : reading.value,
          unit: reading.unit,
          status: isAlert ? 'Alert' : 'Normal',
          username: reading.username,
          ...(includeComments === 'true' && { comment: reading.comment }),
          ...(includeImages === 'true' && { imageUrl: reading.imageUrl })
        };
      });

      res.json(reportResults);
    } catch (error) {
      console.error('Error running report:', error);
      res.status(500).json({ message: "Failed to run report" });
    }
  });

  app.get("/api/reports/export", async (req: Request, res: Response) => {
    try {
      const {
        machines = '',
        stations = '',
        gauges = '',
        dateFrom,
        dateTo,
        statusFilter = 'all',
        includeImages = 'true',
        includeComments = 'true',
        format = 'excel'
      } = req.query;

      // Reuse the same filtering logic as /api/reports/run
      const machineIds = machines ? (machines as string).split(',').map(Number).filter(Boolean) : [];
      const stationIds = stations ? (stations as string).split(',').map(Number).filter(Boolean) : [];
      const gaugeIds = gauges ? (gauges as string).split(',').map(Number).filter(Boolean) : [];

      let readings = await storage.getAllReadingsWithDetails();

      // Apply the same filters as the run endpoint
      if (machineIds.length > 0) {
        const machineStations = await storage.getAllStations();
        const validStationIds = machineStations
          .filter(station => machineIds.includes(station.machineId))
          .map(station => station.id);
        readings = readings.filter(reading => validStationIds.includes(reading.stationId));
      }

      if (stationIds.length > 0) {
        readings = readings.filter(reading => stationIds.includes(reading.stationId));
      }

      if (gaugeIds.length > 0) {
        readings = readings.filter(reading => gaugeIds.includes(reading.gaugeId));
      }

      if (dateFrom) {
        const fromDate = new Date(dateFrom as string);
        readings = readings.filter(reading => new Date(reading.timestamp) >= fromDate);
      }

      if (dateTo) {
        const toDate = new Date(dateTo as string);
        toDate.setHours(23, 59, 59, 999);
        readings = readings.filter(reading => new Date(reading.timestamp) <= toDate);
      }

      if (statusFilter !== 'all') {
        readings = readings.filter(reading => {
          let isAlert = false;
          
          if (reading.gaugeType?.hasCondition) {
            isAlert = reading.value > 0;
          }
          
          if (reading.gaugeType?.hasMinValue || reading.gaugeType?.hasMaxValue) {
            let isOutOfRange = false;
            
            if (reading.gaugeType?.hasMinValue && reading.minValue != null) {
              isOutOfRange = isOutOfRange || reading.value < reading.minValue;
            }
            
            if (reading.gaugeType?.hasMaxValue && reading.maxValue != null) {
              isOutOfRange = isOutOfRange || reading.value > reading.maxValue;
            }
            
            isAlert = isOutOfRange;
          }

          return statusFilter === 'alert' ? isAlert : !isAlert;
        });
      }

      // Get additional data for formatting
      const allMachines = await storage.getAllMachines();
      const machineMap = new Map(allMachines.map(m => [m.id, m]));
      const allStations = await storage.getAllStations();
      const stationMap = new Map(allStations.map(s => [s.id, s]));

      // Create CSV content
      const headers = [
        'Timestamp',
        'Machine',
        'Station', 
        'Gauge',
        'Value',
        'Unit',
        'Status',
        'User'
      ];

      if (includeComments === 'true') headers.push('Comment');
      if (includeImages === 'true') headers.push('Image URL');

      const csvRows = [headers.join(',')];

      readings.forEach(reading => {
        const station = stationMap.get(reading.stationId);
        const machine = station ? machineMap.get(station.machineId) : null;
        
        let isAlert = false;
        if (reading.gaugeType?.hasCondition) {
          isAlert = reading.value > 0;
        }
        if (reading.gaugeType?.hasMinValue || reading.gaugeType?.hasMaxValue) {
          let isOutOfRange = false;
          if (reading.gaugeType?.hasMinValue && reading.minValue != null) {
            isOutOfRange = isOutOfRange || reading.value < reading.minValue;
          }
          if (reading.gaugeType?.hasMaxValue && reading.maxValue != null) {
            isOutOfRange = isOutOfRange || reading.value > reading.maxValue;
          }
          isAlert = isOutOfRange;
        }

        const row = [
          `"${new Date(reading.timestamp).toLocaleString()}"`,
          `"${machine?.name || 'Unknown'}"`,
          `"${reading.stationName}"`,
          `"${reading.gaugeName}"`,
          `"${reading.gaugeType?.hasCondition ? (reading.condition || 'N/A') : reading.value}"`,
          `"${reading.unit || ''}"`,
          `"${isAlert ? 'Alert' : 'Normal'}"`,
          `"${reading.username}"`
        ];

        if (includeComments === 'true') {
          row.push(`"${reading.comment || ''}"`);
        }
        if (includeImages === 'true') {
          row.push(`"${reading.imageUrl || ''}"`);
        }

        csvRows.push(row.join(','));
      });

      // Create Excel workbook with embedded images using ExcelJS
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Manufacturing Report');

      // Define columns
      const columns: any[] = [
        { header: 'Timestamp', key: 'timestamp', width: 20 },
        { header: 'Machine', key: 'machine', width: 15 },
        { header: 'Station', key: 'station', width: 20 },
        { header: 'Gauge', key: 'gauge', width: 20 },
        { header: 'Value', key: 'value', width: 12 },
        { header: 'Unit', key: 'unit', width: 10 },
        { header: 'Status', key: 'status', width: 10 },
        { header: 'User', key: 'user', width: 15 }
      ];

      if (includeComments === 'true') {
        columns.push({ header: 'Comment', key: 'comment', width: 30 });
      }

      if (includeImages === 'true') {
        columns.push({ header: 'Image', key: 'image', width: 20 });
      }

      worksheet.columns = columns;

      // Add data rows with images
      for (let i = 0; i < readings.length; i++) {
        const reading = readings[i];
        const station = stationMap.get(reading.stationId);
        const machine = station ? machineMap.get(station.machineId) : null;
        
        let isAlert = false;
        if (reading.gaugeType?.hasCondition) {
          isAlert = reading.value > 0;
        }
        if (reading.gaugeType?.hasMinValue || reading.gaugeType?.hasMaxValue) {
          let isOutOfRange = false;
          if (reading.gaugeType?.hasMinValue && reading.minValue != null) {
            isOutOfRange = isOutOfRange || reading.value < reading.minValue;
          }
          if (reading.gaugeType?.hasMaxValue && reading.maxValue != null) {
            isOutOfRange = isOutOfRange || reading.value > reading.maxValue;
          }
          isAlert = isOutOfRange;
        }

        const rowData: any = {
          timestamp: new Date(reading.timestamp).toLocaleString(),
          machine: machine?.name || 'Unknown',
          station: reading.stationName,
          gauge: reading.gaugeName,
          value: reading.gaugeType?.hasCondition ? (reading.condition || 'N/A') : reading.value,
          unit: reading.unit || '',
          status: isAlert ? 'Alert' : 'Normal',
          user: reading.username
        };

        if (includeComments === 'true') {
          rowData.comment = reading.comment || '';
        }

        if (includeImages === 'true') {
          rowData.image = reading.imageUrl ? 'Image attached' : 'No image';
        }

        const row = worksheet.addRow(rowData);
        
        // Add image if available and images are included
        if (includeImages === 'true' && reading.imageUrl) {
          try {
            let imageBuffer: Buffer;
            let extension: string;
            
            if (reading.imageUrl.startsWith('data:')) {
              // Handle base64 data URI (legacy data)
              const base64Data = reading.imageUrl.split(',')[1];
              imageBuffer = Buffer.from(base64Data, 'base64');
              
              // Determine image type from data URI
              const mimeType = reading.imageUrl.split(';')[0].split(':')[1];
              extension = mimeType.split('/')[1];
              
              console.log('Excel: Processing Base64 image, type:', extension);
            } else if (reading.imageUrl.startsWith('/uploads/')) {
              // Handle file-based image (new approach)
              const imagePath = path.join(process.cwd(), 'public', reading.imageUrl);
              
              console.log('Excel: Processing file-based image:', imagePath);
              console.log('Excel: File exists:', fs.existsSync(imagePath));
              
              if (fs.existsSync(imagePath)) {
                imageBuffer = fs.readFileSync(imagePath);
                extension = path.extname(imagePath).substring(1); // Remove the dot
                console.log('Excel: File loaded, type:', extension);
              } else {
                console.log('Excel: File not found, skipping');
                continue; // Skip this image
              }
            } else {
              console.log('Excel: Unknown image format, skipping');
              continue;
            }
            
            const imageId = workbook.addImage({
              buffer: imageBuffer,
              extension: extension as any,
            });

            // Calculate cell position for image column
            const imageColumnIndex = columns.findIndex(col => col.key === 'image');
            if (imageColumnIndex >= 0) {
              worksheet.addImage(imageId, {
                tl: { col: imageColumnIndex, row: i + 1 }, // +1 because header is row 0
                ext: { width: 100, height: 75 }
              });
              // Set row height to accommodate image
              row.height = 75;
              console.log('Excel: Image embedded successfully for reading', reading.id);
            }
          } catch (error) {
            console.error('Error adding image to Excel:', error);
            // Continue without the image
          }
        }
      }

      // Style the header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6E6FA' }
      };

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      if (format === 'pdf') {
        // Create PDF with embedded images
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];
        
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="manufacturing_report_${new Date().toISOString().split('T')[0]}.pdf"`);
          res.send(pdfBuffer);
        });

        // Add title
        doc.fontSize(20).text('Manufacturing Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(2);

        // Process each reading
        for (const reading of readings) {
          const station = stationMap.get(reading.stationId);
          const machine = station ? machineMap.get(station.machineId) : null;
          
          let isAlert = false;
          if (reading.gaugeType?.hasCondition) {
            isAlert = reading.value > 0;
          }
          if (reading.gaugeType?.hasMinValue || reading.gaugeType?.hasMaxValue) {
            let isOutOfRange = false;
            if (reading.gaugeType?.hasMinValue && reading.minValue != null) {
              isOutOfRange = isOutOfRange || reading.value < reading.minValue;
            }
            if (reading.gaugeType?.hasMaxValue && reading.maxValue != null) {
              isOutOfRange = isOutOfRange || reading.value > reading.maxValue;
            }
            isAlert = isOutOfRange;
          }

          // Add reading information
          doc.fontSize(14).fillColor('black').text(`Reading #${reading.id}`, { underline: true });
          doc.moveDown(0.5);
          
          doc.fontSize(10);
          doc.text(`Timestamp: ${new Date(reading.timestamp).toLocaleString()}`);
          doc.text(`Machine: ${machine?.name || 'Unknown'}`);
          doc.text(`Station: ${reading.stationName}`);
          doc.text(`Gauge: ${reading.gaugeName}`);
          doc.text(`Value: ${reading.gaugeType?.hasCondition ? (reading.condition || 'N/A') : reading.value}`);
          doc.text(`Unit: ${reading.unit || ''}`);
          doc.text(`Status: ${isAlert ? 'Alert' : 'Normal'}`);
          doc.text(`User: ${reading.username}`);
          
          if (includeComments === 'true' && reading.comment) {
            doc.text(`Comment: ${reading.comment}`);
          }

          // Add image if available
          if (includeImages === 'true' && reading.imageUrl) {
            try {
              let imageBuffer: Buffer;
              
              if (reading.imageUrl.startsWith('data:')) {
                // Handle base64 data URI (legacy data)
                const base64Data = reading.imageUrl.split(',')[1];
                imageBuffer = Buffer.from(base64Data, 'base64');
                console.log('PDF: Processing Base64 image for reading', reading.id);
              } else if (reading.imageUrl.startsWith('/uploads/')) {
                // Handle file-based image (new approach)
                const imagePath = path.join(process.cwd(), 'public', reading.imageUrl);
                
                console.log('PDF: Processing file-based image:', imagePath);
                console.log('PDF: File exists:', fs.existsSync(imagePath));
                
                if (fs.existsSync(imagePath)) {
                  imageBuffer = fs.readFileSync(imagePath);
                  console.log('PDF: File loaded successfully');
                } else {
                  console.log('PDF: File not found, skipping');
                  doc.text('Image: [File not found]');
                  continue;
                }
              } else {
                console.log('PDF: Unknown image format, skipping');
                doc.text('Image: [Unsupported format]');
                continue;
              }
              
              doc.moveDown(0.5);
              doc.text('Image:');
              doc.image(imageBuffer, { width: 200, height: 150 });
              console.log('PDF: Image embedded successfully for reading', reading.id);
            } catch (error) {
              console.error('PDF: Error adding image:', error);
              doc.text('Image: [Error loading image]');
            }
          }

          doc.moveDown(1);
          
          // Add page break if needed (except for last reading)
          if (readings.indexOf(reading) < readings.length - 1) {
            if (doc.y > 600) { // Check if we need a new page
              doc.addPage();
            }
          }
        }

        doc.end();
      } else {
        // Excel format (existing code)
        // Set headers for Excel download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="manufacturing_report_${new Date().toISOString().split('T')[0]}.xlsx"`);
        res.send(buffer);
      }

    } catch (error) {
      console.error('Error exporting report:', error);
      res.status(500).json({ message: "Failed to export report" });
    }
  });

  // System Settings API routes (admin only)
  app.get('/api/system-settings', async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId || !req.session?.isAdmin) {
        return res.status(401).json({ message: "Admin access required" });
      }
      
      const settings = await storage.getAllSystemSettings();
      res.json(settings);
    } catch (error) {
      console.error('Error fetching system settings:', error);
      res.status(500).json({ message: "Failed to fetch system settings" });
    }
  });

  app.get('/api/system-settings/:key', async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId || !req.session?.isAdmin) {
        return res.status(401).json({ message: "Admin access required" });
      }
      
      const setting = await storage.getSystemSetting(req.params.key);
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      
      res.json(setting);
    } catch (error) {
      console.error('Error fetching system setting:', error);
      res.status(500).json({ message: "Failed to fetch system setting" });
    }
  });

  app.post('/api/system-settings', async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId || !req.session?.isAdmin) {
        return res.status(401).json({ message: "Admin access required" });
      }
      
      const { key, value, enabled } = req.body;
      
      if (!key || !value) {
        return res.status(400).json({ message: "Key and value are required" });
      }
      
      const setting = await storage.createSystemSetting({
        key,
        value,
        enabled: enabled || false
      });
      
      res.status(201).json(setting);
    } catch (error) {
      console.error('Error creating system setting:', error);
      res.status(500).json({ message: "Failed to create system setting" });
    }
  });

  app.put('/api/system-settings/:key', async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId || !req.session?.isAdmin) {
        return res.status(401).json({ message: "Admin access required" });
      }
      
      const { value, enabled } = req.body;
      
      if (!value) {
        return res.status(400).json({ message: "Value is required" });
      }
      
      const setting = await storage.updateSystemSetting(req.params.key, value, enabled);
      res.json(setting);
    } catch (error) {
      console.error('Error updating system setting:', error);
      res.status(500).json({ message: "Failed to update system setting" });
    }
  });

  app.delete('/api/system-settings/:key', async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId || !req.session?.isAdmin) {
        return res.status(401).json({ message: "Admin access required" });
      }
      
      await storage.deleteSystemSetting(req.params.key);
      res.json({ message: "Setting deleted successfully" });
    } catch (error) {
      console.error('Error deleting system setting:', error);
      res.status(500).json({ message: "Failed to delete system setting" });
    }
  });

  // Machine Status Reset API route (admin only)
  app.post('/api/machines/reset-status', async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId || !req.session?.isAdmin) {
        return res.status(401).json({ message: "Admin access required" });
      }
      
      await storage.resetAllMachineStatus();
      res.json({ message: "All machine statuses reset to 'Require Morning Check'" });
    } catch (error) {
      console.error('Error resetting machine status:', error);
      res.status(500).json({ message: "Failed to reset machine status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}