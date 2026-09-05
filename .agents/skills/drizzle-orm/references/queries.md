---
title: Queries
description: Relational queries with db.query, SQL-like API with db.select, joins, subqueries, aggregations, and prepared statements
tags:
  [
    findMany,
    findFirst,
    select,
    joins,
    subqueries,
    aggregations,
    prepared-statements,
    with,
  ]
---

# Queries

## Relational Queries API

Relational queries require passing `schema` to the `drizzle()` client.

### findMany

```ts
const allUsers = await db.query.users.findMany();

const activeUsers = await db.query.users.findMany({
  where: eq(users.isActive, true),
  orderBy: desc(users.createdAt),
  limit: 10,
  offset: 0,
});
```

### findFirst

```ts
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
});
```

### Partial Select (columns)

```ts
const userNames = await db.query.users.findMany({
  columns: {
    id: true,
    name: true,
  },
});

const usersWithoutEmail = await db.query.users.findMany({
  columns: {
    email: false,
  },
});
```

### Nested Relations (with)

```ts
const usersWithPosts = await db.query.users.findMany({
  with: {
    posts: true,
  },
});

const usersWithNestedData = await db.query.users.findMany({
  with: {
    posts: {
      with: {
        comments: true,
      },
      limit: 5,
      orderBy: desc(posts.createdAt),
    },
  },
});

const partialWithRelations = await db.query.users.findMany({
  columns: { id: true, name: true },
  with: {
    posts: {
      columns: { title: true },
    },
  },
});
```

### Relational Query Filters

```ts
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    sessions: {
      orderBy: (sessions, { desc }) => desc(sessions.createdAt),
      limit: 5,
    },
  },
});
```

## SQL-like Query API

### Basic Select

```ts
const allUsers = await db.select().from(users);

const userNames = await db
  .select({ name: users.name, email: users.email })
  .from(users);
```

### Select with Conditions

```ts
import { eq, and, or, like, isNull } from 'drizzle-orm';

const admins = await db.select().from(users).where(eq(users.role, 'admin'));

const activeAdmins = await db
  .select()
  .from(users)
  .where(and(eq(users.role, 'admin'), eq(users.isActive, true)));

const moderatorsOrAdmins = await db
  .select()
  .from(users)
  .where(or(eq(users.role, 'admin'), eq(users.role, 'moderator')));

const johns = await db.select().from(users).where(like(users.name, 'John%'));

const unverified = await db
  .select()
  .from(users)
  .where(isNull(users.emailVerifiedAt));
```

### Ordering, Limit, Offset

```ts
import { asc, desc } from 'drizzle-orm';

const recentUsers = await db
  .select()
  .from(users)
  .orderBy(desc(users.createdAt))
  .limit(10)
  .offset(20);
```

## Joins

### Inner Join

```ts
const usersWithPosts = await db
  .select({
    userName: users.name,
    postTitle: posts.title,
  })
  .from(users)
  .innerJoin(posts, eq(users.id, posts.authorId));
```

### Left Join

```ts
const usersWithOptionalPosts = await db
  .select({
    userName: users.name,
    postTitle: posts.title,
  })
  .from(users)
  .leftJoin(posts, eq(users.id, posts.authorId));
```

### Multiple Joins

```ts
const result = await db
  .select({
    user: users.name,
    post: posts.title,
    comment: comments.text,
  })
  .from(users)
  .leftJoin(posts, eq(users.id, posts.authorId))
  .leftJoin(comments, eq(posts.id, comments.postId));
```

## Subqueries

```ts
import { sql } from 'drizzle-orm';

const subquery = db
  .select({
    authorId: posts.authorId,
    postCount: sql<number>`count(*)`.as('post_count'),
  })
  .from(posts)
  .groupBy(posts.authorId)
  .as('post_counts');

const usersWithPostCount = await db
  .select({
    name: users.name,
    postCount: subquery.postCount,
  })
  .from(users)
  .leftJoin(subquery, eq(users.id, subquery.authorId));
```

## Aggregations

```ts
import { sql, count, sum, avg, min, max } from 'drizzle-orm';

const totalUsers = await db.select({ count: count() }).from(users);

const postsByAuthor = await db
  .select({
    authorId: posts.authorId,
    totalPosts: count(),
    avgRating: avg(posts.rating),
  })
  .from(posts)
  .groupBy(posts.authorId);

const topAuthors = await db
  .select({
    authorId: posts.authorId,
    totalPosts: count(),
  })
  .from(posts)
  .groupBy(posts.authorId)
  .having(sql`count(*) > 5`);
```

## Distinct

```ts
const uniqueRoles = await db.selectDistinct({ role: users.role }).from(users);
```

## Prepared Statements

```ts
import { sql } from 'drizzle-orm';

const prepared = db
  .select()
  .from(users)
  .where(eq(users.id, sql.placeholder('id')))
  .prepare('get_user_by_id');

const user = await prepared.execute({ id: 1 });
const anotherUser = await prepared.execute({ id: 2 });
```

## Raw SQL Execution

```ts
import { sql } from 'drizzle-orm';

const result = await db.execute(sql`SELECT * FROM users WHERE id = ${userId}`);

const customQuery = await db.execute(
  sql`SELECT u.name, COUNT(p.id) as post_count
      FROM ${users} u
      LEFT JOIN ${posts} p ON u.id = p.author_id
      GROUP BY u.name`,
);
```

## Pagination Pattern

```ts
const page = 1;
const pageSize = 20;

const paginatedUsers = await db.query.users.findMany({
  orderBy: asc(users.createdAt),
  limit: pageSize,
  offset: (page - 1) * pageSize,
});

const paginatedWithSql = await db
  .select()
  .from(users)
  .orderBy(asc(users.createdAt))
  .limit(pageSize)
  .offset((page - 1) * pageSize);
```
