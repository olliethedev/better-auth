# Better DB - Development Guide

This document provides information for contributors and maintainers of Better DB.

## Architecture Overview

Better DB is designed as a **thin wrapper** around Better Auth's database layer. This architecture allows us to:

1. **Reuse Battle-tested Code**: Leverage Better Auth's proven adapter implementations
2. **Stay Upstream Syncable**: Minimal changes mean easy merging of Better Auth updates  
3. **Provide Clean API**: Expose only database-focused functionality
4. **Maintain Compatibility**: Ensure compatibility with Better Auth's ecosystem

## Package Structure

```
packages/better-db/
├── core/                    # @better-db/core - Main DSL and types
├── cli/                     # @better-db/cli - Schema generation CLI  
├── adapter-prisma/          # @better-db/adapter-prisma - Prisma adapter wrapper
├── adapter-drizzle/         # @better-db/adapter-drizzle - Drizzle adapter wrapper
├── adapter-kysely/          # @better-db/adapter-kysely - Kysely adapter wrapper
├── adapter-memory/          # @better-db/adapter-memory - Memory adapter wrapper
├── adapter-mongodb/         # @better-db/adapter-mongodb - MongoDB adapter wrapper
├── plugins/                 # @better-db/plugins - Common plugins and utilities
└── test/                    # Integration tests
```

## Key Principles

### 1. Wrapper-First Architecture

**DO**: Create thin wrappers that re-export Better Auth functionality
```typescript
// ✅ Good - simple re-export
export * from "better-auth/adapters/prisma";
```

**DON'T**: Fork or copy Better Auth logic
```typescript  
// ❌ Bad - duplicating logic
export function createPrismaAdapter(prisma) {
  // ... reimplemented adapter logic
}
```

### 2. Minimal Surface Area Changes

We only add:
- `defineDb()` DSL for schema definition
- Plugin system compatible with Better Auth
- CLI wrapper that filters auth domain models
- Type utilities for better DX

Everything else should be a direct re-export.

### 3. Better Auth Compatibility

- Import from Better Auth paths internally: `import ... from "better-auth/..."`
- Export under `@better-db/*` for users: `export * from "..."`
- Pin versions to match Better Auth: `@better-db/*@1.4.x` tracks `better-auth@1.4.x`

## Development Workflow

### Setup

```bash
# Install dependencies
pnpm install

# Build Better Auth first (required for our wrappers)
pnpm run build --filter better-auth

# Build Better DB packages
pnpm run build --filter "@better-db/*"
```

### Testing

```bash
# Run integration tests
cd packages/better-db
npx tsx test/integration.test.ts

# Test CLI functionality
npx better-db init --output=test-schema.ts
npx better-db generate --config=test-schema.ts --orm=prisma
```

### Making Changes

1. **Core Changes** (packages/better-db/core/):
   - Modify DSL, types, or plugin system
   - Ensure compatibility with Better Auth's schema format
   - Update type exports in `src/index.ts`

2. **Adapter Changes** (packages/better-db/adapter-*/):
   - Should only be re-export changes
   - Update `src/index.ts` if Better Auth changes exports

3. **CLI Changes** (packages/better-db/cli/):
   - Modify wrapper logic to filter auth models
   - Update command forwarding to Better Auth CLI
   - Test with various ORMs (Prisma, Drizzle, Kysely)

4. **Plugin Changes** (packages/better-db/plugins/):
   - Add new reusable table definitions
   - Follow Better Auth plugin schema format
   - Update exports in `src/index.ts`

## Upstream Sync Process

When Better Auth releases updates:

1. **Review Changes**: Check Better Auth changelog for adapter/database changes
2. **Update Dependencies**: Bump `better-auth` version in package.json files  
3. **Test Compatibility**: Run integration tests to ensure nothing breaks
4. **Update Wrappers**: Add any new exports that should be exposed
5. **Version Bump**: Update all `@better-db/*` packages to match Better Auth minor version
6. **Test Generation**: Verify CLI still generates correct schema files

## CLI Implementation Details

The CLI wrapper works by:

1. **Parsing Better DB Schema**: Load user's `defineDb()` schema definition
2. **Converting to Better Auth Format**: Transform to Better Auth plugin schema
3. **Creating Temporary Config**: Generate a temporary Better Auth config file
4. **Forwarding to Better Auth CLI**: Run `@better-auth/cli generate` with temp config
5. **Filtering Auth Models**: Exclude user/session/account tables from output
6. **Cleanup**: Remove temporary files

Key files:
- `packages/better-db/cli/src/commands/generate.ts` - Main generation logic
- `packages/better-db/cli/src/commands/init.ts` - Schema initialization

## Testing Strategy

### Unit Tests
- Field builder API
- Schema transformation
- Plugin composition

### Integration Tests  
- End-to-end schema generation for each ORM
- Plugin system functionality
- CLI command execution

### Compatibility Tests
- Better Auth version compatibility
- Adapter re-export validation
- Type checking

## Release Process

1. **Test Latest Better Auth**: Ensure compatibility with latest BA version
2. **Update Versions**: Bump all package versions to match BA minor version
3. **Build All Packages**: Verify clean builds for all adapters
4. **Test CLI**: Verify generation works for all supported ORMs
5. **Update Docs**: Update README with any API changes
6. **Publish**: Release all packages simultaneously

## Common Issues

### Module Resolution Errors
- **Cause**: Better Auth not built or wrong import paths
- **Solution**: Build Better Auth first: `pnpm run build --filter better-auth`

### CLI Generation Failures  
- **Cause**: Schema format incompatibility
- **Solution**: Check `toBetterAuthSchema()` conversion in core package

### Type Errors
- **Cause**: Better Auth types not properly re-exported  
- **Solution**: Update type exports in wrapper packages

## Contributing Guidelines

1. **Follow Wrapper Pattern**: Don't duplicate Better Auth logic
2. **Test Upstream Compatibility**: Ensure changes work with latest Better Auth
3. **Keep Diffs Small**: Minimal changes for easy upstream syncing  
4. **Update Tests**: Add integration tests for new functionality
5. **Document Changes**: Update README and development docs

## Maintenance Checklist

- [ ] Monitor Better Auth releases for database changes
- [ ] Keep dependency versions aligned  
- [ ] Test CLI generation with latest Better Auth
- [ ] Update documentation for any API changes
- [ ] Verify all adapter re-exports are current
- [ ] Check integration tests pass with latest dependencies