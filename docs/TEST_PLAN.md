# Test Plan — FreshTrack

Run these tests locally and update the result after executing each step. Do not mark a test as passed based only on code inspection.

| ID | Test | Steps | Expected result | Actual result |
|---|---|---|---|---|
| T01 | Database setup | Inspect the configured database after initialization | Tables, view, trigger, indexes and sample rows exist | Live tables/constraints were inspected; scripts were not rerun to avoid modifying the existing database |
| T02 | Dashboard load | Open `/` | Metrics and expiry watchlist render | Passed: dashboard returned HTTP 200 and contained the expected page |
| T03 | Add inventory | Submit valid product, positive quantity and expiry date | New batch appears in inventory and dashboard | Not tested in audit; avoided writing a test batch to live data |
| T04 | Required fields | Submit inventory with blank product name | Browser/API validation rejects request | Passed: inventory API returned HTTP 400 |
| T05 | Invalid quantity | Submit zero inventory quantity and negative waste quantity | Requests are rejected | Passed: both APIs returned HTTP 400 |
| T06 | Expiry classification | Use batches expiring yesterday, today, tomorrow and within seven days | Labels match rule boundaries | Logic reviewed; boundary cases not runtime-tested |
| T07 | Record waste | Record waste quantity not exceeding stock | Waste row is created and stock decreases | Not tested in audit; avoided writing to live data |
| T08 | Insufficient stock | Request more stock than available | Clear HTTP 409 error; no waste row should be created | Passed: API returned HTTP 409; row counts unchanged |
| T09 | Waste summary | Compare dashboard totals with read-only SQL aggregates | 30-day loss/top waste summary matches PostgreSQL | Dashboard totals matched read-only PostgreSQL aggregates; waste quantities display by unit |
| T10 | Mongo event log | Query the collection and group by event type | Event documents and type counts are returned | Passed: MongoDB connected; integration check confirmed aggregation counts equal document count |
| T11 | SQL view | Run `SELECT * FROM v_inventory_expiry_risk` | Risk rows are returned | Passed: read-only query returned 3 active risk rows |
| T12 | SQL trigger | Update an inventory batch | `updated_at` changes | Trigger and all 4 expected indexes exist; update behavior not exercised on live data |
| T13 | Database constraints | Try a negative quantity directly in SQL | CHECK constraint rejects it | Constraint definitions inspected; negative-write test not run |
| T14 | Query examples | Review/run `sql/important_queries.sql` | Read queries run; transaction demo rolls back | Script reviewed; not executed against live inventory |
| T15 | Build and types | Run `npm run build` and `npx tsc --noEmit` | Production build and type-check pass | Passed: final production build and standalone type-check succeeded |
| T16 | Lint | Run `npm run lint` | Lint exits with findings or success | Passed: configured Next.js ESLint; no warnings or errors |
| T17 | Inventory edit | Edit a batch and reload inventory | Updated quantity and dates persist | Invalid IDs and date order returned HTTP 400; valid edit/persistence not tested to avoid modifying live records |
| T18 | DML demonstration | Review `sql/dml_demo.sql` | Temporary demo product/batch insert, update and delete all roll back | Script reviewed; not executed against live data |
| T19 | Safe integration suite | Run `npm test` with local app and DB services running | Read routes, aggregates, validation, insufficient-stock handling and Mongo aggregation are verified without writes | Passed: 7 tests, 0 failures; database row counts unchanged |

## Audit verification record

Audit date: 2026-10-24. The final production build, standalone type-check, ESLint run, and safe integration suite passed. The dashboard and GET APIs returned successfully, and PostgreSQL/MongoDB read-only checks succeeded. The live database contained 3 positive-stock batches and 4 waste records at the time of inspection. The expiry view returned 3 rows, its update trigger and all 4 expected indexes were present, and invalid/insufficient-stock API requests were rejected without changing row counts. No test rows were inserted and no existing records were deleted or reset.

## Evidence checklist
- Screenshot of dashboard.
- Screenshot of inventory entry and populated batch table.
- Screenshot of waste entry and waste history.
- pgAdmin screenshot showing schema and view query.
- MongoDB screenshot showing `inventory_events` documents and aggregation.
- GitHub commit history showing each contributor's genuine work.
