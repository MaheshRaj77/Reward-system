# PNPM ONLY - Package Manager Policy

This project uses **PNPM EXCLUSIVELY**. No other package managers (npm, yarn, bun) are supported or allowed.

## Why PNPM?

- **Speed**: Significantly faster installation times
- **Efficiency**: Hard-linked packages reduce disk space usage
- **Correctness**: Strict dependency resolution prevents version conflicts
- **Consistency**: Deterministic lockfile (`pnpm-lock.yaml`)
- **Security**: Better package management and audit capabilities

## Installation

### First Time Setup

1. **Install Node.js 18 or higher** from [nodejs.org](https://nodejs.org)

2. **Install pnpm globally**

   ```bash
   npm install -g pnpm@latest
   ```

3. **Verify installation**
   ```bash
   pnpm --version
   # Should output: 9.0.0 or higher
   node --version
   # Should output: v18.0.0 or higher
   ```

## Usage

### Install Dependencies

```bash
pnpm install
```

### Add a Package

```bash
pnpm add package-name
```

### Add a Dev Dependency

```bash
pnpm add -D package-name
```

### Remove a Package

```bash
pnpm remove package-name
```

### Run Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
```

### Update Dependencies

```bash
pnpm update
```

## Enforcement Mechanisms

This project has multiple safeguards to enforce PNPM-only usage:

### 1. **package.json Engine Constraints**

```json
"engines": {
  "node": ">=18.0.0",
  "pnpm": ">=9.0.0",
  "npm": "",
  "yarn": ""
}
```

### 2. **Preinstall Hook**

The `preinstall` script prevents npm/yarn:

```json
"preinstall": "npx only-allow pnpm"
```

### 3. **.pnpmrc Configuration**

```
frozen-lockfile=true
strict-peer-dependencies=true
```

## Error Handling

### Error: "This project uses pnpm exclusively"

**If you see this error**, it means you tried using npm or yarn. Solution:

```bash
# Don't use:
npm install    ❌
yarn install   ❌
bun install    ❌

# Use instead:
pnpm install   ✅
```

### Error: "lockfile needs updating"

If you see a frozen lockfile error:

```bash
# Install without updating lockfile
pnpm install --frozen-lockfile

# Or update lockfile (if intentional)
pnpm install
```

## Common Commands Reference

| Task                   | Command                    |
| ---------------------- | -------------------------- |
| Install dependencies   | `pnpm install`             |
| Add package            | `pnpm add package-name`    |
| Add dev dependency     | `pnpm add -D package-name` |
| Remove package         | `pnpm remove package-name` |
| Start dev server       | `pnpm dev`                 |
| Build production       | `pnpm build`               |
| Run linting            | `pnpm lint`                |
| Update all packages    | `pnpm update`              |
| Show outdated packages | `pnpm outdated`            |

## Docker

When using Docker:

```dockerfile
# Install pnpm
RUN npm install -g pnpm@latest

# Install dependencies
RUN pnpm install --frozen-lockfile
```

## CI/CD Pipelines

### GitHub Actions Example

```yaml
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm build
```

## Resources

- [PNPM Official Documentation](https://pnpm.io)
- [PNPM CLI Reference](https://pnpm.io/cli/install)
- [PNPM vs NPM vs Yarn](https://pnpm.io/motivation)

## Questions?

If you have questions about using pnpm, refer to the [PNPM documentation](https://pnpm.io) or ask the team.
