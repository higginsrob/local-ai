# Development Guide

## TypeScript Setup

This project uses a **dual TypeScript workflow**:

### Development Mode (No Compilation)
- Uses Node.js `--experimental-strip-types` feature
- Direct execution of TypeScript files
- Faster iteration during development
- Imports use `.ts` extensions

**Commands:**
```bash
npm start                    # Run the CLI
npm test                     # Run tests
npm run typecheck           # Type checking only
```

### Production Mode (Compiled)
- TypeScript compiled to JavaScript
- Published to NPM as compiled code
- Works in standard Node.js environments (where type stripping isn't available in node_modules)
- Imports are rewritten from `.ts` to `.js` during build

**Commands:**
```bash
npm run build               # Compile TypeScript
npm run clean               # Clean build artifacts
node bin/ai.js              # Run compiled version
```

## Build Process

The build process (`scripts/build.js`):
1. Copies source files to `.build/` directory
2. Rewrites all `.ts` import extensions to `.js`
3. Compiles TypeScript using `tsconfig.build.json`
4. Outputs to `dist/` directory
5. Cleans up temporary `.build/` directory

## Publishing to NPM

The `prepublishOnly` script automatically:
1. Cleans previous builds
2. Compiles TypeScript
3. Runs tests
4. Packages only the compiled `dist/` folder

**What gets published:**
- `bin/` - CLI entry point (points to `dist/index.js`)
- `dist/` - Compiled JavaScript + type definitions
- `README.md`, `LICENSE`, `package.json`

**What's excluded:**
- `src/` - TypeScript source files
- `tests/` - Test files
- `.build/` - Temporary build directory
- Development configuration files

## Why This Approach?

Node.js's `--experimental-strip-types` feature only works for:
- Files directly executed
- Local project files

It **does NOT work** for:
- Files in `node_modules/`
- npm packages

This is why we need compilation for NPM distribution, but can use type stripping during local development.

