---
title: Schema Definition
description: Table definitions with pgTable, column types, defaults, constraints, indexes, composite keys, enums, and type inference
tags:
  [
    pgTable,
    column-types,
    indexes,
    constraints,
    enums,
    inferSelect,
    inferInsert,
    schema,
  ]
---

# Schema Definition

## Basic Table Definition

```ts
import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  serial,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  email: text().notNull().unique(),
  age: integer(),
  isActive: boolean().default(true),
  createdAt: timestamp({ mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});
```

## Column Types (PostgreSQL)

| Type                  | Import                | Usage                    |
| --------------------- | --------------------- | ------------------------ |
| `text()`              | `drizzle-orm/pg-core` | Variable-length strings  |
| `varchar({ length })` | `drizzle-orm/pg-core` | Fixed-max-length strings |
| `integer()`           | `drizzle-orm/pg-core` | 32-bit integers          |
| `bigint({ mode })`    | `drizzle-orm/pg-core` | 64-bit integers          |
| `serial()`            | `drizzle-orm/pg-core` | Auto-increment (legacy)  |
| `boolean()`           | `drizzle-orm/pg-core` | True/false               |
| `timestamp()`         | `drizzle-orm/pg-core` | Date/time                |
| `date()`              | `drizzle-orm/pg-core` | Date only                |
| `json()`              | `drizzle-orm/pg-core` | JSON column              |
| `jsonb()`             | `drizzle-orm/pg-core` | Binary JSON (indexable)  |
| `uuid()`              | `drizzle-orm/pg-core` | UUID type                |
| `numeric()`           | `drizzle-orm/pg-core` | Arbitrary precision      |
| `real()`              | `drizzle-orm/pg-core` | Floating point           |
| `doublePrecision()`   | `drizzle-orm/pg-core` | Double precision float   |

## Column Modifiers

```ts
text().notNull();
text().default('value');
text().unique();
text().$type<'admin' | 'user'>();
timestamp().defaultNow();
timestamp().$onUpdateFn(() => new Date());
integer().references(() => users.id);
integer().references(() => users.id, { onDelete: 'cascade' });
```

## Identity Columns (Recommended over serial)

```ts
export const posts = pgTable('posts', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: text().notNull(),
});

export const legacyTable = pgTable('legacy', {
  id: serial().primaryKey(),
});
```

## Enums

```ts
import { pgEnum, pgTable, text, integer } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['guest', 'user', 'admin']);

export const users = pgTable('users', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  role: roleEnum().default('guest'),
});
```

## JSON Column Typing

```ts
import { pgTable, integer, jsonb } from 'drizzle-orm/pg-core';

type UserPreferences = {
  theme: 'light' | 'dark';
  notifications: boolean;
};

export const users = pgTable('users', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  preferences: jsonb().$type<UserPreferences>(),
});
```

## Indexes

```ts
import {
  pgTable,
  text,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const posts = pgTable(
  'posts',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    slug: text().notNull(),
    title: text().notNull(),
    authorId: integer('author_id').references(() => users.id),
  },
  (table) => [
    uniqueIndex('slug_idx').on(table.slug),
    index('title_idx').on(table.title),
    index('author_id_idx').on(table.authorId),
  ],
);
```

## Composite Primary Key

```ts
import { pgTable, integer, primaryKey } from 'drizzle-orm/pg-core';

export const orderDetails = pgTable(
  'order_details',
  {
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id),
    quantity: integer().notNull(),
  },
  (table) => [primaryKey({ columns: [table.orderId, table.productId] })],
);
```

## Foreign Keys

```ts
import { pgTable, integer, text, foreignKey } from 'drizzle-orm/pg-core';
import { type AnyPgColumn } from 'drizzle-orm/pg-core';

export const employees = pgTable(
  'employees',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: text().notNull(),
    managerId: integer('manager_id'),
  },
  (table) => [
    foreignKey({
      columns: [table.managerId],
      foreignColumns: [table.id],
    }),
  ],
);

export const cyclic = pgTable('cyclic', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  parentId: integer('parent_id').references((): AnyPgColumn => cyclic.id),
});
```

## Type Inference

```ts
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';

type User = typeof users.$inferSelect;
type NewUser = typeof users.$inferInsert;

type User2 = InferSelectModel<typeof users>;
type NewUser2 = InferInsertModel<typeof users>;

async function createUser(data: NewUser): Promise<User> {
  const [user] = await db.insert(users).values(data).returning();
  return user;
}
```

## Casing Configuration

```ts
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export const db = drizzle(process.env.DATABASE_URL!, {
  casing: 'snake_case',
  schema,
});
```

With `casing: 'snake_case'`, define columns in camelCase without explicit column name arguments. Drizzle auto-converts `createdAt` to `created_at` in SQL.

## Schema Validation with Zod

```ts
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-orm/zod';

const userInsertSchema = createInsertSchema(users);
const userSelectSchema = createSelectSchema(users);
const userUpdateSchema = createUpdateSchema(users);

const userInsertWithRefinements = createInsertSchema(users, {
  name: (schema) => schema.min(2).max(50),
  email: (schema) => schema.email(),
});

const parsed = userInsertSchema.parse({
  name: 'John',
  email: 'john@example.com',
});
await db.insert(users).values(parsed);
```

## MySQL and SQLite Differences

```ts
import { mysqlTable, int, varchar, mysqlEnum } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: int().primaryKey().autoincrement(),
  name: varchar({ length: 256 }).notNull(),
  role: mysqlEnum(['guest', 'user', 'admin']).default('guest'),
});
```

```ts
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  role: text().$type<'guest' | 'user' | 'admin'>().default('guest'),
});
```

Key differences:

- **PostgreSQL**: `pgTable`, `pgEnum`, `serial()` / `generatedAlwaysAsIdentity()`
- **MySQL**: `mysqlTable`, `mysqlEnum`, `autoincrement()`
- **SQLite**: `sqliteTable`, no native enum (use `$type<>()`), `autoIncrement` option
