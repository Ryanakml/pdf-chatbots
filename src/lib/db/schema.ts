import { integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const userSystemEnum = pgEnum('user_system_enum', ['user', 'system'])

export const chart = pgTable(
    'chart',
    {
        id: serial('id').primaryKey(),
        pdfName: text('pdf_name').notNull(),
        pdfUrl: text('pdf_url').notNull(),
        createdAt: timestamp('created_at').defaultNow(),
        userId: varchar('user_id', { length: 256 }).notNull(),
        fileKey: text('file_key').notNull(),
    }
)

export type DrizzleChart = typeof chart.$inferSelect;

export const messages = pgTable(
    'messages',
    {
      id: serial('id').primaryKey(),
      chartId: integer('chart_id').references(() => chart.id).notNull(),
      content: text('content').notNull(),
      createdAt: timestamp('created_at').defaultNow(),
      role: userSystemEnum('role').notNull(),
    }
  );