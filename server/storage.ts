import { 
  Machine, InsertMachine,
  Station, InsertStation, 
  GaugeType, InsertGaugeType,
  Gauge, InsertGauge, 
  Staff, InsertStaff, 
  Reading, InsertReading,
  User, InsertUser,
  machines, stations, gaugeTypes, gauges, staff, readings, users
} from "@shared/schema";

// Helper function to ensure date values are stored as strings
const dateToString = (date: Date | string): string => {
  if (typeof date === 'string') return date;
  return date.toISOString();
};

// Import interface definitions from schema
import { ReadingWithDetails, StationWithGauges, MachineWithStations, GaugeWithType } from "@shared/schema";

export interface IStorage {
  // Machines
  getMachine(id: number): Promise<Machine | undefined>;
  getAllMachines(): Promise<Machine[]>;
  createMachine(machine: InsertMachine): Promise<Machine>;
  updateMachine(id: number, machine: InsertMachine): Promise<Machine>;
  deleteMachine(id: number): Promise<void>;
  getMachineWithStations(id: number): Promise<MachineWithStations | undefined>;
  getAllMachinesWithStations(): Promise<MachineWithStations[]>;
  
  // Stations
  getStation(id: number): Promise<Station | undefined>;
  getAllStations(): Promise<Station[]>;
  createStation(station: InsertStation): Promise<Station>;
  updateStation(id: number, station: InsertStation): Promise<Station>;
  deleteStation(id: number): Promise<void>;
  getStationWithGauges(id: number): Promise<StationWithGauges | undefined>;
  getAllStationsWithGauges(): Promise<StationWithGauges[]>;
  
  // Gauge Types
  getGaugeType(id: number): Promise<GaugeType | undefined>;
  getAllGaugeTypes(): Promise<GaugeType[]>;
  createGaugeType(gaugeType: InsertGaugeType): Promise<GaugeType>;
  updateGaugeType(id: number, gaugeType: Partial<InsertGaugeType>): Promise<GaugeType>;
  deleteGaugeType(id: number): Promise<void>;
  
  // Gauges
  getGauge(id: number): Promise<GaugeWithType | undefined>;
  getGaugesByStation(stationId: number): Promise<GaugeWithType[]>;
  createGauge(gauge: InsertGauge): Promise<Gauge>;
  updateGauge(id: number, gauge: Partial<InsertGauge>): Promise<Gauge>;
  deleteGauge(id: number): Promise<void>;
  updateGaugeReading(id: number, value: number, timestamp: string): Promise<Gauge>;
  
  // Staff
  getStaff(id: number): Promise<Staff | undefined>;
  getAllStaff(): Promise<Staff[]>;
  createStaff(staff: InsertStaff): Promise<Staff>;
  
  // Readings
  getReading(id: number): Promise<Reading | undefined>;
  getReadingsByStation(stationId: number): Promise<ReadingWithDetails[]>;
  getReadingsByGauge(gaugeId: number): Promise<ReadingWithDetails[]>;
  createReading(reading: InsertReading): Promise<Reading>;
  getAllReadingsWithDetails(): Promise<ReadingWithDetails[]>;
  
  // User Authentication
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  updateUserPassword(id: number, hashedPassword: string): Promise<User>;
  
  // Initialize test data
  initializeTestData(): Promise<void>;
}

export class MemStorage implements IStorage {
  private machines: Map<number, Machine>;
  private stations: Map<number, Station>;
  private gauges: Map<number, Gauge>;
  private gaugeTypes: Map<number, GaugeType>;
  private staffMembers: Map<number, Staff>;
  private readingRecords: Map<number, Reading>;
  private users: Map<number, User>;
  
  private machineCurrentId: number;
  private stationCurrentId: number;
  private gaugeCurrentId: number;
  private gaugeTypeCurrentId: number;
  private staffCurrentId: number;
  private readingCurrentId: number;
  private userCurrentId: number;

  constructor() {
    this.machines = new Map();
    this.stations = new Map();
    this.gauges = new Map();
    this.gaugeTypes = new Map();
    this.staffMembers = new Map();
    this.readingRecords = new Map();
    this.users = new Map();
    
    this.machineCurrentId = 1;
    this.stationCurrentId = 1;
    this.gaugeCurrentId = 1;
    this.gaugeTypeCurrentId = 1;
    this.staffCurrentId = 1;
    this.readingCurrentId = 1;
    this.userCurrentId = 1;
  }

