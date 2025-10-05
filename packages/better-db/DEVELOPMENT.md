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
# Run all better-db tests
pnpm test --filter "@better-db/*"

# Run specific package tests
pnpm test --filter "@better-db/core"
pnpm test --filter "@better-db/cli"

# Test CLI functionality manually
npx better-db init --output=test-schema.ts
npx better-db generate --config=test-schema.ts --orm=prisma --yes
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
   - Available commands: `init`, `generate`, `migrate`

4. **Plugin Changes** (packages/better-db/plugins/):
   - Add new reusable table definitions
   - Follow Better Auth plugin schema format
   - Update exports in `src/index.ts`

## Upstream Sync Process

### Branching Strategy

This fork maintains `main` branch in sync with better-auth's `main` branch:

```bash
# One-time setup: Add upstream remote
git remote add upstream https://github.com/better-auth/better-auth.git

# Sync fork's main with better-auth upstream
git fetch upstream
git checkout main
git merge upstream/main
```

### GitHub Actions Management

To prevent merge conflicts and allow seamless syncing, workflows that should only run on upstream better-auth (not on forks) have been modified with repository conditionals:

```yaml
if: github.repository == 'better-auth/better-auth'
```

**Workflows that skip on forks:**
- `release.yml` - npm publishing (only for upstream better-auth releases)
- `main-protect.yml` - upstream branching rules enforcement
- `branch-rules.yml` - upstream branching rules enforcement
- `preview.yml` - preview builds (requires pkg-pr-new GitHub App)

**Workflows that run on forks:**
- `ci.yml` - tests, builds, linting
- `e2e.yml` - integration tests

**Fork-specific workflows (only run on your fork):**
- `better-db-release.yml` - Publishes @better-db/* packages to npm
  - Triggered by tags matching `better-db-v*`
  - Automatically determines npm dist-tag (latest, beta, etc.)
  - Uses inverse condition: `if: github.repository != 'better-auth/better-auth'`

This approach ensures:
- No merge conflicts when syncing workflows from upstream
- Fork-specific development workflow remains unaffected
- Upstream workflows automatically update when syncing

### When Better Auth Releases Updates

1. **Sync Main Branch**: Pull latest changes from better-auth's `main`
2. **Review Changes**: Check Better Auth changelog for adapter/database changes
3. **Test Compatibility**: Run integration tests to ensure nothing breaks
4. **Update Wrappers**: Add any new exports that should be exposed in `@better-db/*` packages
5. **Version Bump**: Update all `@better-db/*` packages to match Better Auth minor version
6. **Test Generation**: Verify CLI still generates correct schema files

## CLI Implementation Details

The CLI wrapper works by:

1. **Parsing Better DB Schema**: Load user's `defineDb()` schema definition
2. **Converting to Better Auth Format**: Transform to Better Auth plugin schema
3. **Creating Temporary Config**: Generate a temporary Better Auth config file
4. **Forwarding to Better Auth CLI**: Run `@better-auth/cli` commands with temp config
5. **Filtering Auth Models**: Exclude user/session/account tables from output
6. **Cleanup**: Remove temporary files

### Commands

**`init`** - Create a new better-db schema file
- Generates a `db.ts` template with example tables
- Supports custom output path via `--output`

**`generate`** - Generate ORM schema files
- Forwards to `@better-auth/cli generate`
- Supports Prisma, Drizzle, and Kysely
- Uses `spawn` with `stdio: "inherit"` to handle interactive prompts
- Auto-cleans up temporary config files

**`migrate`** - Run database migrations
- Forwards to `@better-auth/cli migrate`
- Only works with Kysely's built-in adapter
- For Prisma/Drizzle, users should use their native migration tools

Key files:
- `packages/better-db/cli/src/commands/init.ts` - Schema initialization
- `packages/better-db/cli/src/commands/generate.ts` - Schema generation logic
- `packages/better-db/cli/src/commands/migrate.ts` - Migration wrapper

## Testing Strategy

### Unit Tests
- Field builder API (core/test/)
- Schema transformation (core/test/)
- Plugin composition (core/test/)
- Schema definition and conversion (cli/test/)

### Integration Tests  
- Better DB DSL functionality (core/test/integration.test.ts)
- Plugin system with multiple plugins (cli/test/generate.test.ts)
- Field types and modifiers (cli/test/generate.test.ts)
- References and relationships (cli/test/generate.test.ts)

### CLI Tests
- Schema creation with defineDb (cli/test/generate.test.ts)
- Plugin merging (cli/test/generate.test.ts)
- Field attribute preservation (cli/test/generate.test.ts)
- All field types (cli/test/generate.test.ts)

### Compatibility Tests
- Better Auth version compatibility
- Adapter re-export validation
- Type checking

## Release Process

### Automated Release (Recommended)

Better DB uses a tag-based release workflow that automatically publishes to npm.

**Prerequisites:**
- Add `NPM_TOKEN` secret to your GitHub repository settings
  - Go to Settings → Secrets and variables → Actions → New repository secret
  - Create an npm access token at https://www.npmjs.com/settings/tokens

**Release Method 1: GitHub UI (Easiest)**

1. Update package versions locally:
   ```bash
   cd packages/better-db
   pnpm version <major|minor|patch> --workspace
   git add .
   git commit -m "chore: bump better-db to v1.x.x"
   git push
   ```

2. Create release from GitHub:
   - Go to: https://github.com/[your-username]/better-auth/releases/new
   - Click "Choose a tag" → Type `better-db-v1.4.0` → "Create new tag on publish"
   - Add release title and notes
   - Click "Publish release"

**Release Method 2: Command Line**

```bash
# 1. Update versions in all better-db packages
cd packages/better-db
pnpm version <major|minor|patch> --workspace

# 2. Commit and push version changes
git add .
git commit -m "chore: release better-db v1.4.0"
git push

# 3. Create and push git tag
git tag better-db-v1.4.0
git push origin better-db-v1.4.0
```

The GitHub Action `better-db-release.yml` will automatically:
- Create a changelog using changelogithub
- Build all packages
- Copy `packages/better-db/README.md` to each package directory
- Publish to npm with appropriate tag and README included

**Tag naming conventions:**
- Stable releases: `better-db-v1.4.0` → npm tag `latest`
- Pre-releases: `better-db-v1.4.0-beta.1` → npm tag `beta`
- Supported pre-release tags: `alpha`, `beta`, `rc`, `canary`, `next`

### Manual Release

If needed, you can manually publish:

```bash
# 1. Build all packages
pnpm run build --filter "@better-db/*"

# 2. Publish from each package directory
cd packages/better-db/core
pnpm publish --access public --tag latest
# Repeat for cli, plugins, and each adapter
```

### Pre-Release Checklist

1. **Test Latest Better Auth**: Ensure compatibility with latest BA version
2. **Update Versions**: Bump all package versions consistently
3. **Build All Packages**: Verify clean builds for all adapters
4. **Test CLI**: Verify generation works for all supported ORMs
5. **Update Docs**: Update README with any API changes
6. **Create Tag**: Push git tag to trigger automated release

## Package README Management

All `@better-db/*` packages share a single README located at `packages/better-db/README.md`.

**How it works:**
- During the release process, the main README is automatically copied to each package directory
- Each package's `package.json` includes `"README.md"` in the `files` array
- The `homepage` field points to the better-db folder on GitHub
- The `.gitignore` excludes copied READMEs from version control

**Why this approach:**
- Single source of truth for documentation
- No duplicate READMEs to maintain
- Each npm package shows the correct better-db README
- Users see the full better-db docs instead of the main better-auth README

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