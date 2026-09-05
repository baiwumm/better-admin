---
title: Views and Advanced Features
description: Views, materialized views, generated columns, check constraints, $count utility, and batch API
tags:
  [views, pgView, pgMaterializedView, generatedAlwaysAs, check, $count, batch]
---

# Views and Advanced Features

## Views

### Regular View

```ts
import { pgView } from 'drizzle-orm/pg-core';
import { eq, sql } from 'drizzle-orm';

export const activeUsers = pgView('active_users').as((qb) =>
  qb.select().from(users).where(eq(users.isActive, true)),
);
```

### View with Explicit Columns

```ts
import { pgView, text, integer } from 'drizzle-orm/pg-core';

export const userSummary = pgView('user_summary', {
  name: text('name'),
  postCount: integer('post_count'),
}).as(
  sql`SELECT u.name, COUNT(p.id) as post_count
      FROM users u LEFT JOIN posts p ON u.id = p.author_id
      GROUP BY u.name`,
);
```

### Materialized View

```ts
import { pgMaterializedView, text, integer } from 'drizzle-orm/pg-core';

export const monthlyStats = pgMaterializedView('monthly_stats', {
  authorName: text('author_name'),
  totalPosts: integer('total_posts'),
}).as(
  sql`SELECT u.name as author_name, COUNT(p.id) as total_posts
      FROM users u LEFT JOIN posts p ON u.id = p.author_id
      GROUP BY u.name`,
);
```

### Query a View

```ts
const activeUserList = await db.select().from(activeUsers);

const stats = await db.select().from(monthlyStats);
```

### Refresh Materialized View

```ts
await db.refreshMaterializedView(monthlyStats);
```

### MySQL View

```ts
import { mysqlView } from 'drizzle-orm/mysql-core';

export const activeUsers = mysqlView('active_users').as((qb) =>
  qb.select().from(users).where(eq(users.isActive, true)),
);
```

### SQLite View

```ts
import { sqliteView } from 'drizzle-orm/sqlite-core';

export const activeUsers = sqliteView('active_users').as((qb) =>
  qb.select().from(users).where(eq(users.isActive, true)),
);
```

## Generated Columns

### PostgreSQL Generated Columns

```ts
import { pgTable, text, integer } from 'drizzle-orm/pg-core';
import { sql, type SQL } from 'drizzle-orm';

export const users = pgTable('users', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  fullName: text('full_name').generatedAlwaysAs(
    (): SQL => sql`${users.firstName} || ' ' || ${users.lastName}`,
  ),
});
```

### SQLite Generated Columns (Virtual and Stored)

```ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql, type SQL } from 'drizzle-orm';

export const products = sqliteTable('products', {
  id: integer().primaryKey({ autoIncrement: true }),
  price: integer().notNull(),
  quantity: integer().notNull(),
  total: integer().generatedAlwaysAs(
    (): SQL => sql`${products.price} * ${products.quantity}`,
    { mode: 'virtual' },
  ),
  totalStored: integer().generatedAlwaysAs(
    (): SQL => sql`${products.price} * ${products.quantity}`,
    { mode: 'stored' },
  ),
});
```

SQLite supports both `virtual` (computed on read) and `stored` (persisted on write) modes. PostgreSQL only supports `stored`.

## Check Constraints

```ts
import { pgTable, integer, text, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    username: text().notNull(),
    age: integer(),
  },
  (table) => [check('age_check', sql`${table.age} > 0`)],
);
```

### Multiple Check Constraints

```ts
export const products = pgTable(
  'products',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: text().notNull(),
    price: integer().notNull(),
    discountPrice: integer('discount_price'),
  },
  (table) => [
    check('price_positive', sql`${table.price} > 0`),
    check(
      'discount_less_than_price',
      sql`${table.discountPrice} IS NULL OR ${table.discountPrice} < ${table.price}`,
    ),
  ],
);
```

## $count Utility

A shorthand for counting rows, usable standalone or as a subquery.

### Standalone Count

```ts
const totalUsers = await db.$count(users);

const activeCount = await db.$count(users, eq(users.isActive, true));
```

### Count as Subquery in Select

```ts
const usersWithPostCount = await db
  .select({
    id: users.id,
    name: users.name,
    postsCount: db.$count(posts, eq(posts.authorId, users.id)),
  })
  .from(users);
```

### Count in Relational Queries

```ts
const usersWithCount = await db.query.users.findMany({
  extras: {
    postsCount: db.$count(posts, eq(posts.authorId, users.id)),
  },
});
```

## Batch API

Execute multiple SQL statements in a single round trip. Supported for LibSQL, Neon, and D1 databases.

```ts
const batchResponse = await db.batch([
  db.insert(users).values({ name: 'John' }).returning({ id: users.id }),
  db.update(users).set({ name: 'Dan' }).where(eq(users.id, 1)),
  db.query.users.findMany({}),
  db.select().from(users).where(eq(users.id, 1)),
]);
```

The batch method returns a tuple matching the input array order, with each element typed according to its query.
