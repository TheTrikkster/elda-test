export interface Position {
  lng: number;
  lat: number;
  recordedAt: string;
}

export interface Machine {
  id: string;
  name: string;
  lastPosition: Position | null;
}

export interface Zone {
  id: string;
  name: string;
  geometry: GeoJSON.Polygon;
}

export interface TrackResponse {
  machine: { id: string; name: string };
  points: Position[];
}

export interface DistanceInZone {
  machineId: string;
  zoneId: string;
  meters: number;
  geometry: GeoJSON.LineString | GeoJSON.MultiLineString | null;
}

/** Payload pushed by the backend over WebSocket on each move. */
export interface PositionUpdate {
  machineId: string;
  lng: number;
  lat: number;
  recordedAt: string;
}
