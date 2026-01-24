import {
  pgTable,
  uuid,
  text,
  timestamp,
  decimal,
  index,
  unique,
  boolean,
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
    alertEnabled: boolean('alert_enabled').default(false).notNull(),
    alertPrice: decimal('alert_price', { precision: 10, scale: 2 }),
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

// User settings table
export const userSettings = pgTable(
  'user_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => user.id, {
        onDelete: 'cascade',
      }),
    priceDropAlertsEnabled: boolean('price_drop_alerts_enabled').default(false).notNull(),
    defaultCurrency: text('default_currency').default('USD').notNull(),
    expoPushToken: text('expo_push_token'),
    weeklyDigestEnabled: boolean('weekly_digest_enabled').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('user_settings_user_id_idx').on(table.userId)]
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

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(user, {
    fields: [userSettings.userId],
    references: [user.id],
  }),
}));

// User location table
export const userLocation = pgTable(
  'user_location',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => user.id, {
        onDelete: 'cascade',
      }),
    countryCode: text('country_code').notNull(),
    countryName: text('country_name').notNull(),
    city: text('city'),
    region: text('region'),
    postalCode: text('postal_code'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('user_location_user_id_idx').on(table.userId)]
);

// Stores table
export const stores = pgTable(
  'stores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    domain: text('domain').notNull().unique(),
    type: text('type', { enum: ['website', 'marketplace'] }).notNull(),
    countriesSupported: text('countries_supported').notNull(), // JSON string stored as text
    requiresCity: boolean('requires_city').default(false).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('stores_domain_idx').on(table.domain)]
);

// Store shipping rules table
export const storeShippingRules = pgTable(
  'store_shipping_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, {
        onDelete: 'cascade',
      }),
    countryCode: text('country_code').notNull(),
    cityWhitelist: text('city_whitelist'), // JSON string stored as text
    cityBlacklist: text('city_blacklist'), // JSON string stored as text
    shipsToCountry: boolean('ships_to_country').default(true).notNull(),
    shipsToCity: boolean('ships_to_city').default(true).notNull(),
    deliveryMethods: text('delivery_methods'), // JSON string stored as text
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('store_shipping_rules_store_id_idx').on(table.storeId)]
);

// Relations
export const userLocationRelations = relations(userLocation, ({ one }) => ({
  user: one(user, {
    fields: [userLocation.userId],
    references: [user.id],
  }),
}));

export const storesRelations = relations(stores, ({ many }) => ({
  shippingRules: many(storeShippingRules),
}));

export const storeShippingRulesRelations = relations(
  storeShippingRules,
  ({ one }) => ({
    store: one(stores, {
      fields: [storeShippingRules.storeId],
      references: [stores.id],
    }),
  })
);

// User reports table
export const userReports = pgTable(
  'user_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => user.id, {
      onDelete: 'cascade',
    }),
    reportType: text('report_type').notNull(), // 'wrong_product_match', 'wrong_price', 'store_not_available', 'broken_link', 'image_issue', 'other'
    context: text('context').notNull(), // 'item_detail', 'confirm_product', 'import_preview'
    itemId: uuid('item_id').references(() => wishlistItems.id, {
      onDelete: 'set null',
    }),
    wishlistId: uuid('wishlist_id').references(() => wishlists.id, {
      onDelete: 'set null',
    }),
    details: text('details').notNull(),
    suggestedFix: text('suggested_fix'), // Can be plain text or JSON
    attachmentUrl: text('attachment_url'),
    adminReply: text('admin_reply'),
    status: text('status').default('open').notNull(), // 'open', 'triaged', 'resolved', 'closed'
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('user_reports_user_id_idx').on(table.userId)]
);

// Relations
export const userReportsRelations = relations(userReports, ({ one }) => ({
  user: one(user, {
    fields: [userReports.userId],
    references: [user.id],
  }),
  item: one(wishlistItems, {
    fields: [userReports.itemId],
    references: [wishlistItems.id],
  }),
  wishlist: one(wishlists, {
    fields: [userReports.wishlistId],
    references: [wishlists.id],
  }),
}));
