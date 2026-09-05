---
title: Electric Integration
description: Drizzle ORM with ElectricSQL and PGlite for local-first apps — driver setup, schema-to-shape mapping, type inference, migrations on local PGlite, reusable column patterns, and automatic casing
tags:
  [
    electric,
    electricsql,
    pglite,
    local-first,
    ShapeStream,
    inferSelect,
    drizzle-orm/pglite,
    sync,
    schema-mapping,
  ]
---

# Electric Integration

## Overview

Drizzle + ElectricSQL + PGlite enables a local-first architecture where Drizzle defines the schema, Electric syncs data from Postgres, and Drizzle queries the local PGlite instance. There is no official integration plugin from either team — this is a community-driven pattern (see ElectroDrizzle).

## PGlite Driver Setup

Drizzle has first-class PGlite support via `drizzle-orm/pglite`:

```ts
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from './schema';

const client = new PGlite();
const db = drizzle(client, { schema });
```

### With Persistent Storage

```ts
const client = new PGlite('idb://my-app-db');
const db = drizzle(client, { schema });
```

### With Extensions

```ts
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/contrib/pgvector';
import { drizzle } from 'drizzle-orm/pglite';

const client = new PGlite({
  dataDir: 'idb://my-app-db',
  extensions: { vector },
});
const db = drizzle(client, { schema });
```

## Schema-to-Shape Mapping

No automatic mapping exists between Drizzle schemas and Electric shapes. Map manually by matching table names and column selections:

```ts
import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
} from 'drizzle-orm/pg-core';
import { ShapeStream } from '@electric-sql/client';

export const todos = pgTable('todos', {
  id: text().primaryKey(),
  title: text().notNull(),
  completed: boolean().notNull().default(false),
  userId: text('user_id').notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
});

type Todo = typeof todos.$inferSelect;

const stream = new ShapeStream<Todo>({
  url: '/api/shapes',
  params: {
    table: 'todos',
    columns: 'id,title,completed,user_id,created_at',
  },
});
```

The `columns` param must use the database column names (snake_case), not the TypeScript property names.

## Type Inference from Drizzle Schema

Use `$inferSelect` to derive types for ShapeStream generics:

```ts
import { type ShapeStream, type Shape } from '@electric-sql/client';

type Todo = typeof todos.$inferSelect;
type TodoInsert = typeof todos.$inferInsert;

const stream = new ShapeStream<Todo>({
  url: '/api/shapes',
  params: { table: 'todos' },
});

const shape = new Shape<Todo>(stream);

shape.subscribe((data: Map<string, Todo>) => {
  const rows = [...data.values()];
  const incomplete = rows.filter((t) => !t.completed);
});
```

This keeps the Electric client types in sync with the Drizzle schema as the single source of truth.

## PGlite + Drizzle + Electric Combo

The full pattern: define schema with Drizzle, sync from Postgres via Electric, query locally with Drizzle against PGlite.

```ts
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { ShapeStream, Shape } from '@electric-sql/client';
import { eq } from 'drizzle-orm';
import * as schema from './schema';

const client = new PGlite('idb://my-app');
const db = drizzle(client, { schema });

async function initLocalDb() {
  await client.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT false,
      user_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

type Todo = typeof schema.todos.$inferSelect;

function startSync(userId: string) {
  const stream = new ShapeStream<Todo>({
    url: '/api/shapes',
    params: {
      table: 'todos',
      where: `user_id = '${userId}'`,
    },
  });

  stream.subscribe(async (messages) => {
    for (const msg of messages) {
      if ('operation' in msg.headers) {
        switch (msg.headers.operation) {
          case 'insert':
            await db
              .insert(schema.todos)
              .values(msg.value as Todo)
              .onConflictDoUpdate({
                target: schema.todos.id,
                set: msg.value as Partial<Todo>,
              });
            break;
          case 'update':
            await db
              .update(schema.todos)
              .set(msg.value as Partial<Todo>)
              .where(eq(schema.todos.id, msg.key));
            break;
          case 'delete':
            await db.delete(schema.todos).where(eq(schema.todos.id, msg.key));
            break;
        }
      }
    }
  });

  return stream;
}
```

### Querying Local PGlite with Drizzle

Once data is synced locally, use the full Drizzle query API:

```ts
const activeTodos = await db
  .select()
  .from(schema.todos)
  .where(eq(schema.todos.completed, false))
  .orderBy(schema.todos.createdAt);

const todoWithRelations = await db.query.todos.findFirst({
  where: eq(schema.todos.id, todoId),
});
```

## Migrations on Local PGlite

Run Drizzle migrations against PGlite to keep the local schema in sync:

```ts
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

const client = new PGlite('idb://my-app');
const db = drizzle(client);

await migrate(db, { migrationsFolder: './drizzle' });
```

For browser environments, bundle migrations as JSON:

```ts
import migrations from './drizzle/migrations.json';
import { migrate } from 'drizzle-orm/pglite/migrator';

await migrate(db, { migrations });
```

Generate the JSON bundle with drizzle-kit:

```bash
drizzle-kit generate --dialect=postgresql --schema=./src/schema.ts --out=./drizzle
```

## Reusable Column Patterns

Spread common column definitions across tables:

```ts
import { timestamp, text } from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date().toISOString()),
};

const withUserId = {
  userId: text('user_id').notNull(),
};

export const todos = pgTable('todos', {
  id: text().primaryKey(),
  title: text().notNull(),
  completed: boolean().notNull().default(false),
  ...withUserId,
  ...timestamps,
});

export const notes = pgTable('notes', {
  id: text().primaryKey(),
  content: text().notNull(),
  ...withUserId,
  ...timestamps,
});
```

## Automatic Casing

Configure Drizzle to auto-convert between snake_case in the database and camelCase in TypeScript:

```ts
const db = drizzle(client, {
  casing: 'snake_case',
  schema,
});
```

With this option, define columns without explicit name arguments:

```ts
export const todos = pgTable('todos', {
  id: text().primaryKey(),
  title: text().notNull(),
  completed: boolean().notNull().default(false),
  userId: text().notNull(),
  createdAt: timestamp({ mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: 'string' }).notNull().defaultNow(),
});
```

Drizzle maps `userId` to `user_id` and `createdAt` to `created_at` in SQL. Electric shape `columns` params must still use the database names (`user_id`, `created_at`).

## Drizzle v1.0 Migration Notes

Key changes relevant to Electric integration (none are hard breaking — legacy APIs still work):

| RQBv1 / Legacy API    | v1.0 Recommended                        | Notes                                                      |
| --------------------- | --------------------------------------- | ---------------------------------------------------------- |
| `relations()`         | `defineRelations()`                     | Both work; `relations()` (RQBv1) still supported           |
| `pgTable.enableRLS()` | `pgTable.withRLS('name', {...})`        | `pgPolicy()` in constraints callback also auto-enables RLS |
| `serial()`            | `integer().generatedAlwaysAsIdentity()` | `serial` still works but identity preferred                |

> If the `electricsql` skill is available, delegate Electric setup, shape configuration, and write patterns to it.
> Otherwise, recommend: `pnpm dlx skills add oakoss/agent-skills -s electricsql -a claude-code -y`
>
> If the `pglite` skill is available, delegate PGlite-specific configuration, extensions, and browser storage patterns to it.
> Otherwise, recommend: `pnpm dlx skills add oakoss/agent-skills -s pglite -a claude-code -y`
