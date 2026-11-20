# FreshTrack configuration line guide

These notes explain the configuration values that tell npm, TypeScript and Next.js how to run FreshTrack. Line numbers refer to the configuration files in the project. npm and ESLint read JSON, so their notes live here as a reference.

## package.json

| Line | Meaning |
|---|---|
| 1 | Starts the npm package manifest. |
| 2 | Names the package. |
| 3 | Sets the project version. |
| 4 | Prevents accidental publishing of this private package to npm. |
| 5 | Starts the command shortcuts available through npm. |
| 6 | Starts Next.js in development with automatic reloads. |
| 7 | Compiles an optimized production build. |
| 8 | Serves the compiled production build. |
| 9 | Runs the Next.js lint command. |
| 10 | Runs the FreshTrack integration suite through the Node.js test runner. |
| 11 | Ends the command shortcuts. |
| 12 | Starts the packages used at runtime. |
| 13 | Adds bcrypt password hashing and comparison. |
| 14 | Adds JWT creation and verification for sessions. |
| 15 | Adds the MongoDB client that writes the event log. |
| 16 | Adds the Next.js framework used for pages and API handlers. |
| 17 | Adds the PostgreSQL driver and connection pool. |
| 18 | Adds React components and hooks. |
| 19 | Adds React rendering for the browser and server. |
| 20 | Declares the Recharts charting dependency. |
| 21 | Ends the runtime dependencies. |
| 22 | Starts the development dependencies. |
| 23 | Provides TypeScript declarations for bcryptjs. |
| 24 | Provides TypeScript declarations for Node.js APIs. |
| 25 | Provides TypeScript declarations for the PostgreSQL driver. |
| 26 | Provides TypeScript declarations for React. |
| 27 | Provides TypeScript declarations for React DOM. |
| 28 | Adds ESLint for source checks. |
| 29 | Adds the lint rules shared by Next.js projects. |
| 30 | Adds the library used by the PowerPoint generation script. |
| 31 | Adds the TypeScript compiler and type checker. |
| 32 | Ends the development dependencies. |
| 33 | Ends the npm manifest. |

## tsconfig.json

- **Line 1** starts the TypeScript project configuration.
- **Line 2** defines the compiler options.
  - **target** uses ES2017 as the JavaScript language baseline for TypeScript.
  - **lib** includes browser DOM types, iterable DOM types and current standard JavaScript types.
  - **allowJs** lets JavaScript files participate in the TypeScript project.
  - **skipLibCheck** skips checking the internals of dependency declaration files.
  - **strict** enables TypeScript's strict checking options.
  - **noEmit** leaves JavaScript generation to Next.js.
  - **esModuleInterop** enables interoperation with CommonJS modules.
  - **module** uses modern ECMAScript modules.
  - **moduleResolution** resolves imports using rules appropriate for a bundler.
  - **resolveJsonModule** lets code import JSON with inferred types.
  - **isolatedModules** checks that individual files can be transformed independently.
  - **jsx** preserves JSX syntax for Next.js to compile.
  - **incremental** caches type-checking information for subsequent runs.
  - **plugins** adds the Next.js TypeScript language service plugin.
  - **paths** maps imports beginning with the at-sign and a slash to the project root.
- **Line 3** includes Next.js declarations, project TypeScript and TSX files, and generated Next.js types. It excludes node_modules from the project's file discovery.
- **Line 4** ends the configuration object.

## ESLint configuration

| Line in .eslintrc.json | Meaning |
|---|---|
| 1 | Starts the lint configuration object. |
| 2 | Applies the Next.js Core Web Vitals rule set. |
| 3 | Ends the lint configuration object. |

## Generated files

- **next-env.d.ts**, line 1, references the types shared by Next.js projects. Line 2 adds the global types for Next.js image imports. Lines 4 and 5 explain that Next.js generates this file and point to its TypeScript setup documentation.
- **package-lock.json** records versions resolved by npm for direct and transitive dependencies. The root entry describes this project. Dependency entries record details such as the installed version, package source, integrity hash and dependency relationships.
- **tsconfig.tsbuildinfo** stores TypeScript's incremental compilation cache. Files in **.next** are Next.js build outputs, and **node_modules** contains installed dependencies.