  // Machine methods
  async getMachine(id: number): Promise<Machine | undefined> {
    return this.machines.get(id);
  }

  async getAllMachines(): Promise<Machine[]> {
    return Array.from(this.machines.values());
  }

  async createMachine(machine: InsertMachine): Promise<Machine> {
    const id = this.machineCurrentId++;
    const newMachine: Machine = { 
      id, 
      name: machine.name,
      machineNo: machine.machineNo,
      status: machine.status
    };
    this.machines.set(id, newMachine);
    return newMachine;
  }

  async updateMachine(id: number, machineData: InsertMachine): Promise<Machine> {
    const existingMachine = this.machines.get(id);
    if (!existingMachine) {
      throw new Error(`Machine with id ${id} not found`);
    }
    
    const updatedMachine: Machine = {
      ...existingMachine,
      name: machineData.name,
      machineNo: machineData.machineNo,
      status: machineData.status
    };
    this.machines.set(id, updatedMachine);
    return updatedMachine;
  }

  async deleteMachine(id: number): Promise<void> {
    this.machines.delete(id);
  }

  async getMachineWithStations(id: number): Promise<MachineWithStations | undefined> {
    const machine = this.machines.get(id);
    if (!machine) {
      return undefined;
    }

    const machineStations = Array.from(this.stations.values())
      .filter(station => station.machineId === id);
    
    const stationsWithGauges: StationWithGauges[] = machineStations.map(station => ({
      ...station,
      gauges: Array.from(this.gauges.values()).filter(gauge => gauge.stationId === station.id)
    }));

    return {
      ...machine,
      stations: stationsWithGauges
    };
  }

  async getAllMachinesWithStations(): Promise<MachineWithStations[]> {
    const machines = Array.from(this.machines.values());
    const machinesWithStations: MachineWithStations[] = [];

    for (const machine of machines) {
      const machineStations = Array.from(this.stations.values())
        .filter(station => station.machineId === machine.id);
      
      const stationsWithGauges: StationWithGauges[] = machineStations.map(station => ({
        ...station,
        gauges: Array.from(this.gauges.values()).filter(gauge => gauge.stationId === station.id)
      }));

      machinesWithStations.push({
        ...machine,
        stations: stationsWithGauges
      });
    }

    return machinesWithStations;
  }

  // Station methods
  async getStation(id: number): Promise<Station | undefined> {
    return this.stations.get(id);
  }

  async getAllStations(): Promise<Station[]> {
    return Array.from(this.stations.values());
  }

  async createStation(station: InsertStation): Promise<Station> {
    const id = this.stationCurrentId++;
    const newStation: Station = { 
      id, 
      machineId: station.machineId,
      name: station.name,
      description: station.description || null
    };
    this.stations.set(id, newStation);
    return newStation;
  }

  async updateStation(id: number, stationData: InsertStation): Promise<Station> {
    const existingStation = this.stations.get(id);
    if (!existingStation) {
      throw new Error("Station not found");
    }
    
    const updatedStation: Station = {
      ...existingStation,
      machineId: stationData.machineId,
      name: stationData.name,
      description: stationData.description || null
    };
    this.stations.set(id, updatedStation);
    return updatedStation;
  }

  async deleteStation(id: number): Promise<void> {
    const station = this.stations.get(id);
    if (!station) {
      throw new Error("Station not found");
    }
    
    // Delete all gauges associated with this station
    const stationGauges = Array.from(this.gauges.values()).filter(g => g.stationId === id);
    for (const gauge of stationGauges) {
      this.gauges.delete(gauge.id);
    }
    
    // Delete all readings associated with this station
    const stationReadings = Array.from(this.readingRecords.values()).filter(r => r.stationId === id);
    for (const reading of stationReadings) {
      this.readingRecords.delete(reading.id);
    }
    
    // Delete the station
    this.stations.delete(id);
  }

  async getStationWithGauges(id: number): Promise<StationWithGauges | undefined> {
    const station = await this.getStation(id);
    if (!station) return undefined;
    
    const stationGauges = await this.getGaugesByStation(id);
    return {
      ...station,
      gauges: stationGauges
    };
  }

