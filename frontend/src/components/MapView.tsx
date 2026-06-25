import { useMemo } from 'react';
import { Layer, Map, Marker, Source } from 'react-map-gl/mapbox';
import type { DistanceInZone, Machine, Position, Zone } from '../types';

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

// Briançon / Serre Chevalier
const INITIAL_VIEW = { longitude: 6.56, latitude: 44.92, zoom: 11.5 };

interface Props {
  machines: Machine[];
  positions: Record<string, Position>;
  liveTrails: Record<string, [number, number][]>;
  zone: Zone | null;
  selectedId: string | null;
  inZoneIds: Set<string>;
  distance: DistanceInZone | null;
  onSelect: (id: string) => void;
}

export function MapView({
  machines,
  positions,
  liveTrails,
  zone,
  selectedId,
  inZoneIds,
  distance,
  onSelect,
}: Props) {
  const trailsGeojson = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: Object.entries(liveTrails)
        .filter(([, coords]) => coords.length > 1)
        .map(([id, coords]) => ({
          type: 'Feature',
          properties: { id, selected: id === selectedId },
          geometry: { type: 'LineString', coordinates: coords },
        })),
    }),
    [liveTrails, selectedId],
  );

  if (!TOKEN) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100 p-8 text-center text-slate-600">
        <div>
          <p className="text-lg font-semibold">Token Mapbox manquant</p>
          <p className="mt-2 text-sm">
            Renseigne <code>VITE_MAPBOX_TOKEN</code> dans <code>frontend/.env</code>{' '}
            (token public gratuit sur account.mapbox.com).
          </p>
        </div>
      </div>
    );
  }

  return (
    <Map
      mapboxAccessToken={TOKEN}
      initialViewState={INITIAL_VIEW}
      mapStyle="mapbox://styles/mapbox/outdoors-v12"
      style={{ width: '100%', height: '100%' }}
    >
      {/* Test zone polygon */}
      {zone && (
        <Source id="zone" type="geojson" data={zone.geometry}>
          <Layer
            id="zone-fill"
            type="fill"
            paint={{ 'fill-color': '#2563eb', 'fill-opacity': 0.1 }}
          />
          <Layer
            id="zone-line"
            type="line"
            paint={{ 'line-color': '#2563eb', 'line-width': 2, 'line-dasharray': [2, 1] }}
          />
        </Source>
      )}

      {/* Live trails for every machine */}
      <Source id="trails" type="geojson" data={trailsGeojson}>
        <Layer
          id="trails-line"
          type="line"
          paint={{
            'line-color': ['case', ['get', 'selected'], '#dc2626', '#64748b'],
            'line-width': ['case', ['get', 'selected'], 4, 2],
            'line-opacity': 0.8,
          }}
        />
      </Source>

      {/* Clipped trajectory inside the zone (distance query result) */}
      {distance?.geometry && (
        <Source id="distance" type="geojson" data={distance.geometry}>
          <Layer
            id="distance-line"
            type="line"
            paint={{ 'line-color': '#16a34a', 'line-width': 5, 'line-opacity': 0.9 }}
          />
        </Source>
      )}

      {/* Machine markers */}
      {machines.map((m) => {
        const pos = positions[m.id];
        if (!pos) return null;
        const inZone = inZoneIds.has(m.id);
        const selected = m.id === selectedId;
        return (
          <Marker
            key={m.id}
            longitude={pos.lng}
            latitude={pos.lat}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onSelect(m.id);
            }}
          >
            <div
              title={m.name}
              className={[
                'flex cursor-pointer items-center justify-center rounded-full border-2 text-[10px] font-bold text-white shadow transition-all',
                selected ? 'h-6 w-6' : 'h-4 w-4',
                inZone ? 'bg-green-600 border-white' : 'bg-slate-700 border-white',
              ].join(' ')}
            >
              {selected ? m.name.replace('Dameuse ', '')[0] : ''}
            </div>
          </Marker>
        );
      })}
    </Map>
  );
}
