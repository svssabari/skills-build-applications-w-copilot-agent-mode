# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Keep route-specific React components focused on rendering and user interaction. Use the shared API client with relative `/api` paths, and provide accessible loading, empty, and error states without moving business logic into the UI.
- Logic tier decision: Keep Express routes thin and put validation and business rules in the service layer. Return deliberate 4xx responses for invalid input, malformed or missing references, and unknown users; do not allow these cases to become cast-error 500s.
- Data tier decision: Define required fields and appropriate defaults in the Mongoose models, using ObjectId references for relationships. Keep seeding idempotent and preserve unrelated existing records.
- Activity tracking approach: Validate the submitted user and team IDs and confirm both records exist before creating an activity. Persist the submitted type and minutes with server-computed points and an occurrence timestamp.
- Team management approach: Reject a missing or blank name with `400`. Preserve the submitted name and mascot, and store member references as ObjectIds so created and listed teams expose their membership.
- Leaderboard approach: Sum activity points per team, return each team's name and total, and assign 1-based ranks in descending total-points order.
- Workout suggestions approach: Find the user by email and use their fitness goal and recent activity to prioritize matching workouts. Include a reason with each suggestion; return a deliberate 4xx response when no user matches.

## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend` — failures indicate model validation/defaults or seed-data behavior does not meet the persistence contract. Baseline run: 4 of 5 tests failed on missing required-field validation; the seed/idempotency test passed.
- API command: `npm run test:api --prefix octofit-tracker/backend` — failures indicate route/service behavior, validation, relationship handling, or response data does not meet the API contract. Baseline run: all 4 tests failed; invalid activity/team input returned `501`, the leaderboard was empty, and workout suggestions lacked a reason.
- Frontend command: `npm test --prefix octofit-tracker/frontend` — failures indicate a route, API-client, rendering, or accessible loading/empty/error-state contract is unmet. Baseline run: all 15 tests failed while the route components rendered the pending placeholder.
- Backend build command: `npm run build --prefix octofit-tracker/backend` — TypeScript errors indicate the backend implementation does not type-check. Not run in the recorded baseline.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend` — TypeScript or Vite errors indicate the frontend does not type-check or produce a production build. Not run in the recorded baseline.