  async getAllStationsWithGauges(): Promise<StationWithGauges[]> {
    const stations = await this.getAllStations();
    const stationsWithGauges = await Promise.all(
      stations.map(async (station) => {
        const gauges = await this.getGaugesByStation(station.id);
        return {
          ...station,
          gauges
        };
      })
    );
    return stationsWithGauges;
  }

  // Gauge methods
  async getGauge(id: number): Promise<GaugeWithType | undefined> {
    const gauge = this.gauges.get(id);
    if (!gauge) return undefined;
    
    const gaugeType = this.gaugeTypes.get(gauge.gaugeTypeId);
    if (!gaugeType) return undefined;
    
    return { ...gauge, gaugeType };
  }

  async getGaugesByStation(stationId: number): Promise<GaugeWithType[]> {
    const gauges = Array.from(this.gauges.values())
      .filter(gauge => gauge.stationId === stationId);
    
    return gauges.map(gauge => {
      const gaugeType = this.gaugeTypes.get(gauge.gaugeTypeId);
      return { ...gauge, gaugeType: gaugeType! };
    }).filter(gauge => gauge.gaugeType);
  }

  async createGauge(gauge: InsertGauge): Promise<Gauge> {
    const id = this.gaugeCurrentId++;
    const newGauge: Gauge = { 
      id, 
      name: gauge.name,
      stationId: gauge.stationId,
      type: gauge.type,
      unit: gauge.unit,
      minValue: gauge.minValue,
      maxValue: gauge.maxValue,
      currentReading: gauge.currentReading || 0,
      lastChecked: gauge.lastChecked || new Date().toISOString(),
      step: gauge.step || 1
    };
    this.gauges.set(id, newGauge);
    return newGauge;
  }

  async updateGauge(id: number, gaugeData: Partial<InsertGauge>): Promise<Gauge> {
    const existingGauge = this.gauges.get(id);
    if (!existingGauge) {
      throw new Error("Gauge not found");
    }
    
    const updatedGauge: Gauge = {
      ...existingGauge,
      ...gaugeData
    };
    this.gauges.set(id, updatedGauge);
    return updatedGauge;
  }

  async deleteGauge(id: number): Promise<void> {
    const gauge = this.gauges.get(id);
    if (!gauge) {
      throw new Error("Gauge not found");
    }
    
    // Delete all readings associated with this gauge
    const gaugeReadings = Array.from(this.readingRecords.values()).filter(r => r.gaugeId === id);
    for (const reading of gaugeReadings) {
      this.readingRecords.delete(reading.id);
    }
    
    // Delete the gauge
    this.gauges.delete(id);
  }

  async updateGaugeReading(id: number, value: number, timestamp: string): Promise<Gauge> {
    const gauge = await this.getGauge(id);
    if (!gauge) {
      throw new Error(`Gauge with ID ${id} not found`);
    }
    
    const updatedGauge: Gauge = {
      ...gauge,
      currentReading: value,
      lastChecked: timestamp
    };
    
    this.gauges.set(id, updatedGauge);
    return updatedGauge;
  }

  // Gauge Type methods
  async getGaugeType(id: number): Promise<GaugeType | undefined> {
    return this.gaugeTypes.get(id);
  }

  async getAllGaugeTypes(): Promise<GaugeType[]> {
    return Array.from(this.gaugeTypes.values());
  }

  async createGaugeType(gaugeType: InsertGaugeType): Promise<GaugeType> {
    const id = this.gaugeTypeCurrentId++;
    const newGaugeType: GaugeType = { 
      id, 
      ...gaugeType
    };
    this.gaugeTypes.set(id, newGaugeType);
    return newGaugeType;
  }

  async updateGaugeType(id: number, gaugeTypeData: Partial<InsertGaugeType>): Promise<GaugeType> {
    const existingGaugeType = this.gaugeTypes.get(id);
    if (!existingGaugeType) {
      throw new Error(`Gauge type with id ${id} not found`);
    }
    
    const updatedGaugeType: GaugeType = {
      ...existingGaugeType,
      ...gaugeTypeData
    };
    this.gaugeTypes.set(id, updatedGaugeType);
    return updatedGaugeType;
  }

  async deleteGaugeType(id: number): Promise<void> {
    this.gaugeTypes.delete(id);
  }

