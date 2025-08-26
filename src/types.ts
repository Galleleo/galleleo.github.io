export interface Forklift {
  Id: number;
  Name: string;
  ModelNumber: string;
  ManufacturingDate: string;
}

export interface CommandLog {
  Id: number;
  Command: string;
  ForkliftId: number;
  Timestamp: string;
}