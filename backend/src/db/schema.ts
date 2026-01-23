import {
  pgTable,
  uuid,
  text,
  timestamp,
  decimal,
  index,
  unique,
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
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('wishlists_user_id_idx').on(table.userId)]
);

// Wishlist Items table (renamed from items)
export const wishlistItems = pgTable(
  'wishlist_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    wishlistId: uuid('wishlist_id')
      .notNull()
      .references(() => wishlists.id, {
        onDelete: 'cascade',
      }),
    originalUrl: text('original_url'),
    sourceDomain: text('source_domain'),
    title: text('title').notNull(),
    imageUrl: text('image_url'),
    currentPrice: decimal('current_price', { precision: 10, scale: 2 }),
    currency: text('currency').default('USD').notNull(),
    notes: text('notes'),
    lastCheckedAt: timestamp('last_checked_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('wishlist_items_wishlist_id_idx').on(table.wishlistId)]
);

// Price history table
export const priceHistory = pgTable(
  'price_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => wishlistItems.id, {
        onDelete: 'cascade',
      }),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    currency: text('currency').default('USD').notNull(),
    recordedAt: timestamp('recorded_at').defaultNow().notNull(),
  },
  (table) => [index('price_history_item_id_idx').on(table.itemId)]
);

// Shared wishlists table
export const sharedWishlists = pgTable(
  'shared_wishlists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    wishlistId: uuid('wishlist_id')
      .notNull()
      .unique()
      .references(() => wishlists.id, {
        onDelete: 'cascade',
      }),
    shareSlug: text('share_slug').notNull().unique(),
    visibility: text('visibility').notNull(), // 'public' or 'unlisted'
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('shared_wishlists_wishlist_id_idx').on(table.wishlistId)]
);

// Relations
export const wishlistsRelations = relations(wishlists, ({ many, one }) => ({
  items: many(wishlistItems),
  sharedWishlist: one(sharedWishlists, {
    fields: [wishlists.id],
    references: [sharedWishlists.wishlistId],
  }),
  user: one(user, {
    fields: [wishlists.userId],
    references: [user.id],
  }),
}));

export const wishlistItemsRelations = relations(
  wishlistItems,
  ({ many, one }) => ({
    wishlist: one(wishlists, {
      fields: [wishlistItems.wishlistId],
      references: [wishlists.id],
    }),
    priceHistory: many(priceHistory),
  })
);

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  item: one(wishlistItems, {
    fields: [priceHistory.itemId],
    references: [wishlistItems.id],
  }),
}));

export const sharedWishlistsRelations = relations(
  sharedWishlists,
  ({ one }) => ({
    wishlist: one(wishlists, {
      fields: [sharedWishlists.wishlistId],
      references: [wishlists.id],
    }),
  })
);
