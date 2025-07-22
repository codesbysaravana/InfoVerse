import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const summaries = pgTable('summaries', {
  id: uuid('id').defaultRandom().primaryKey(),
  source: text('source'),
  url: text('url'),
  title: text('title'),
  summary: text('summary'),
  createdAt: timestamp('created_at').defaultNow()
});
