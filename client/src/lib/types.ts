// Types for our application
export type MachineStatus = 'RUNNING' | 'STOP' | 'During Maintenance' | 'Out of Order';
export type GaugeCondition = 'Good condition' | 'Problem';

export interface GaugeType {
  id: number;
  name: string;
  hasUnit: boolean;
  hasMinValue: boolean;
  hasMaxValue: boolean;
  hasStep: boolean;
  hasCondition: boolean;
  hasInstruction: boolean;

  defaultUnit?: string | null;
  defaultMinValue?: number | null;
  defaultMaxValue?: number | null;
  defaultStep?: number | null;
  instruction?: string | null;
}

export interface Gauge {
  id: number;
  stationId: number;
  name: string;
  gaugeTypeId: number;
  unit?: string | null;
  minValue?: number | null;
  maxValue?: number | null;
  currentReading: number;
  lastChecked: string;
  step?: number | null;
  condition?: string | null;
  instruction?: string | null;
}

export interface GaugeWithType extends Gauge {
  gaugeType: GaugeType;
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
  gauges: GaugeWithType[];
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
  comment?: string | null;
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

export interface InsertGaugeType {
  name: string;
  hasUnit?: boolean;
  hasMinValue?: boolean;
  hasMaxValue?: boolean;
  hasStep?: boolean;
  hasCondition?: boolean;
  hasInstruction?: boolean;

  defaultUnit?: string | null;
  defaultMinValue?: number | null;
  defaultMaxValue?: number | null;
  defaultStep?: number | null;
  instruction?: string | null;
}

export interface InsertGauge {
  stationId: number;
  gaugeTypeId: number;
  name: string;
  unit?: string | null;
  minValue?: number | null;
  maxValue?: number | null;
  step?: number | null;
  condition?: string | null;
  instruction?: string | null;
}
