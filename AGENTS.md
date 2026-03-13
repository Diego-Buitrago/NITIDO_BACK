# Repository Guidelines

## Project Structure & Module Organization
- src/index.ts bootstraps the Express server, applies middleware, and mounts the feature routes under src/routes.
- Keep handlers in src/controller, pairing files with their route (e.g., usersRoutes.ts <-> usersController.ts).
- Shared types live in src/interfaces, reusable helpers in src/utils, and database access in src/db (connection.ts plus SQL scripts).
- Middleware such as uthJwt.ts and errorHandler.ts stays in src/middleware; add new middleware here and export from the index.
- The TypeScript compiler emits JavaScript to dist/; never edit generated files directly.

## Build, Test, and Development Commands
- yarn install installs dependencies; re-run after adding packages.
- yarn dev starts Nodemon with 	s-node for hot-reloaded development on port process.env.PORT.
- yarn build compiles TypeScript using the ES2020/CommonJS target and outputs to dist/.
- yarn start runs the compiled server from dist/index.js; run this in production-like scenarios.

## Coding Style & Naming Conventions
- Use 2-space indentation, single quotes, and terminate statements with semicolons as in src/index.ts.
- Name route files eatureRoutes.ts, controller files eatureController.ts, and keep exported functions in camelCase (createCustomer).
- Prefer descriptive middleware names (erifyToken) and keep comments concise and bilingual only when required for clarity.
- Type all public function signatures; extend interfaces in src/interfaces rather than duplicating shapes.

## Testing Guidelines
- yarn test is a placeholder; when adding coverage, wire Jest + Supertest and locate specs under src/__tests__ with the suffix .spec.ts.
- Mock database calls via dependency injection or test containers; keep integration tests idempotent to protect shared Postgres instances.
- Add at least one regression test whenever you touch a route or controller to lock expected HTTP status codes and payload shapes.

## Commit & Pull Request Guidelines
- Follow the existing short, Spanish-toned subject lines (Ajuste calculo stock producto); start with a capital letter and stay under 60 characters.
- Group related changes per commit and describe the functional outcome rather than the mechanics.
- PRs should link the relevant Jira/task ID, summarize behavioural changes, list new routes or env vars, and include screenshots of API responses when helpful.

## Environment & Configuration
- Copy .env.template to .env and fill the Postgres and JWT values before running yarn dev.
- Keep secrets out of source; share database credentials via the secure vault and rotate JWT_SECRET after incidents.
