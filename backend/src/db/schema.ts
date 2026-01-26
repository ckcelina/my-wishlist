import {
  pgTable,
  uuid,
  text,
  timestamp,
  decimal,
  index,
  unique,
  boolean,
  integer,
  check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
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
    normalizedUrl: text('normalized_url'),
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
    allowReservations: boolean('allow_reservations').default(false).notNull(),
    hideReservedItems: boolean('hide_reserved_items').default(false).notNull(),
    showReserverNames: boolean('show_reserver_names').default(false).notNull(),
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
    quietHoursEnabled: boolean('quiet_hours_enabled').default(false).notNull(),
    quietHoursStartTime: text('quiet_hours_start_time'),
    quietHoursEndTime: text('quiet_hours_end_time'),
    languageMode: text('language_mode', { enum: ['system', 'manual'] })
      .default('system')
      .notNull(),
    languageCode: text('language_code').default('en').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('user_settings_user_id_idx').on(table.userId)]
);

// User alert settings table
export const userAlertSettings = pgTable(
  'user_alert_settings',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, {
        onDelete: 'cascade',
      }),
    alertsEnabled: boolean('alerts_enabled').default(true).notNull(),
    notifyPriceDrops: boolean('notify_price_drops').default(true).notNull(),
    notifyUnderTarget: boolean('notify_under_target').default(true).notNull(),
    weeklyDigest: boolean('weekly_digest').default(false).notNull(),
    quietHoursEnabled: boolean('quiet_hours_enabled').default(false).notNull(),
    quietStart: text('quiet_start'), // "22:00" format
    quietEnd: text('quiet_end'), // "08:00" format
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  }
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

export const userAlertSettingsRelations = relations(
  userAlertSettings,
  ({ one }) => ({
    user: one(user, {
      fields: [userAlertSettings.userId],
      references: [user.id],
    }),
  })
);

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
    area: text('area'),
    addressLine: text('address_line'),
    geonameId: text('geoname_id'),
    lat: decimal('lat', { precision: 10, scale: 6 }),
    lng: decimal('lng', { precision: 10, scale: 6 }),
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

// User Entitlements table
export const userEntitlements = pgTable(
  'user_entitlements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => user.id, {
        onDelete: 'cascade',
      }),
    isPremium: boolean('is_premium').default(false).notNull(),
    planName: text('plan_name'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('user_entitlements_user_id_idx').on(table.userId)]
);

// Price Refresh Jobs table
export const priceRefreshJobs = pgTable(
  'price_refresh_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, {
        onDelete: 'cascade',
      }),
    wishlistId: uuid('wishlist_id').references(() => wishlists.id, {
      onDelete: 'set null',
    }),
    status: text('status').default('queued').notNull(),
    totalItems: integer('total_items').default(0).notNull(),
    processedItems: integer('processed_items').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    startedAt: timestamp('started_at'),
    finishedAt: timestamp('finished_at'),
    errorMessage: text('error_message'),
  },
  (table) => [
    index('price_refresh_jobs_user_id_idx').on(table.userId),
    index('price_refresh_jobs_status_idx').on(table.status),
    check('status_check', sql`status IN ('queued', 'running', 'done', 'failed')`),
  ]
);

// Relations
export const userEntitlementsRelations = relations(userEntitlements, ({ one }) => ({
  user: one(user, {
    fields: [userEntitlements.userId],
    references: [user.id],
  }),
}));

export const priceRefreshJobsRelations = relations(priceRefreshJobs, ({ one }) => ({
  user: one(user, {
    fields: [priceRefreshJobs.userId],
    references: [user.id],
  }),
  wishlist: one(wishlists, {
    fields: [priceRefreshJobs.wishlistId],
    references: [wishlists.id],
  }),
}));

// Notification Deduplication table
export const notificationDedupe = pgTable(
  'notification_dedupe',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, {
        onDelete: 'cascade',
      }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => wishlistItems.id, {
        onDelete: 'cascade',
      }),
    type: text('type').notNull(),
    lastSentAt: timestamp('last_sent_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('notification_dedupe_user_id_idx').on(table.userId),
    index('notification_dedupe_item_id_idx').on(table.itemId),
    check('type_check', sql`type IN ('price_drop', 'under_target', 'weekly_digest')`),
  ]
);

// Item Reservations table
export const itemReservations = pgTable(
  'item_reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sharedWishlistId: uuid('shared_wishlist_id')
      .notNull()
      .references(() => sharedWishlists.id, {
        onDelete: 'cascade',
      }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => wishlistItems.id, {
        onDelete: 'cascade',
      }),
    reservedByName: text('reserved_by_name').notNull(),
    reservedAt: timestamp('reserved_at').defaultNow().notNull(),
    status: text('status').default('reserved').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('item_reservations_shared_wishlist_id_idx').on(table.sharedWishlistId),
    index('item_reservations_item_id_idx').on(table.itemId),
    check('status_check', sql`status IN ('reserved', 'released')`),
  ]
);

// Import Templates table
export const importTemplates = pgTable(
  'import_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, {
        onDelete: 'cascade',
      }),
    name: text('name').notNull(),
    mode: text('mode').notNull(),
    groupingMode: text('grouping_mode').notNull(),
    defaultWishlistId: uuid('default_wishlist_id').references(() => wishlists.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('import_templates_user_id_idx').on(table.userId),
    check('mode_check', sql`mode IN ('merge', 'new', 'split')`),
    check('grouping_mode_check', sql`grouping_mode IN ('store', 'category', 'price', 'person', 'occasion')`),
  ]
);

// Relations
export const notificationDedupeRelations = relations(notificationDedupe, ({ one }) => ({
  user: one(user, {
    fields: [notificationDedupe.userId],
    references: [user.id],
  }),
  item: one(wishlistItems, {
    fields: [notificationDedupe.itemId],
    references: [wishlistItems.id],
  }),
}));

export const itemReservationsRelations = relations(itemReservations, ({ one }) => ({
  sharedWishlist: one(sharedWishlists, {
    fields: [itemReservations.sharedWishlistId],
    references: [sharedWishlists.id],
  }),
  item: one(wishlistItems, {
    fields: [itemReservations.itemId],
    references: [wishlistItems.id],
  }),
}));

export const importTemplatesRelations = relations(importTemplates, ({ one }) => ({
  user: one(user, {
    fields: [importTemplates.userId],
    references: [user.id],
  }),
  wishlist: one(wishlists, {
    fields: [importTemplates.defaultWishlistId],
    references: [wishlists.id],
  }),
}));

// City Search Cache table
export const citySearchCache = pgTable(
  'city_search_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    query: text('query').notNull(),
    countryCode: text('country_code'),
    resultsJson: text('results_json').notNull(),
    cachedAt: timestamp('cached_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('city_search_cache_query_idx').on(table.query),
    index('city_search_cache_country_code_idx').on(table.countryCode),
  ]
);
