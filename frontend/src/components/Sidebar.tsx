import type { DistanceInZone, Machine } from '../types';

interface Props {
  machines: Machine[];
  connected: boolean;
  selectedId: string | null;
  inZoneIds: Set<string>;
  distance: DistanceInZone | null;
  zoneName: string | null;
  onSelect: (id: string) => void;
}

export function Sidebar({
  machines,
  connected,
  selectedId,
  inZoneIds,
  distance,
  zoneName,
  onSelect,
}: Props) {
  return (
    <aside className="flex h-full w-80 flex-col gap-4 overflow-y-auto border-r border-slate-200 bg-white p-4">
      <header>
        <h1 className="text-lg font-bold text-slate-800">ELDA — Live tracking</h1>
        <div className="mt-1 flex items-center gap-2 text-xs">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              connected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-slate-500">
            {connected ? 'Temps réel connecté' : 'Déconnecté'}
          </span>
        </div>
      </header>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Dameuses
        </h2>
        <ul className="flex flex-col gap-1">
          {machines.map((m) => {
            const inZone = inZoneIds.has(m.id);
            const selected = m.id === selectedId;
            return (
              <li key={m.id}>
                <button
                  onClick={() => onSelect(m.id)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    selected
                      ? 'bg-blue-50 ring-1 ring-blue-300'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="font-medium text-slate-700">{m.name}</span>
                  {inZone && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                      dans la zone
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-lg bg-slate-50 p-3">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Requête spatiale {zoneName ? `— ${zoneName}` : ''}
        </h2>
        <p className="text-sm text-slate-600">
          <strong>{inZoneIds.size}</strong> dameuse(s) actuellement dans la zone
          <span className="text-slate-400"> (ST_Within)</span>
        </p>
        {selectedId ? (
          <p className="mt-2 text-sm text-slate-600">
            Distance parcourue dans la zone par{' '}
            <strong>{machines.find((m) => m.id === selectedId)?.name}</strong> :{' '}
            <span className="font-semibold text-green-700">
              {distance ? `${distance.meters.toFixed(0)} m` : '…'}
            </span>
            <span className="block text-xs text-slate-400">
              ST_Intersection + ST_Length (géographie)
            </span>
          </p>
        ) : (
          <p className="mt-2 text-xs text-slate-400">
            Sélectionne une dameuse pour voir sa distance dans la zone.
          </p>
        )}
      </section>

      <footer className="mt-auto text-[10px] leading-relaxed text-slate-400">
        Marqueurs verts = dans la zone · ligne rouge = trace de la dameuse
        sélectionnée · ligne verte = portion dans la zone.
      </footer>
    </aside>
  );
}
