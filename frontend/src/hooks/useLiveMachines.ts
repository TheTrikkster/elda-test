import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { socket } from '../lib/socket';
import type { Machine, Position, PositionUpdate } from '../types';

const MAX_LIVE_POINTS = 200;

/**
 * Loads the machines + their last position over REST, then keeps every
 * marker's current position in sync from the `position:update` WebSocket
 * stream. Also accumulates a short "live trail" per machine for display.
 */
export function useLiveMachines() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [liveTrails, setLiveTrails] = useState<Record<string, [number, number][]>>(
    {},
  );
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    api
      .machines()
      .then((list) => {
        setMachines(list);
        const pos: Record<string, Position> = {};
        const trails: Record<string, [number, number][]> = {};
        for (const m of list) {
          if (m.lastPosition) {
            pos[m.id] = m.lastPosition;
            trails[m.id] = [[m.lastPosition.lng, m.lastPosition.lat]];
          }
        }
        setPositions(pos);
        setLiveTrails(trails);
      })
      .catch((err) => console.error('Failed to load machines', err));
  }, []);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onUpdate = (u: PositionUpdate) => {
      setPositions((prev) => ({
        ...prev,
        [u.machineId]: { lng: u.lng, lat: u.lat, recordedAt: u.recordedAt },
      }));
      setLiveTrails((prev) => {
        const trail = prev[u.machineId] ?? [];
        const next = [...trail, [u.lng, u.lat] as [number, number]];
        if (next.length > MAX_LIVE_POINTS) next.shift();
        return { ...prev, [u.machineId]: next };
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('position:update', onUpdate);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('position:update', onUpdate);
    };
  }, []);

  return { machines, positions, liveTrails, connected };
}
