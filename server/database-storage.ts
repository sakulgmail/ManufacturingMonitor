import { 
  machines,
  stations, 
  gaugeTypes,
  gauges, 
 
  readings,
  users,
  type Machine,
  type Station, 
  type GaugeType,
  type Gauge, 
 
  type Reading,
  type User,
  type InsertMachine,
  type InsertStation, 
  type InsertGaugeType,
  type InsertGauge, 
 
  type InsertReading,
  type InsertUser,
  type ReadingWithDetails, 
  type StationWithGauges,
  type MachineWithStations,
  type GaugeWithType
} from "@shared/schema";
import { IStorage } from "./storage";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  // Machines
  async getMachine(id: number): Promise<Machine | undefined> {
    const [machine] = await db.select().from(machines).where(eq(machines.id, id));
    return machine || undefined;
  }

  async getAllMachines(): Promise<Machine[]> {
    return await db.select().from(machines);
  }

  async createMachine(machine: InsertMachine): Promise<Machine> {
    const [newMachine] = await db.insert(machines).values(machine).returning();
    return newMachine;
  }

  async updateMachine(id: number, machineData: InsertMachine): Promise<Machine> {
    const [updatedMachine] = await db
      .update(machines)
      .set(machineData)
      .where(eq(machines.id, id))
      .returning();
    
    if (!updatedMachine) {
      throw new Error(`Machine with id ${id} not found`);
    }
    
    return updatedMachine;
  }

  async deleteMachine(id: number): Promise<void> {
    await db.delete(machines).where(eq(machines.id, id));
  }

  async getMachineWithStations(id: number): Promise<MachineWithStations | undefined> {
    const machine = await this.getMachine(id);
    if (!machine) {
      return undefined;
    }

    const machineStations = await db
      .select()
      .from(stations)
      .where(eq(stations.machineId, id));

    const stationsWithGauges: StationWithGauges[] = await Promise.all(
      machineStations.map(async (station) => {
        const stationGauges = await db
          .select()
          .from(gauges)
          .where(eq(gauges.stationId, station.id));
        
        return {
          ...station,
          gauges: stationGauges
        };
      })
    );

    return {
      ...machine,
      stations: stationsWithGauges
    };
  }

  async getAllMachinesWithStations(): Promise<MachineWithStations[]> {
    const allMachines = await this.getAllMachines();
    
    return await Promise.all(
      allMachines.map(async (machine) => {
        const machineWithStations = await this.getMachineWithStations(machine.id);
        return machineWithStations!;
      })
    );
  }

  // Stations
  async getStation(id: number): Promise<Station | undefined> {
    const [station] = await db.select().from(stations).where(eq(stations.id, id));
    return station || undefined;
  }

  async getAllStations(): Promise<Station[]> {
    return db.select().from(stations);
  }

  async createStation(station: InsertStation): Promise<Station> {
    const [newStation] = await db.insert(stations).values(station).returning();
    return newStation;
  }

  async updateStation(id: number, stationData: InsertStation): Promise<Station> {
    const [updatedStation] = await db
      .update(stations)
      .set(stationData)
      .where(eq(stations.id, id))
      .returning();
    
    if (!updatedStation) {
      throw new Error("Station not found");
    }
    return updatedStation;
  }

  async deleteStation(id: number): Promise<void> {
    // Delete all readings associated with this station first
    await db.delete(readings).where(eq(readings.stationId, id));
    
    // Delete all gauges associated with this station
    await db.delete(gauges).where(eq(gauges.stationId, id));
    
    // Delete the station
    const result = await db.delete(stations).where(eq(stations.id, id));
    
    if (!result.rowCount || result.rowCount === 0) {
      throw new Error("Station not found");
    }
  }

  async getStationWithGauges(id: number): Promise<StationWithGauges | undefined> {
    const station = await this.getStation(id);
    if (!station) return undefined;
    
    const stationGauges = await this.getGaugesByStation(id);
    return { ...station, gauges: stationGauges };
  }

  async getAllStationsWithGauges(): Promise<StationWithGauges[]> {
    const allStations = await this.getAllStations();
    const result: StationWithGauges[] = [];

    for (const station of allStations) {
      const stationGauges = await this.getGaugesByStation(station.id);
      result.push({ ...station, gauges: stationGauges });
    }

    return result;
  }

  // Gauge Types
  async getGaugeType(id: number): Promise<GaugeType | undefined> {
    const result = await db.select().from(gaugeTypes).where(eq(gaugeTypes.id, id));
    return result[0];
  }

  async getAllGaugeTypes(): Promise<GaugeType[]> {
    return await db.select().from(gaugeTypes);
  }

  async createGaugeType(gaugeType: InsertGaugeType): Promise<GaugeType> {
    const result = await db.insert(gaugeTypes).values(gaugeType).returning();
    if (!result[0]) {
      throw new Error("Failed to create gauge type");
    }
    return result[0];
  }

  async updateGaugeType(id: number, gaugeTypeData: Partial<InsertGaugeType>): Promise<GaugeType> {
    const result = await db.update(gaugeTypes).set(gaugeTypeData).where(eq(gaugeTypes.id, id)).returning();
    if (!result[0]) {
      throw new Error("Gauge type not found");
    }
    return result[0];
  }

  async deleteGaugeType(id: number): Promise<void> {
    const result = await db.delete(gaugeTypes).where(eq(gaugeTypes.id, id));
    if (!result.rowCount || result.rowCount === 0) {
      throw new Error("Gauge type not found");
    }
  }

  // Gauges
  async getGauge(id: number): Promise<GaugeWithType | undefined> {
    const result = await db
      .select()
      .from(gauges)
      .leftJoin(gaugeTypes, eq(gauges.gaugeTypeId, gaugeTypes.id))
      .where(eq(gauges.id, id));
    
    const row = result[0];
    if (!row) return undefined;
    
    return {
      ...row.gauges,
      gaugeType: row.gauge_types!
    };
  }

  async getAllGauges(): Promise<GaugeWithType[]> {
    const result = await db
      .select()
      .from(gauges)
      .leftJoin(gaugeTypes, eq(gauges.gaugeTypeId, gaugeTypes.id));
    
    return result.map(row => ({
      ...row.gauges,
      gaugeType: row.gauge_types!
    }));
  }

  async getGaugesByStation(stationId: number): Promise<GaugeWithType[]> {
    // Get all gauges for the station
    const stationGauges = await db.select().from(gauges).where(eq(gauges.stationId, stationId));
    
    // Enrich each gauge with its gauge type
    const result: GaugeWithType[] = [];
    for (const gauge of stationGauges) {
      const gaugeType = await this.getGaugeType(gauge.gaugeTypeId);
      if (gaugeType) {
        result.push({
          ...gauge,
          gaugeType
        });
      }
    }
    
    return result;
  }

  async createGauge(gauge: InsertGauge): Promise<Gauge> {
    const [newGauge] = await db.insert(gauges).values(gauge).returning();
    return newGauge;
  }

  async updateGauge(id: number, gaugeData: Partial<InsertGauge>): Promise<Gauge> {
    const [updatedGauge] = await db
      .update(gauges)
      .set(gaugeData)
      .where(eq(gauges.id, id))
      .returning();
    
    if (!updatedGauge) {
      throw new Error("Gauge not found");
    }
    return updatedGauge;
  }

  async deleteGauge(id: number): Promise<void> {
    // Delete all readings associated with this gauge first
    await db.delete(readings).where(eq(readings.gaugeId, id));
    
    // Delete the gauge
    const result = await db.delete(gauges).where(eq(gauges.id, id));
    
    if (!result.rowCount || result.rowCount === 0) {
      throw new Error("Gauge not found");
    }
  }

  async updateGaugeReading(id: number, value: number, timestamp: string): Promise<Gauge> {
    const [updatedGauge] = await db
      .update(gauges)
      .set({ 
        currentReading: value, 
        lastChecked: timestamp 
      })
      .where(eq(gauges.id, id))
      .returning();
    
    return updatedGauge;
  }



  // Readings
  async getReading(id: number): Promise<Reading | undefined> {
    const [reading] = await db.select().from(readings).where(eq(readings.id, id));
    return reading || undefined;
  }

  async getReadingsByStation(stationId: number): Promise<ReadingWithDetails[]> {
    const stationReadings = await db
      .select()
      .from(readings)
      .where(eq(readings.stationId, stationId))
      .orderBy(desc(readings.timestamp));

    return Promise.all(stationReadings.map(reading => this.enrichReadingWithDetails(reading)));
  }

  async getReadingsByGauge(gaugeId: number): Promise<ReadingWithDetails[]> {
    const gaugeReadings = await db
      .select()
      .from(readings)
      .where(eq(readings.gaugeId, gaugeId))
      .orderBy(desc(readings.timestamp));

    return Promise.all(gaugeReadings.map(reading => this.enrichReadingWithDetails(reading)));
  }

  async createReading(readingData: InsertReading): Promise<Reading> {
    // Ensure we have all required fields
    const dataToInsert = {
      ...readingData,
      // Set imageUrl to null if not provided
      imageUrl: readingData.imageUrl || null
    };
    
    console.log('Database createReading - Input data:', readingData);
    console.log('Database createReading - Data to insert:', dataToInsert);
    
    const [newReading] = await db.insert(readings).values(dataToInsert).returning();
    console.log('Database createReading - Created reading:', newReading);
    return newReading;
  }

  async getAllReadingsWithDetails(): Promise<ReadingWithDetails[]> {
    const allReadings = await db
      .select()
      .from(readings)
      .orderBy(desc(readings.timestamp));

    return Promise.all(allReadings.map(reading => this.enrichReadingWithDetails(reading)));
  }
  
  // User Authentication
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username.toLowerCase()));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async createUser(userData: InsertUser): Promise<User> {
    // Check if username already exists (case insensitive)
    const existingUser = await this.getUserByUsername(userData.username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    const [user] = await db
      .insert(users)
      .values({
        username: userData.username.toLowerCase(),
        password: userData.password, // Note: In a real app, we should hash this password
        isAdmin: userData.isAdmin || false
      })
      .returning();
    
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      throw new Error("User not found");
    }
    return updatedUser;
  }

  async deleteUser(id: number): Promise<void> {
    const result = await db.delete(users).where(eq(users.id, id));
    
    if (!result.rowCount || result.rowCount === 0) {
      throw new Error("User not found");
    }
  }

  async updateUserPassword(id: number, hashedPassword: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      throw new Error("User not found");
    }
    return updatedUser;
  }

  private async enrichReadingWithDetails(reading: Reading): Promise<ReadingWithDetails> {
    const [station] = await db.select().from(stations).where(eq(stations.id, reading.stationId));
    const [gauge] = await db.select().from(gauges).where(eq(gauges.id, reading.gaugeId));
    
    let username = "Unknown";
    console.log('Enriching reading with userId:', reading.userId);
    if (reading.userId) {
      const [user] = await db.select().from(users).where(eq(users.id, reading.userId));
      console.log('Found user for reading:', user);
      if (user) {
        username = user.username;
      }
    }

    return {
      ...reading,
      stationName: station ? station.name : "Unknown Station",
      gaugeName: gauge ? gauge.name : "Unknown Gauge",
      unit: gauge?.unit || "",
      minValue: gauge?.minValue || 0,
      maxValue: gauge?.maxValue || 0,
      username
    };
  }

  async initializeTestData(): Promise<void> {
    // Create machines first
    const machine1 = await this.createMachine({
      name: "Default Machine",
      machineNo: "MACH001", 
      status: "RUNNING"
    });

    // Create stations with machine references
    const station1 = await this.createStation({
      machineId: machine1.id,
      name: "Station 1: Assembly Line",
      description: "Main assembly line for product A"
    });
    
    const station2 = await this.createStation({
      machineId: machine1.id,
      name: "Station 2: Packaging",
      description: "Final packaging for finished products"
    });
    
    const station3 = await this.createStation({
      machineId: machine1.id,
      name: "Station 3: Quality Control",
      description: "Testing and quality verification"
    });
    
    const station4 = await this.createStation({
      machineId: machine1.id,
      name: "Station 4: Warehouse",
      description: "Storage and inventory management"
    });
    
    const station5 = await this.createStation({
      machineId: machine1.id,
      name: "Station 5: Maintenance",
      description: "Equipment maintenance and repairs"
    });
    
    const station6 = await this.createStation({
      machineId: machine1.id,
      name: "Station 6: Receiving",
      description: "Materials receiving and intake"
    });
    
    const station7 = await this.createStation({
      machineId: machine1.id,
      name: "Station 7: Shipping",
      description: "Product shipping and logistics"
    });
    
    const station8 = await this.createStation({
      machineId: machine1.id,
      name: "Station 8: Molding",
      description: "Plastic molding and forming"
    });
    
    const station9 = await this.createStation({
      machineId: machine1.id,
      name: "Station 9: Painting",
      description: "Surface finishing and painting"
    });
    
    const station10 = await this.createStation({
      machineId: machine1.id,
      name: "Station 10: R&D Lab",
      description: "Research and development testing"
    });



    // Get gauge types to use for test data
    const allGaugeTypes = await this.getAllGaugeTypes();
    const pressureType = allGaugeTypes.find(gt => gt.name === 'Pressure');
    const temperatureType = allGaugeTypes.find(gt => gt.name === 'Temperature');
    const runtimeType = allGaugeTypes.find(gt => gt.name === 'Runtime');
    const powerType = allGaugeTypes.find(gt => gt.name === 'Electrical Power');
    const currentType = allGaugeTypes.find(gt => gt.name === 'Electrical Current');

    // Create gauges for each station (5 gauges per station)
    // For Station 1
    const gauge1_1 = await this.createGauge({
      name: "Main Line Pressure",
      gaugeTypeId: pressureType!.id,
      unit: "PSI",
      minValue: 50,
      maxValue: 100,
      currentReading: 75,
      lastChecked: new Date().toISOString(),
      stationId: station1.id,
      step: 1
    });
    
    const gauge1_2 = await this.createGauge({
      name: "Assembly Temperature",
      gaugeTypeId: temperatureType!.id,
      unit: "°C",
      minValue: 15,
      maxValue: 30,
      currentReading: 23,
      lastChecked: new Date().toISOString(),
      stationId: station1.id,
      step: 0.5
    });
    
    const gauge1_3 = await this.createGauge({
      name: "Line Runtime",
      gaugeTypeId: runtimeType!.id,
      unit: "hours",
      minValue: 0,
      maxValue: 8000,
      currentReading: 3567,
      lastChecked: new Date().toISOString(),
      stationId: station1.id,
      step: 0.5
    });
    
    const gauge1_4 = await this.createGauge({
      name: "Power Consumption",
      gaugeTypeId: powerType!.id,
      unit: "kW",
      minValue: 5,
      maxValue: 30,
      currentReading: 15.5,
      lastChecked: new Date().toISOString(),
      stationId: station1.id,
      step: 0.1
    });
    
    const gauge1_5 = await this.createGauge({
      name: "Motor Current",
      gaugeTypeId: currentType!.id,
      unit: "A",
      minValue: 1,
      maxValue: 15,
      currentReading: 8.7,
      lastChecked: new Date().toISOString(),
      stationId: station1.id,
      step: 0.1
    });

    // For Station 2 (similar pattern for other stations)
    const gauge2_1 = await this.createGauge({
      name: "Sealing Pressure",
      gaugeTypeId: pressureType!.id,
      unit: "PSI",
      minValue: 30,
      maxValue: 80,
      currentReading: 55,
      lastChecked: new Date().toISOString(),
      stationId: station2.id,
      step: 1
    });
    
    // ... Add more gauges for each station

    // Create some sample readings
    const reading1 = await this.createReading({
      stationId: station1.id,
      gaugeId: gauge1_1.id,
      value: 78,
      timestamp: new Date().toISOString(),
      userId: 4
    });
    
    const reading2 = await this.createReading({
      stationId: station1.id,
      gaugeId: gauge1_2.id,
      value: 26,
      timestamp: new Date().toISOString(),
      userId: 4
    });
    
    // ... Add more sample readings
  }
}