  // Staff methods
  async getStaff(id: number): Promise<Staff | undefined> {
    return this.staffMembers.get(id);
  }

  async getAllStaff(): Promise<Staff[]> {
    return Array.from(this.staffMembers.values());
  }

  async createStaff(staffData: InsertStaff): Promise<Staff> {
    const id = this.staffCurrentId++;
    const newStaff: Staff = { id, ...staffData };
    this.staffMembers.set(id, newStaff);
    return newStaff;
  }

  // Reading methods
  async getReading(id: number): Promise<Reading | undefined> {
    return this.readingRecords.get(id);
  }

  async getReadingsByStation(stationId: number): Promise<ReadingWithDetails[]> {
    const stationReadings = Array.from(this.readingRecords.values())
      .filter(reading => reading.stationId === stationId);
    
    return Promise.all(stationReadings.map(async reading => {
      return this.enrichReadingWithDetails(reading);
    }));
  }

  async getReadingsByGauge(gaugeId: number): Promise<ReadingWithDetails[]> {
    const gaugeReadings = Array.from(this.readingRecords.values())
      .filter(reading => reading.gaugeId === gaugeId);
    
    return Promise.all(gaugeReadings.map(async reading => {
      return this.enrichReadingWithDetails(reading);
    }));
  }

  async createReading(readingData: InsertReading): Promise<Reading> {
    const id = this.readingCurrentId++;
    const newReading: Reading = { 
      id, 
      stationId: readingData.stationId,
      gaugeId: readingData.gaugeId,
      value: readingData.value,
      timestamp: readingData.timestamp || new Date().toISOString(),
      staffId: readingData.staffId || null,
      imageUrl: readingData.imageUrl || null
    };
    this.readingRecords.set(id, newReading);
    return newReading;
  }

  async getAllReadingsWithDetails(): Promise<ReadingWithDetails[]> {
    const allReadings = Array.from(this.readingRecords.values());
    
    return Promise.all(allReadings.map(async reading => {
      return this.enrichReadingWithDetails(reading);
    }));
  }

  // Helper method to enrich a reading with station, gauge, and staff details
  private async enrichReadingWithDetails(reading: Reading): Promise<ReadingWithDetails> {
    const station = await this.getStation(reading.stationId);
    const gauge = await this.getGauge(reading.gaugeId);
    const staffMember = reading.staffId ? await this.getStaff(reading.staffId) : undefined;
    
    return {
      ...reading,
      stationName: station?.name || 'Unknown Station',
      gaugeName: gauge?.name || 'Unknown Gauge',
      unit: gauge?.unit || '',
      minValue: gauge?.minValue || 0,
      maxValue: gauge?.maxValue || 0,
      staffName: staffMember?.name || 'Unknown Staff'
    };
  }

  // User authentication methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      user => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(userData: InsertUser): Promise<User> {
    // Check if username already exists (case insensitive)
    const existingUser = await this.getUserByUsername(userData.username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    const id = this.userCurrentId++;
    const newUser: User = {
      id,
      username: userData.username.toLowerCase(),
      password: userData.password,
      isAdmin: userData.isAdmin || false,
      createdAt: new Date()
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      throw new Error("User not found");
    }
    
    const updatedUser: User = {
      ...existingUser,
      ...userData
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<void> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error("User not found");
    }
    this.users.delete(id);
  }

