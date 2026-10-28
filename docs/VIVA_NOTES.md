# Viva Preparation Notes

**What problem does the project solve?**  
It helps track perishable inventory, flag batches nearing expiry, record wasted food and summarize waste patterns.

**Why PostgreSQL?**  
The main entities are structured and related. Foreign keys, constraints and transactions help preserve data integrity.

**Why MongoDB?**  
Application events have flexible details that can vary by event type. MongoDB stores these as documents and supports aggregation.

**What is a primary key?**  
A column or set of columns that uniquely identifies a row.

**What is a foreign key?**  
A constraint linking a column to a key in another table, helping maintain referential integrity.

**Why indexes?**  
Indexes can speed up lookups such as filtering batches by expiry date, at the cost of extra storage and write overhead.

**What is a view?**  
A saved query presented like a virtual table. `v_inventory_expiry_risk` calculates an expiry category for each active batch.

**What is a trigger?**  
A database routine automatically invoked by an event. Here it refreshes `updated_at` when an inventory batch is updated.

**What is a transaction?**  
A group of database operations that commit together or roll back on failure. Waste recording should not deduct stock without creating its corresponding waste record.

**What is the difference between a rule and machine learning?**  
A rule uses explicit conditions such as days until expiry. Machine learning fits patterns from data and must be evaluated on held-out data. This MVP has expiry rules and historical summaries, not a trained ML model.

**What does MongoDB aggregation do?**  
It processes documents through stages such as filtering, grouping and sorting. Example: count event documents by event type.

**What are the current limitations?**  
The MVP does not yet enforce login roles or provide trained demand forecasting, automated alerts, or multi-batch waste allocation. These should be acknowledged honestly and addressed before final submission if required.

## Suggested demonstration sequence

1. Introduce the food-waste problem and FreshTrack objectives.
2. Show the Next.js → PostgreSQL/MongoDB architecture and explain each database’s responsibility.
3. Show the entity relationships and data dictionary in `docs/DATABASE_DESIGN.md`.
4. Open the dashboard and explain active batches, stock quantities grouped by unit, expiry risk and the 30-day waste summary.
5. Open inventory, show existing batches, and demonstrate batch editing using a disposable/test database.
6. Explain expiry categories and show the watchlist; distinguish these rules from food-safety advice or trained prediction.
7. Open waste records, show that only products with stock are selectable, and demonstrate stock reduction on a disposable/test database.
8. In pgAdmin, show the schema, constraints, view and trigger; use `sql/important_queries.sql` for read-only queries.
9. Explain the DML examples in `sql/dml_demo.sql`. If demonstrating execution, keep it inside the script’s transaction and finish with `ROLLBACK`.
10. In mongosh, inspect `inventory_events` and group events by type.
11. Present the actual test results in `docs/TEST_PLAN.md`, then disclose limitations and future work.

## Screenshot checklist

Capture current screenshots on the presentation machine after refreshing the app:

- Dashboard with live counts and stock-by-unit values.
- Inventory page with batch table and edit controls.
- Waste page showing the available-stock choices and recorded history.
- pgAdmin view/constraint query and MongoDB event documents.

Use synthetic demonstration data, and do not include credentials or personal information in screenshots.
