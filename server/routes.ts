import { Express, Request, Response, NextFunction } from "express";
import { createServer, Server } from "http";
import { storage } from "./storage";
import { insertReadingSchema, insertUserSchema, insertStationSchema, insertGaugeSchema, insertMachineSchema, insertGaugeTypeSchema } from "@shared/schema";
import session from "express-session";
import bcrypt from "bcrypt";
import { ZodError } from "zod";
import MemoryStore from "memorystore";

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

  // Save a new reading (simplified endpoint)
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
      
      // Validate the request body with userId
      const readingData = insertReadingSchema.parse({
        ...req.body,
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

  const httpServer = createServer(app);
  return httpServer;
}