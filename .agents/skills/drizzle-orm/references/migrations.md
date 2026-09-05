---
title: Migrations
description: Drizzle Kit commands for generate, migrate, push, pull, and studio, plus drizzle.config.ts setup and migration strategies
tags:
  [
    drizzle-kit,
    generate,
    migrate,
    push,
    pull,
    studio,
    drizzle-config,
    migration,
  ]
---

# Migrations

## drizzle.config.ts

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Multi-File Schema

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/*.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### MySQL Configuration

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'mysql',
  schema: './src/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### SQLite Configuration

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: './sqlite.db',
  },
});
```

### Custom Migration Table

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    table: 'migrations',
    schema: 'public',
  },
});
```

## Drizzle Kit Commands

### generate

Reads your schema files and generates SQL migration files based on changes.

```bash
npx drizzle-kit generate
```

Produces a timestamped migration folder:

```text
drizzle/
├── 0000_initial/
│   └── migration.sql
├── 0001_add_posts/
│   └── migration.sql
└── meta/
    └── _journal.json
```

### migrate

Applies pending migration files to the database.

```bash
npx drizzle-kit migrate
```

### push

Pushes schema changes directly to the database without creating migration files. Useful for prototyping and development.

```bash
npx drizzle-kit push
```

### pull (Introspection)

Reads an existing database schema and generates Drizzle schema TypeScript files.

```bash
npx drizzle-kit pull
```

### studio

Launches Drizzle Studio, a browser-based database GUI.

```bash
npx drizzle-kit studio
```

## Programmatic Migrations

### PostgreSQL with node-postgres

```ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const db = drizzle(process.env.DATABASE_URL!);

await migrate(db, { migrationsFolder: './drizzle' });
```

### PostgreSQL with Neon Serverless

```ts
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

const db = drizzle(process.env.DATABASE_URL!);

await migrate(db, { migrationsFolder: './drizzle' });
```

### SQLite with better-sqlite3

```ts
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

const db = drizzle('./sqlite.db');

migrate(db, { migrationsFolder: './drizzle' });
```

## Migration Strategies

### Development Workflow

Use `push` for fast iteration during development:

```bash
npx drizzle-kit push
```

Switch to `generate` + `migrate` when you need reproducible, versioned migrations for staging/production.

### Production Workflow

```bash
npx drizzle-kit generate

git add drizzle/
git commit -m "feat: add posts table migration"

npx drizzle-kit migrate
```

### CI/CD Migration Script

```ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

async function runMigrations() {
  const db = drizzle(process.env.DATABASE_URL!);

  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations complete.');

  process.exit(0);
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

### Migrating from Another ORM

Pull existing schema, then manage with Drizzle going forward:

```bash
npx drizzle-kit pull

npx drizzle-kit generate
```

## Migration SQL Format

Generated SQL files use `-->` statement breakpoints:

```sql
CREATE TABLE "users" (
  "id" INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE
);
--> statement-breakpoint
CREATE TABLE "posts" (
  "id" INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "title" TEXT NOT NULL,
  "author_id" INTEGER NOT NULL REFERENCES "users"("id")
);
```

## Configuration Reference

| Option          | Description                                    | Required |
| --------------- | ---------------------------------------------- | -------- |
| `dialect`       | `postgresql`, `mysql`, or `sqlite`             | Yes      |
| `schema`        | Path to schema file(s), supports globs         | Yes      |
| `out`           | Output directory for migrations                | No       |
| `dbCredentials` | Database connection details                    | Yes      |
| `migrations`    | Custom migration table/schema configuration    | No       |
| `verbose`       | Log SQL statements during migration            | No       |
| `strict`        | Prompt for confirmation on destructive changes | No       |
| `tablesFilter`  | Array of table name patterns to include        | No       |

## Common Drizzle Kit Errors

| Error                   | Cause                                          | Fix                                             |
| ----------------------- | ---------------------------------------------- | ----------------------------------------------- |
| `No schema files found` | Wrong `schema` path in config                  | Verify the path matches your schema location    |
| `Cannot find module`    | Missing drizzle-kit dependency                 | `npm install -D drizzle-kit`                    |
| `Migration failed`      | SQL syntax error or constraint violation       | Check the generated SQL, fix schema, regenerate |
| `Table already exists`  | Running initial migration on existing database | Use `pull` first to sync existing schema        |
