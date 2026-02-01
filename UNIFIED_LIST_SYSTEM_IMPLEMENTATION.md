
# Unified List System Implementation Plan

## Overview
Transform the existing wishlist system into a unified List system supporting both WISHLIST and TODO list types with collaboration, reservations, and Smart Plan Mode.

## Backend Changes Required

### 1. Database Schema Migrations

#### Modify `wishlists` table:
```sql
ALTER TABLE wishlists 
ADD COLUMN list_type TEXT NOT NULL DEFAULT 'WISHLIST' CHECK (list_type IN ('WISHLIST', 'TODO')),
ADD COLUMN is_default BOOLEAN DEFAULT FALSE,
ADD COLUMN smart_plan_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN smart_plan_template TEXT CHECK (smart_plan_template IN ('birthday_party', 'christmas_gifts', 'event_planning', 'trip'));

CREATE INDEX idx_wishlists_list_type ON wishlists(list_type);
CREATE INDEX idx_wishlists_is_default ON wishlists(is_default);
```

#### Modify `wishlist_items` table:
```sql
ALTER TABLE wishlist_items
ADD COLUMN row_type TEXT NOT NULL DEFAULT 'ITEM' CHECK (row_type IN ('TEXT', 'ITEM')),
ADD COLUMN completed BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN completed_at TIMESTAMPTZ,
ADD COLUMN completed_by_user_id TEXT REFERENCES auth.users(id),
ADD COLUMN assigned_to TEXT;

-- Make these nullable for TEXT rows
ALTER TABLE wishlist_items ALTER COLUMN original_url DROP NOT NULL;
ALTER TABLE wishlist_items ALTER COLUMN image_url DROP NOT NULL;

CREATE INDEX idx_wishlist_items_row_type ON wishlist_items(row_type);
CREATE INDEX idx_wishlist_items_completed ON wishlist_items(completed);
```

#### Create `list_collaborators` table:
```sql
CREATE TABLE list_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT NOT NULL,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  invited_by_user_id TEXT NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(list_id, user_id),
  UNIQUE(list_id, email)
);

CREATE INDEX idx_list_collaborators_list_id ON list_collaborators(list_id);
CREATE INDEX idx_list_collaborators_user_id ON list_collaborators(user_id);
CREATE INDEX idx_list_collaborators_status ON list_collaborators(status);
```

#### Modify `item_reservations` table:
```sql
ALTER TABLE item_reservations
ADD COLUMN reserved_by_user_id TEXT REFERENCES auth.users(id),
ADD COLUMN notes TEXT;
```

#### Create `smart_plan_suggestions` table:
```sql
CREATE TABLE smart_plan_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('text_row', 'item_row')),
  title TEXT NOT NULL,
  notes TEXT,
  category TEXT,
  is_converted BOOLEAN DEFAULT FALSE,
  converted_to_item_id UUID REFERENCES wishlist_items(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_smart_plan_suggestions_list_id ON smart_plan_suggestions(list_id);
CREATE INDEX idx_smart_plan_suggestions_is_converted ON smart_plan_suggestions(is_converted);
```

### 2. API Endpoints

#### Lists Management
- `GET /api/lists` - Get all lists (wishlists + todos) for current user
- `POST /api/lists` - Create new list with optional Smart Plan Mode
- `PUT /api/lists/:id` - Update list
- `DELETE /api/lists/:id` - Delete list
- `GET /api/lists/:id` - Get single list with items

#### List Rows Management
- `GET /api/lists/:listId/rows` - Get all rows for a list
- `POST /api/lists/:listId/rows` - Create new row
- `PUT /api/lists/:listId/rows/:rowId` - Update row (including completion)
- `DELETE /api/lists/:listId/rows/:rowId` - Delete row
- `POST /api/lists/:listId/rows/:rowId/convert-to-item` - Convert TEXT row to ITEM row

#### Collaboration
- `GET /api/lists/:listId/collaborators` - Get all collaborators
- `POST /api/lists/:listId/collaborators` - Invite collaborator
- `PUT /api/lists/:listId/collaborators/:collaboratorId` - Update permission
- `DELETE /api/lists/:listId/collaborators/:collaboratorId` - Remove collaborator
- `POST /api/lists/:listId/collaborators/:collaboratorId/accept` - Accept invitation
- `POST /api/lists/:listId/collaborators/:collaboratorId/decline` - Decline invitation

