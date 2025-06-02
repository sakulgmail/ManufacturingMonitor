// Types for our application
export type GaugeType = 'pressure' | 'temperature' | 'runtime' | 'electrical_power' | 'electrical_current';
export type MachineStatus = 'RUNNING' | 'STOP' | 'During Maintenance' | 'Out of Order';

export interface Gauge {
  id: number;
  name: string;
  type: GaugeType;
  unit: string;
  minValue: number;
  maxValue: number;
  currentReading: number;
  lastChecked: string;
  step?: number;
}

export interface Machine {
  id: number;
  name: string;
  machineNo: string;
  status: MachineStatus;
}

export interface MachineWithStations extends Machine {
  stations: Station[];
}

export interface Station {
  id: number;
  machineId: number;
  name: string;
  description?: string | null;
  gauges: Gauge[];
}

export interface Reading {
  id: number;
  stationId: number;
  stationName: string;
  gaugeId: number;
  gaugeName: string;
  value: number;
  unit: string;
  minValue: number;
  maxValue: number;
  timestamp: string;
  staffName: string;
  imageUrl?: string | null;
}

export interface StaffMember {
  id: number;
  name: string;
}

export interface InsertReading {
  stationId: number;
  gaugeId: number;
  value: number;
  timestamp: string;
  staffId?: number | null;
  imageUrl?: string | null;
}

export interface InsertMachine {
  name: string;
  machineNo: string;
  status: MachineStatus;
}

export interface InsertStation {
  machineId: number;
  name: string;
  description?: string | null;
}

export interface InsertGauge {
  stationId: number;
  name: string;
  type: GaugeType;
  unit: string;
  minValue: number;
  maxValue: number;
  step?: number;
}
