---
title: Relations
description: Defining relations with one(), many(), relations() function, nested with clauses, and self-referencing relations
tags:
  [relations, one, many, with, self-referencing, many-to-many, junction-table]
---

# Relations

Relations in Drizzle are declared separately from table definitions. They enable the relational queries API (`db.query`) but do not create SQL foreign keys. Use `.references()` on columns for SQL-level foreign keys, and `relations()` for the query builder.

## One-to-Many

```ts
import { relations } from 'drizzle-orm';
import { pgTable, integer, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
});

export const posts = pgTable('posts', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: text().notNull(),
  content: text(),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));
```

## One-to-One

```ts
export const users = pgTable('users', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
});

export const profiles = pgTable('profiles', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  bio: text(),
  avatarUrl: text('avatar_url'),
  userId: integer('user_id')
    .notNull()
    .unique()
    .references(() => users.id),
});

export const usersRelations = relations(users, ({ one }) => ({
  profile: one(profiles),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));
```

## Many-to-Many (Junction Table)

```ts
export const posts = pgTable('posts', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: text().notNull(),
});

export const tags = pgTable('tags', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull().unique(),
});

export const postsToTags = pgTable('posts_to_tags', {
  postId: integer('post_id')
    .notNull()
    .references(() => posts.id),
  tagId: integer('tag_id')
    .notNull()
    .references(() => tags.id),
});

export const postsRelations = relations(posts, ({ many }) => ({
  postsToTags: many(postsToTags),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  postsToTags: many(postsToTags),
}));

export const postsToTagsRelations = relations(postsToTags, ({ one }) => ({
  post: one(posts, {
    fields: [postsToTags.postId],
    references: [posts.id],
  }),
  tag: one(tags, {
    fields: [postsToTags.tagId],
    references: [tags.id],
  }),
}));
```

### Querying Many-to-Many

```ts
const postsWithTags = await db.query.posts.findMany({
  with: {
    postsToTags: {
      with: {
        tag: true,
      },
    },
  },
});

const flattenedTags = postsWithTags.map((post) => ({
  ...post,
  tags: post.postsToTags.map((pt) => pt.tag),
}));
```

## Self-Referencing Relations

```ts
export const categories = pgTable('categories', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  parentId: integer('parent_id'),
});

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'parentChild',
  }),
  children: many(categories, {
    relationName: 'parentChild',
  }),
}));
```

### Querying Self-Referencing Relations

```ts
const categoriesWithChildren = await db.query.categories.findMany({
  where: isNull(categories.parentId),
  with: {
    children: {
      with: {
        children: true,
      },
    },
  },
});
```

## Multiple Relations to Same Table

```ts
export const messages = pgTable('messages', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  content: text().notNull(),
  senderId: integer('sender_id')
    .notNull()
    .references(() => users.id),
  receiverId: integer('receiver_id')
    .notNull()
    .references(() => users.id),
});

export const usersRelations = relations(users, ({ many }) => ({
  sentMessages: many(messages, { relationName: 'sender' }),
  receivedMessages: many(messages, { relationName: 'receiver' }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: 'sender',
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: 'receiver',
  }),
}));
```

### Querying Multiple Relations

```ts
const userWithMessages = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    sentMessages: {
      with: { receiver: true },
      orderBy: desc(messages.createdAt),
      limit: 10,
    },
    receivedMessages: {
      with: { sender: true },
      orderBy: desc(messages.createdAt),
      limit: 10,
    },
  },
});
```

## Nested With Clauses

```ts
const result = await db.query.users.findMany({
  with: {
    posts: {
      with: {
        comments: {
          with: {
            author: true,
          },
          orderBy: desc(comments.createdAt),
        },
      },
      where: eq(posts.published, true),
      orderBy: desc(posts.createdAt),
      limit: 5,
    },
    profile: true,
  },
});
```

## Relation Name Disambiguation

When a table has multiple relations to the same target, use `relationName` to disambiguate:

```ts
export const usersRelations = relations(users, ({ many }) => ({
  authoredPosts: many(posts, { relationName: 'author' }),
  editedPosts: many(posts, { relationName: 'editor' }),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
    relationName: 'author',
  }),
  editor: one(users, {
    fields: [posts.editorId],
    references: [users.id],
    relationName: 'editor',
  }),
}));
```

## Schema Organization

```ts
export * from './users';
export * from './posts';
export * from './comments';
export * from './tags';
```

Export all tables and relations from a central `schema/index.ts` file. Pass the combined schema object to the `drizzle()` client to enable all relational queries.

```ts
import * as schema from './schema';

const db = drizzle(client, { schema });
```
