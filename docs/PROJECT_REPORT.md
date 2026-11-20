# Smart Food Expiry & Waste Prediction System

**Course:** DBMS Experiential Learning — Level 3  
**Institution:** PES University (edit if your course section requires another format)  
**Team members:** Bhuvan Raj H (PES1UG25CS808), Tanmay Sridhar (PES1UG25CS849)
**Faculty:** [Add faculty name]  
**Academic year:** 2026–27

## 1. Abstract
FreshTrack is a web-based food inventory and waste-recording prototype intended for small restaurants, cafes and grocery stores. It records product batches, quantities, purchase and expiry dates, and waste events. Expiry-risk categories help staff prioritize review of inventory, while historical waste summaries highlight products that contribute to wastage. PostgreSQL stores structured, relational data with integrity constraints; MongoDB stores flexible application event documents. The interface is implemented with Next.js.

## 2. Problem statement
Perishable inventory can be wasted when stock is not rotated, expiry dates are overlooked, or purchasing is not aligned with consumption. A simple stock list does not provide a consolidated view of expiry risk and historical wastage. The proposed prototype combines batch-level expiry monitoring with waste logging and database-backed analysis.

## 3. Objectives
- Maintain accurate product and batch records.
- Identify inventory approaching expiry using transparent date-based rules.
- Record wasted quantities and estimated financial loss.
- Analyze waste by product and time period.
- Demonstrate SQL relational design and a complementary NoSQL event store.
- Provide a usable web interface and repeatable database demonstrations.

## 4. Scope and limitations
The current MVP supports inventory entry and batch editing, an expiry watchlist, waste recording, dashboard metrics, PostgreSQL reporting and MongoDB event logs. Stock dashboard quantities are grouped by measurement unit. It uses seeded synthetic records for demonstration. It does not currently include inventory deletion, automated notifications, multi-batch waste allocation, or a trained demand forecasting model. These are future-work items and must not be represented as implemented. Expiry categories are operational review indicators only; staff must follow food safety procedures and must not use the app as a substitute for them.

## 5. Functional requirements
1. The user can add and edit an inventory batch with quantity, unit, purchase date, expiry date, unit cost and supplier.
2. The system validates required fields and non-negative quantities/costs.
3. The dashboard displays active batch count, stock quantity, near-expiry batches and 30-day waste loss.
4. The system classifies batches by expiry date.
5. The user can record waste quantity, reason, estimated loss and notes.
6. Recording waste decreases stock from a matching batch and inserts a waste record.
7. The system displays waste history and top wasted products.
8. Inventory creation, inventory edits and waste events are written to MongoDB on a best-effort basis for event analysis.

## 6. Architecture
Browser → Next.js pages → Next.js route handlers → PostgreSQL (products, batches, waste records) and MongoDB (inventory event documents). Server-side database credentials are configured via environment variables. The application should be run locally for the class demonstration.

## 7. Database selection
**PostgreSQL** is appropriate for products, inventory batches and waste records because they have structured attributes, relationships, referential integrity and transaction needs. **MongoDB** is used for event documents whose details may vary by event type and for aggregation of event types. The two databases serve distinct responsibilities rather than duplicating the same primary records.

## 8. Relational model
- `app_users(id PK, full_name, email UNIQUE, password_hash, role, is_active, session_version, created_at)`
- `products(id PK, name UNIQUE, category, created_at)`
- `inventory_batches(id PK, product_id FK → products.id, quantity, unit, purchase_date, expiry_date, cost_per_unit, supplier, created_at, updated_at)`
- `waste_records(id PK, product_id FK → products.id, batch_id FK → inventory_batches.id, quantity, reason, estimated_loss, notes, wasted_at)`

Relationships: one product can have many inventory batches; one product can have many waste records; a batch can be associated with multiple waste records. PostgreSQL account records control sign-in, role permissions and revocation of staff access.

## 9. Advanced database concepts
- **Transactions:** waste entry and stock deduction are grouped in a transaction in the main transaction path.
- **View:** `v_inventory_expiry_risk` presents batch expiry status.
- **Trigger:** `trg_batch_updated_at` updates `updated_at` on batch changes.
- **Indexes:** indexes support expiry, product and waste-date queries.
- **MongoDB aggregation:** group event documents by `type` to count activity categories.
- **Integrity:** primary keys, foreign keys, unique constraints, check constraints and required fields.

## 10. Important queries
See `sql/important_queries.sql` for JOIN, GROUP BY, HAVING, subquery, view, EXPLAIN and transaction examples. Run them in pgAdmin after loading schema and seed data.

## 11. Prediction / analytics design
The current MVP implements date-based expiry-risk rules and a historical waste summary. These are rule-based analytics, not a trained machine-learning model. Future enhancement: estimate demand from daily consumption history, compare projected demand with usable stock before expiry, and evaluate forecasts using a time-based holdout set and metrics such as MAE. A recommendation should be shown only when enough valid history exists.

## 12. Testing
Use `docs/TEST_PLAN.md` for recorded audit checks and cases still requiring a disposable test database. Record actual pass/fail outcomes and screenshots during execution. Do not report tests as passed until they have been run on the target computer. The entity relationships and data dictionary are in `docs/DATABASE_DESIGN.md`.

## 13. Security and integrity considerations
Secrets are kept in `.env.local`, which is excluded from Git. Database credentials should have least privilege. Before real deployment, implement rate limits, CSRF protections where applicable, robust audit handling, backups and production error handling. Do not use real personal data in classroom seed records.

## 14. Conclusion
FreshTrack demonstrates how relational database constraints, transactions, views, triggers and indexes can support perishable inventory and waste recording. MongoDB adds a flexible event-log paradigm, while the Next.js interface makes the database operations demonstrable. Additional work is required for robust multi-batch waste deduction, alert delivery and validated demand forecasting.

## 15. Future enhancements
- Batch allocation across multiple stock lots using FEFO (first-expiry-first-out).
- Automated expiry notifications.
- Demand forecasting evaluated on historical consumption.
- Exportable reports and additional charts.
- Deployment with managed database services and backups.
