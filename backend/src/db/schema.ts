import {
  bigserial,
  customType,
  index,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

/**
 * PostGIS geometry column. Drizzle has no first-class geometry type that covers
 * polygons with an SRID, so we declare a thin custom type: it maps to the SQL
 * `geometry(...)` column created in drizzle/0000_init.sql and is read/written
 * through ST_* functions in the services. The TS side simply sees a string
 * (WKT / GeoJSON depending on the projection used in the query).
 */
const geometry = (name: string, sqlType: string) =>
  customType<{ data: string; driverData: string }>({
    dataType: () => sqlType,
  })(name);

export const machines = pgTable('machines', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const positions = pgTable(
  'positions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    machineId: text('machine_id')
      .notNull()
      .references(() => machines.id, { onDelete: 'cascade' }),
    geom: geometry('geom', 'geometry(Point,4326)').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('positions_machine_recorded').on(t.machineId, t.recordedAt)],
);

export const zones = pgTable('zones', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  geom: geometry('geom', 'geometry(Polygon,4326)').notNull(),
});

export type Machine = typeof machines.$inferSelect;
export type Zone = typeof zones.$inferSelect;
