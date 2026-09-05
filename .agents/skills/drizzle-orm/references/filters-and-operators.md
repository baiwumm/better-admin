---
title: Filters and Operators
description: Filter operators eq, ne, gt, lt, like, ilike, inArray, isNull, between, and, or, not, and the sql template for custom expressions
tags:
  [
    eq,
    ne,
    gt,
    lt,
    like,
    ilike,
    inArray,
    isNull,
    between,
    and,
    or,
    not,
    sql,
    filters,
  ]
---

# Filters and Operators

## Operator Reference

All operators are imported from `drizzle-orm`:

```ts
import {
  eq,
  ne,
  gt,
  gte,
  lt,
  lte,
  like,
  ilike,
  inArray,
  notInArray,
  isNull,
  isNotNull,
  between,
  notBetween,
  and,
  or,
  not,
  exists,
  sql,
} from 'drizzle-orm';
```

| Operator     | SQL Equivalent | Example                                 |
| ------------ | -------------- | --------------------------------------- |
| `eq`         | `=`            | `eq(users.id, 1)`                       |
| `ne`         | `<>` / `!=`    | `ne(users.role, 'banned')`              |
| `gt`         | `>`            | `gt(users.age, 18)`                     |
| `gte`        | `>=`           | `gte(posts.rating, 4)`                  |
| `lt`         | `<`            | `lt(products.price, 100)`               |
| `lte`        | `<=`           | `lte(orders.total, budget)`             |
| `like`       | `LIKE`         | `like(users.name, 'John%')`             |
| `ilike`      | `ILIKE`        | `ilike(users.email, '%@gmail.com')`     |
| `inArray`    | `IN`           | `inArray(users.role, ['admin', 'mod'])` |
| `notInArray` | `NOT IN`       | `notInArray(users.id, excludedIds)`     |
| `isNull`     | `IS NULL`      | `isNull(users.deletedAt)`               |
| `isNotNull`  | `IS NOT NULL`  | `isNotNull(users.emailVerifiedAt)`      |
| `between`    | `BETWEEN`      | `between(products.price, 10, 50)`       |
| `notBetween` | `NOT BETWEEN`  | `notBetween(users.age, 0, 12)`          |
| `exists`     | `EXISTS`       | `exists(subquery)`                      |
| `not`        | `NOT`          | `not(eq(users.role, 'banned'))`         |
| `and`        | `AND`          | `and(cond1, cond2, cond3)`              |
| `or`         | `OR`           | `or(cond1, cond2)`                      |

## Comparison Operators

```ts
const adults = await db.select().from(users).where(gte(users.age, 18));

const premiumProducts = await db
  .select()
  .from(products)
  .where(gt(products.price, 100));

const recentPosts = await db
  .select()
  .from(posts)
  .where(gte(posts.createdAt, new Date('2024-01-01')));
```

## Pattern Matching

```ts
const johns = await db.select().from(users).where(like(users.name, 'John%'));

const gmailUsers = await db
  .select()
  .from(users)
  .where(ilike(users.email, '%@gmail.com'));
```

`ilike` is PostgreSQL-specific. For MySQL/SQLite, use `like` (MySQL is case-insensitive by default; SQLite requires `COLLATE NOCASE`).

## Array Operators

```ts
const adminsAndMods = await db
  .select()
  .from(users)
  .where(inArray(users.role, ['admin', 'moderator']));

const filtered = await db
  .select()
  .from(users)
  .where(notInArray(users.id, blockedUserIds));
```

## Null Checks

```ts
const activeUsers = await db
  .select()
  .from(users)
  .where(isNull(users.deletedAt));

const verifiedUsers = await db
  .select()
  .from(users)
  .where(isNotNull(users.emailVerifiedAt));
```

## Range Operators

```ts
const midRange = await db
  .select()
  .from(products)
  .where(between(products.price, 10, 50));

const thisWeek = await db
  .select()
  .from(posts)
  .where(between(posts.createdAt, weekStart, weekEnd));
```

## Combining Conditions

### AND

```ts
const activeAdmins = await db
  .select()
  .from(users)
  .where(
    and(
      eq(users.role, 'admin'),
      eq(users.isActive, true),
      isNull(users.deletedAt),
    ),
  );
```

### OR

```ts
const moderatorsOrAdmins = await db
  .select()
  .from(users)
  .where(or(eq(users.role, 'admin'), eq(users.role, 'moderator')));
```

### Complex Combinations

```ts
const results = await db
  .select()
  .from(posts)
  .where(
    and(
      eq(posts.published, true),
      or(
        eq(posts.authorId, currentUserId),
        gte(posts.publishedAt, thirtyDaysAgo),
      ),
    ),
  );
```

### NOT

```ts
const nonAdmins = await db
  .select()
  .from(users)
  .where(not(eq(users.role, 'admin')));
```

## EXISTS Subquery

```ts
const usersWithPosts = await db
  .select()
  .from(users)
  .where(exists(db.select().from(posts).where(eq(posts.authorId, users.id))));
```

## The sql Template

### Basic Usage

```ts
import { sql } from 'drizzle-orm';

const results = await db
  .select()
  .from(users)
  .where(sql`${users.age} > 18`);
```

Parameters passed via `${}` are automatically parameterized (safe from SQL injection). Table and column references are properly escaped.

### Custom Expressions in Select

```ts
const usersWithFullName = await db
  .select({
    id: users.id,
    fullName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
  })
  .from(users);
```

### Typed sql Expressions

```ts
const postCounts = await db
  .select({
    authorId: posts.authorId,
    count: sql<number>`count(*)`.as('count'),
  })
  .from(posts)
  .groupBy(posts.authorId);
```

### sql.raw() for Unescaped Values

```ts
const orderDirection = 'DESC';
const results = await db
  .select()
  .from(users)
  .orderBy(sql`${users.createdAt} ${sql.raw(orderDirection)}`);
```

Use `sql.raw()` only for trusted values. Never pass user input to `sql.raw()`.

### sql.placeholder() for Prepared Statements

```ts
const prepared = db
  .select()
  .from(users)
  .where(
    and(
      eq(users.role, sql.placeholder('role')),
      gte(users.age, sql.placeholder('minAge')),
    ),
  )
  .prepare('get_users_by_role_and_age');

const admins = await prepared.execute({ role: 'admin', minAge: 18 });
```

### Using sql in ORDER BY

```ts
const results = await db
  .select()
  .from(posts)
  .orderBy(sql`${posts.viewCount} DESC NULLS LAST`);
```

### Using sql in HAVING

```ts
const popularAuthors = await db
  .select({
    authorId: posts.authorId,
    postCount: sql<number>`count(*)`.as('post_count'),
  })
  .from(posts)
  .groupBy(posts.authorId)
  .having(sql`count(*) >= 10`);
```

## Dynamic Filters

```ts
function buildUserQuery(filters: {
  role?: string;
  isActive?: boolean;
  search?: string;
}) {
  const conditions = [];

  if (filters.role) {
    conditions.push(eq(users.role, filters.role));
  }
  if (filters.isActive !== undefined) {
    conditions.push(eq(users.isActive, filters.isActive));
  }
  if (filters.search) {
    conditions.push(ilike(users.name, `%${filters.search}%`));
  }

  return db
    .select()
    .from(users)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
}
```

## Full-Text Search (PostgreSQL)

```ts
const results = await db
  .select()
  .from(posts)
  .where(
    sql`to_tsvector('english', ${posts.title} || ' ' || ${posts.content})
        @@ plainto_tsquery('english', ${searchTerm})`,
  );
```
