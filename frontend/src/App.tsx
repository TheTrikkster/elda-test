import { useEffect, useState } from 'react';
import { MapView } from './components/MapView';
import { Sidebar } from './components/Sidebar';
import { useLiveMachines } from './hooks/useLiveMachines';
import { api } from './lib/api';
import type { DistanceInZone, Zone } from './types';

export default function App() {
  const { machines, positions, liveTrails, connected } = useLiveMachines();
  const [zone, setZone] = useState<Zone | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inZoneIds, setInZoneIds] = useState<Set<string>>(new Set());
  const [distance, setDistance] = useState<DistanceInZone | null>(null);

  // Load the test zone once.
  useEffect(() => {
    api
      .zones()
      .then((zones) => setZone(zones[0] ?? null))
      .catch((err) => console.error('Failed to load zones', err));
  }, []);

  // Poll "machines currently in zone" (ST_Within) to reflect live movement.
  useEffect(() => {
    if (!zone) return;
    let active = true;
    const refresh = () =>
      api
        .machinesInZone(zone.id)
        .then((rows) => active && setInZoneIds(new Set(rows.map((r) => r.id))))
        .catch(() => undefined);
    refresh();
    const t = setInterval(refresh, 2000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [zone]);

  // Distance-in-zone for the selected machine, refreshed as it keeps moving.
  useEffect(() => {
    if (!zone || !selectedId) {
      setDistance(null);
      return;
    }
    let active = true;
    const refresh = () =>
      api
        .distanceInZone(selectedId, zone.id)
        .then((d) => active && setDistance(d))
        .catch(() => undefined);
    refresh();
    const t = setInterval(refresh, 3000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [zone, selectedId]);

  const onSelect = (id: string) =>
    setSelectedId((cur) => (cur === id ? null : id));

  return (
    <div className="flex h-full w-full">
      <Sidebar
        machines={machines}
        connected={connected}
        selectedId={selectedId}
        inZoneIds={inZoneIds}
        distance={distance}
        zoneName={zone?.name ?? null}
        onSelect={onSelect}
      />
      <main className="relative flex-1">
        <MapView
          machines={machines}
          positions={positions}
          liveTrails={liveTrails}
          zone={zone}
          selectedId={selectedId}
          inZoneIds={inZoneIds}
          distance={distance}
          onSelect={onSelect}
        />
      </main>
    </div>
  );
}