#### Reservations
- `POST /api/lists/:listId/rows/:rowId/reserve` - Reserve an item
- `DELETE /api/lists/:listId/rows/:rowId/reserve` - Release reservation

#### Smart Plan Mode
- `GET /api/lists/:listId/suggestions` - Get Smart Plan suggestions
- `POST /api/lists/:listId/suggestions/:suggestionId/convert` - Convert suggestion to real row
- `DELETE /api/lists/:listId/suggestions/:suggestionId` - Dismiss suggestion

### 3. RLS Policies

```sql
-- Wishlists: Users can view lists they own OR collaborate on
CREATE POLICY "Users can view own and collaborated lists" ON wishlists
  FOR SELECT USING (
    user_id = auth.uid() OR
    id IN (SELECT list_id FROM list_collaborators WHERE user_id = auth.uid() AND status = 'accepted')
  );

-- Wishlist Items: Users can view items in lists they own OR collaborate on
CREATE POLICY "Users can view items in accessible lists" ON wishlist_items
  FOR SELECT USING (
    wishlist_id IN (
      SELECT id FROM wishlists WHERE user_id = auth.uid()
      UNION
      SELECT list_id FROM list_collaborators WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

-- Wishlist Items: Users can insert/update items if they have edit permission
CREATE POLICY "Users can modify items with edit permission" ON wishlist_items
  FOR ALL USING (
    wishlist_id IN (
      SELECT id FROM wishlists WHERE user_id = auth.uid()
      UNION
      SELECT list_id FROM list_collaborators WHERE user_id = auth.uid() AND permission = 'edit' AND status = 'accepted'
    )
  );
```

## Frontend Changes

### 1. Update Home Screen (app/(tabs)/wishlists.tsx)
- Change title from "My Wishlists" to "My Lists"
- Add two primary buttons: "+ Add Wishlist" and "+ Add To-Do List"
- Display both WISHLIST and TODO lists together
- Show list type badge (Wishlist/To-Do)
- Show completion count for TODO lists

### 2. Create List Detail Screen (app/list/[id].tsx)
- Unified screen for both WISHLIST and TODO lists
- Show checkboxes for all rows
- Support TEXT and ITEM row types
- Implement swipe actions for TEXT rows (Add Item, Edit, Delete)
- Show completion status
- Support collaboration features
- Show reservation info for ITEM rows

### 3. Update Add Item Flow (app/(tabs)/add.tsx)
- Support creating TEXT rows (simple title + notes)
- Support creating ITEM rows (existing flow)
- Add "Add Text Row" option for wishlists
- Default to ITEM rows for WISHLIST, TEXT rows for TODO

### 4. Create Collaboration UI
- Invite collaborators modal
- Manage permissions (view/edit)
- Show collaborator list
- Accept/decline invitations

### 5. Create Smart Plan Mode UI
- Template selection modal (Birthday Party, Christmas Gifts, Event Planning, Trip)
- Display suggestions
- Convert suggestions to real rows
- Dismiss suggestions

### 6. Create Swipe Actions Component
- Swipeable row component using react-native-gesture-handler
- Reveal actions: Add Item, Edit, Delete
- Smooth animations

## Migration Strategy

1. **Phase 1: Backend Schema** - Add new columns with defaults, create new tables
2. **Phase 2: Backend APIs** - Implement all new endpoints
3. **Phase 3: Frontend Core** - Update home screen and list detail screen
4. **Phase 4: Collaboration** - Add collaboration features
5. **Phase 5: Smart Plan Mode** - Add template-based list creation
6. **Phase 6: Polish** - Swipe actions, animations, edge cases

## Data Migration

- Existing wishlists automatically get `list_type='WISHLIST'`
- Existing wishlist_items automatically get `row_type='ITEM'`, `completed=false`
- No data loss, fully backward compatible

## Testing Checklist

- [ ] Create WISHLIST with ITEM rows
- [ ] Create TODO list with TEXT rows
- [ ] Convert TEXT row to ITEM row
- [ ] Complete/uncomplete rows
- [ ] Invite collaborators
- [ ] Accept/decline invitations
- [ ] Reserve items
- [ ] Create list with Smart Plan Mode
- [ ] Convert suggestions to rows
- [ ] Swipe actions on TEXT rows
- [ ] Offline sync for completion status
