import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  decimal,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth-schema.js';

// Wishlists table
export const wishlists = pgTable(
  'wishlists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => user.id, {
      onDelete: 'cascade',
    }),
    name: text('name').notNull(),
    isDefault: boolean('is_default').default(false).notNull(),
    shareToken: text('share_token').unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('wishlists_user_id_idx').on(table.userId),
    index('wishlists_share_token_idx').on(table.shareToken),
  ]
);

// Items table
export const items = pgTable(
  'items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    wishlistId: uuid('wishlist_id')
      .notNull()
      .references(() => wishlists.id, {
        onDelete: 'cascade',
      }),
    name: text('name').notNull(),
    imageUrl: text('image_url'),
    currentPrice: decimal('current_price', { precision: 10, scale: 2 }),
    currency: text('currency').default('USD').notNull(),
    sourceUrl: text('source_url'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('items_wishlist_id_idx').on(table.wishlistId),
  ]
);

// Price history table
export const priceHistory = pgTable(
  'price_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id, {
        onDelete: 'cascade',
      }),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    currency: text('currency').default('USD').notNull(),
    recordedAt: timestamp('recorded_at').defaultNow().notNull(),
  },
  (table) => [
    index('price_history_item_id_idx').on(table.itemId),
  ]
);

// Relations
export const wishlistsRelations = relations(wishlists, ({ many, one }) => ({
  items: many(items),
  user: one(user, {
    fields: [wishlists.userId],
    references: [user.id],
  }),
}));

export const itemsRelations = relations(items, ({ many, one }) => ({
  wishlist: one(wishlists, {
    fields: [items.wishlistId],
    references: [wishlists.id],
  }),
  priceHistory: many(priceHistory),
}));

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  item: one(items, {
    fields: [priceHistory.itemId],
    references: [items.id],
  }),
}));
