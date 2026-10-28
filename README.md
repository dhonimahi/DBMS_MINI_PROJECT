# FreshTrack — Smart Food Expiry & Waste Prediction System

A DBMS Level 3 academic project prototype using Next.js, PostgreSQL and MongoDB. It tracks inventory batches and expiry dates, records food waste, shows a risk watchlist and logs application events in MongoDB.

## Included features
- Next.js dashboard, inventory creation/editing and waste recording pages.
- PostgreSQL schema with PK/FK constraints, checks, indexes, a view, and a trigger.
- Waste recording updates stock and creates a waste record in a PostgreSQL transaction when using the transaction path.
- MongoDB event logging (`inventory_events`) for inventory creation/updates and waste records.
- Expiry-risk categories calculated from batch expiry dates. Stock totals are grouped by unit rather than adding unlike measurements.
- Waste summary queries for the last 30 days.
- Sample records and viva-oriented SQL queries.

## Honest scope note
This package is a runnable MVP, not a production deployment. It does not yet implement user login, role enforcement, inventory deletion, multi-batch waste allocation, automated email alerts, or a trained forecasting model. The UI uses transparent expiry rules and historical summaries; do not claim machine-learning prediction. Confirm whether authentication and roles are required by the faculty brief before submission. Review and personalize the report and code, run the test plan, and confirm all project requirements before submitting.

## Requirements
- Node.js 20 LTS recommended
- PostgreSQL 15 or newer
- MongoDB Community Server 7+ or a MongoDB Atlas database
- VS Code (recommended)

## Windows setup
1. Install Node.js LTS, PostgreSQL and MongoDB Community Server, or create a MongoDB Atlas cluster.
2. Open this folder in VS Code.
3. In pgAdmin, create a database named `smart_food_waste`.
4. Open Query Tool for that database and execute `sql/schema.sql`, then `sql/seed.sql`.
5. Copy `.env.example` to `.env.local`.
6. Set `DATABASE_URL` to your PostgreSQL connection string (replace `YOUR_POSTGRES_PASSWORD`). Set `MONGODB_URI` to your local MongoDB URI or Atlas URI. Set `MONGODB_DB=smart_food_waste`. Generate a long random `SESSION_SECRET` before any deployment.
7. Open a terminal in the project folder and run:
   ```powershell
   npm install
   npm run dev
   ```
8. Open `http://localhost:3000` in your browser.

## Quick database checks
In pgAdmin run:
```sql
SELECT * FROM v_inventory_expiry_risk;
SELECT p.name, SUM(w.quantity) AS waste_qty, SUM(w.estimated_loss) AS loss
FROM products p JOIN waste_records w ON w.product_id=p.id
GROUP BY p.name ORDER BY waste_qty DESC;
```
In mongosh:
```javascript
use smart_food_waste
db.inventory_events.find().sort({createdAt:-1}).limit(10)
db.inventory_events.aggregate([{$group:{_id:'$type',count:{$sum:1}}}])
```

## Troubleshooting
- `ECONNREFUSED` PostgreSQL: ensure PostgreSQL service is running and connection details/port 5432 are correct.
- `password authentication failed`: correct the PostgreSQL password in `.env.local`.
- MongoDB error: start MongoDB service or verify the Atlas URI/network access.
- `relation does not exist`: run `sql/schema.sql` and `sql/seed.sql` in the correct database.
- Changes to `.env.local` require restarting `npm run dev`.

## Report and testing
See [`docs/PROJECT_REPORT.md`](docs/PROJECT_REPORT.md), [`docs/DATABASE_DESIGN.md`](docs/DATABASE_DESIGN.md), [`docs/TEST_PLAN.md`](docs/TEST_PLAN.md), [`docs/VIVA_NOTES.md`](docs/VIVA_NOTES.md) and [`sql/important_queries.sql`](sql/important_queries.sql). [`sql/dml_demo.sql`](sql/dml_demo.sql) demonstrates insert/update/delete on temporary sample rows and ends with `ROLLBACK`; keep that rollback. The SQL transaction example also rolls back its update. Seed records are synthetic and intended for demonstration. Before final submission, run every test and replace the team details with your actual information.

The project currently has no automated test runner. Use the test plan for manual checks. The `lint` script requires an ESLint configuration and ESLint package, which are not currently included.
