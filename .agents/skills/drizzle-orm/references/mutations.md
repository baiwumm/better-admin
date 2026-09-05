---
title: Mutations
description: Insert, update, delete, upsert with onConflictDoUpdate, returning clause, batch inserts, and transactions
tags:
  [
    insert,
    update,
    delete,
    upsert,
    onConflictDoUpdate,
    returning,
    transactions,
    batch,
  ]
---

# Mutations

## Insert

### Single Row

```ts
const [newUser] = await db
  .insert(users)
  .values({
    name: 'John',
    email: 'john@example.com',
  })
  .returning();
```

### Batch Insert

```ts
const newUsers = await db
  .insert(users)
  .values([
    { name: 'John', email: 'john@example.com' },
    { name: 'Jane', email: 'jane@example.com' },
    { name: 'Bob', email: 'bob@example.com' },
  ])
  .returning();
```

### Insert with Partial Returning

```ts
const [{ id, email }] = await db
  .insert(users)
  .values({ name: 'John', email: 'john@example.com' })
  .returning({ id: users.id, email: users.email });
```

### Insert from Select

```ts
await db
  .insert(archivedUsers)
  .select(db.select().from(users).where(eq(users.isActive, false)));
```

## Update

### Basic Update

```ts
const [updated] = await db
  .update(users)
  .set({ name: 'Updated Name' })
  .where(eq(users.id, userId))
  .returning();
```

### Update Multiple Columns

```ts
const [updated] = await db
  .update(users)
  .set({
    name: 'New Name',
    email: 'new@example.com',
    updatedAt: new Date(),
  })
  .where(eq(users.id, userId))
  .returning();
```

### Update with SQL Expressions

```ts
import { sql } from 'drizzle-orm';

await db
  .update(posts)
  .set({
    viewCount: sql`${posts.viewCount} + 1`,
  })
  .where(eq(posts.id, postId));
```

## Delete

### Basic Delete

```ts
await db.delete(users).where(eq(users.id, userId));
```

### Delete with Returning

```ts
const [deleted] = await db
  .delete(users)
  .where(eq(users.id, userId))
  .returning();
```

### Soft Delete Pattern

```ts
await db
  .update(posts)
  .set({ deletedAt: new Date() })
  .where(eq(posts.id, postId));
```

## Upsert (ON CONFLICT)

### Upsert on Single Column

```ts
await db
  .insert(users)
  .values({
    id: 1,
    name: 'John',
    email: 'john@example.com',
  })
  .onConflictDoUpdate({
    target: users.id,
    set: { name: 'John Updated', email: 'john-updated@example.com' },
  });
```

### Upsert on Composite Key

```ts
await db
  .insert(userSettings)
  .values({
    userId: 1,
    key: 'theme',
    value: 'dark',
  })
  .onConflictDoUpdate({
    target: [userSettings.userId, userSettings.key],
    set: { value: 'dark' },
  });
```

### Upsert with Where Clause

```ts
await db
  .insert(users)
  .values({ id: 1, name: 'John', email: 'john@example.com' })
  .onConflictDoUpdate({
    target: users.email,
    set: { name: 'John Updated' },
    where: eq(users.isActive, true),
  });
```

### On Conflict Do Nothing

```ts
await db
  .insert(users)
  .values({ name: 'John', email: 'john@example.com' })
  .onConflictDoNothing();

await db
  .insert(users)
  .values({ name: 'John', email: 'john@example.com' })
  .onConflictDoNothing({ target: users.email });
```

## Transactions

### Basic Transaction

```ts
await db.transaction(async (tx) => {
  const [user] = await tx
    .insert(users)
    .values({ name: 'John', email: 'john@example.com' })
    .returning();

  await tx.insert(profiles).values({
    userId: user.id,
    bio: 'Hello world',
  });
});
```

### Transaction with Rollback

```ts
await db.transaction(async (tx) => {
  await tx.insert(users).values({ name: 'John', email: 'john@example.com' });

  const balance = await tx.query.accounts.findFirst({
    where: eq(accounts.userId, userId),
  });

  if (!balance || balance.amount < requiredAmount) {
    tx.rollback();
  }

  await tx
    .update(accounts)
    .set({ amount: sql`${accounts.amount} - ${requiredAmount}` })
    .where(eq(accounts.userId, userId));
});
```

### Nested Transactions (Savepoints)

```ts
await db.transaction(async (tx) => {
  await tx.insert(users).values({ name: 'John', email: 'john@example.com' });

  try {
    await tx.transaction(async (nestedTx) => {
      await nestedTx.insert(posts).values({ title: 'Post', authorId: 1 });
      throw new Error('Rollback nested only');
    });
  } catch {
    // Nested transaction rolled back, outer continues
  }

  await tx.insert(logs).values({ message: 'User created without post' });
});
```

### Transaction Isolation Levels

```ts
await db.transaction(
  async (tx) => {
    const [user] = await tx.query.users.findFirst({
      where: eq(users.id, userId),
    });
    await tx
      .update(accounts)
      .set({ balance: user.balance - amount })
      .where(eq(accounts.userId, userId));
  },
  {
    isolationLevel: 'serializable',
  },
);
```

Supported levels: `read uncommitted`, `read committed`, `repeatable read`, `serializable`.

## Patterns

### Create or Fail

```ts
async function createUser(data: NewUser): Promise<User> {
  const [user] = await db.insert(users).values(data).returning();
  return user;
}
```

### Update or Throw

```ts
async function updateUser(id: number, data: Partial<NewUser>): Promise<User> {
  const [user] = await db
    .update(users)
    .set(data)
    .where(eq(users.id, id))
    .returning();

  if (!user) {
    throw new Error(`User ${id} not found`);
  }
  return user;
}
```

### Batch Operations in Transaction

```ts
async function transferFunds(fromId: number, toId: number, amount: number) {
  await db.transaction(async (tx) => {
    await tx
      .update(accounts)
      .set({ balance: sql`${accounts.balance} - ${amount}` })
      .where(eq(accounts.id, fromId));

    await tx
      .update(accounts)
      .set({ balance: sql`${accounts.balance} + ${amount}` })
      .where(eq(accounts.id, toId));
  });
}
```