  async updateUserPassword(id: number, hashedPassword: string): Promise<User> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      throw new Error("User not found");
    }
    
    const updatedUser: User = {
      ...existingUser,
      password: hashedPassword
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Initialize test data for the application
  async initializeTestData(): Promise<void> {
    // Only initialize if we don't have any data yet
    if (this.stations.size > 0) {
      return;
    }

    // Create default admin user
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('Itp@2t@n@', 10);
    await this.createUser({
      username: 'admin',
      password: hashedPassword,
      isAdmin: true
    });

    // Create machines first
    const machine1 = await this.createMachine({
      name: 'Production Line A',
      machineNo: 'M001',
      status: 'RUNNING'
    });
    
    const machine2 = await this.createMachine({
      name: 'Production Line B',
      machineNo: 'M002',
      status: 'RUNNING'
    });

    // Create staff members
    const staff1 = await this.createStaff({ name: 'John Doe' });
    const staff2 = await this.createStaff({ name: 'Jane Smith' });

    // Create stations with machine assignments
    const stationConfigs = [
      { name: "Assembly Line", machineId: machine1.id },
      { name: "Heating Unit", machineId: machine1.id },
      { name: "Cooling System", machineId: machine1.id },
      { name: "Packaging Line", machineId: machine1.id },
      { name: "Mixing Vat", machineId: machine1.id },
      { name: "Welding Station", machineId: machine2.id },
      { name: "Paint Booth", machineId: machine2.id },
      { name: "Quality Control", machineId: machine2.id },
      { name: "Material Handling", machineId: machine2.id },
      { name: "Shipping", machineId: machine2.id }
    ];

    const stationPromises = stationConfigs.map((config, index) => {
      return this.createStation({
        name: `Station ${index + 1}: ${config.name}`,
        description: `Production station for ${config.name.toLowerCase()}`,
        machineId: config.machineId
      });
    });

    const createdStations = await Promise.all(stationPromises);

    // For each station, create 5 gauges
    for (const station of createdStations) {
      // Pressure gauge
      await this.createGauge({
        stationId: station.id,
        name: "Pressure Gauge",
        type: "pressure",
        unit: "PSI",
        minValue: 70,
        maxValue: 90,
        currentReading: Math.floor(Math.random() * 30) + 65, // Random between 65-95
        lastChecked: new Date().toISOString(),
        step: 1
      });

      // Temperature gauge
      await this.createGauge({
        stationId: station.id,
        name: "Temperature Gauge",
        type: "temperature",
        unit: "°C",
        minValue: 60,
        maxValue: 80,
        currentReading: Math.floor(Math.random() * 30) + 55, // Random between 55-85
        lastChecked: new Date().toISOString(),
        step: 0.1
      });

      // Runtime meter
      await this.createGauge({
        stationId: station.id,
        name: "Runtime Meter",
        type: "runtime",
        unit: "Hrs",
        minValue: 0,
        maxValue: 10000,
        currentReading: Math.floor(Math.random() * 5000) + 1000, // Random between 1000-6000
        lastChecked: new Date().toISOString(),
        step: 1
      });

      // Electrical power gauge
      await this.createGauge({
        stationId: station.id,
        name: "Electrical Power",
        type: "electrical_power",
        unit: "kW",
        minValue: 2,
        maxValue: 4,
        currentReading: Math.random() * 3 + 1.5, // Random between 1.5-4.5
        lastChecked: new Date().toISOString(),
        step: 0.1
      });

      // Electrical current gauge
      await this.createGauge({
        stationId: station.id,
        name: "Electrical Current",
        type: "electrical_current",
        unit: "A",
        minValue: 10,
        maxValue: 15,
        currentReading: Math.random() * 7 + 8, // Random between 8-15
        lastChecked: new Date().toISOString(),
        step: 0.1
      });
    }

    // Create some initial readings
    const gauges = await Promise.all(createdStations.map(s => this.getGaugesByStation(s.id)));
    const allGauges = gauges.flat();

    // Create readings for the past week
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    for (const gauge of allGauges) {
      // Create 3-5 random readings for each gauge
      const numReadings = Math.floor(Math.random() * 3) + 3;
      
      for (let i = 0; i < numReadings; i++) {
        const readingTime = new Date(
          oneWeekAgo.getTime() + Math.random() * (now.getTime() - oneWeekAgo.getTime())
        );
        
        // Random reading value that could be in or out of range
        let value: number;
        if (gauge.type === 'runtime') {
          value = Math.floor(Math.random() * 5000) + 1000;
        } else if (gauge.type === 'electrical_power') {
          value = Math.random() * 3 + 1.5;
        } else if (gauge.type === 'electrical_current') {
          value = Math.random() * 7 + 8;
        } else if (gauge.type === 'pressure') {
          value = Math.floor(Math.random() * 30) + 65;
        } else { // temperature
          value = Math.floor(Math.random() * 30) + 55;
        }
        
        await this.createReading({
          stationId: gauge.stationId,
          gaugeId: gauge.id,
          value,
          timestamp: readingTime.toISOString(),
          staffId: Math.random() > 0.5 ? staff1.id : staff2.id
        });
      }
    }
  }
}

import { DatabaseStorage } from "./database-storage";

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();
