import type { DistanceInZone, Machine, TrackResponse, Zone } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  machines: () => get<Machine[]>('/machines'),
  track: (id: string) => get<TrackResponse>(`/machines/${id}/track`),
  zones: () => get<Zone[]>('/zones'),
  machinesInZone: (zoneId: string) =>
    get<{ id: string; name: string }[]>(`/zones/${zoneId}/machines`),
  distanceInZone: (machineId: string, zoneId: string) =>
    get<DistanceInZone>(
      `/machines/${machineId}/distance-in-zone?zoneId=${zoneId}`,
    ),
};
