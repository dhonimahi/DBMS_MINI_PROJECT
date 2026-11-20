// Import Next.js Link for internal navigation.
import { requirePageAccount } from '@/lib/account';
import Link from 'next/link';
// Import the shared application layout and header.
import { Layout, Header } from './components';
// Import the PostgreSQL query helper used on the server.
import { query } from '@/lib/db';
// Import rupee formatting and expiry label calculation.
import { money, expiryStatus } from '@/lib/format';

// Render the dashboard on request so it uses current database values.
export const dynamic = 'force-dynamic';

// Describe a total stock quantity grouped by measurement unit.
type StockByUnit = { unit: string; quantity: string };
// Describe the fields displayed for an at-risk batch.
type RiskBatch = {
  // Hold the batch identifier used as a React key.
  id: number;
  // Hold the product name from the join.
  product_name: string;
  // Hold the remaining quantity reported by the database.
  quantity: string;
  // Hold the measurement unit.
  unit: string;
  // Hold the batch expiry date as text.
  expiry_date: string;
// Finish the risk batch type.
};
// Describe a waste quantity grouped by product name and unit.
type WasteTrend = { name: string; unit: string; qty: string };
// Describe the complete set of data rendered by the dashboard.
type DashboardData = {
  // Hold the number of batches with stock.
  stock: { batches: number };
  // Hold quantity totals broken down by unit.
  stockByUnit: StockByUnit[];
  // Hold the number of batches that need expiry attention.
  riskCount: number;
  // Hold the limited list displayed on the watchlist.
  risks: RiskBatch[];
  // Hold the summed recent monetary loss.
  waste: { loss: string };
  // Hold the recent product and unit waste rankings.
  trend: WasteTrend[];
// Finish the dashboard data type.
};

// Gather all dashboard datasets from PostgreSQL.
async function getData(): Promise<DashboardData> {
  // Execute the independent queries in parallel.
  const [stock, stockByUnit, riskCount, risks, waste, trend] = await Promise.all([
    // Request a single row with the number of active batches.
    query<{ batches: number }>(
      // Count batches whose quantity is greater than zero.
      'SELECT COUNT(*)::int AS batches FROM inventory_batches WHERE quantity > 0'
    // Finish the active batch query.
    ),
    // Request one stock total row per unit.
    query<StockByUnit>(
      // Line 66 — Select the unit and sum quantities, returning the total as text.
      // Line 67 — Read the inventory batch table.
      // Line 68 — Exclude batches that no longer hold stock.
      // Line 69 — Group quantities by unit to keep measurements separate.
      // Line 70 — Sort the unit groups by unit name.
      `SELECT unit, SUM(quantity)::numeric::text AS quantity
       FROM inventory_batches
       WHERE quantity > 0
       GROUP BY unit
       ORDER BY unit`
    // Finish the stock totals query.
    ),
    // Request a single row with the at-risk batch count.
    query<{ count: number }>(
      // Line 78 — Count the number of qualifying batches.
      // Line 79 — Read the inventory batch table.
      // Line 80 — Include positive stock expiring within seven days and stock already expired.
      `SELECT COUNT(*)::int AS count
       FROM inventory_batches
       WHERE quantity > 0 AND expiry_date <= CURRENT_DATE + 7`
    // Finish the risk count query.
    ),
    // Request the batches displayed in the expiry watchlist.
    query<RiskBatch>(
      // Line 91 — Select the batch ID, product name, quantity, unit and expiry date.
      // Line 92 — Read from the batch table using the alias b.
      // Line 93 — Join the product catalog to find the readable name.
      // Line 94 — Apply the same stock and expiry conditions as the risk count.
      // Line 95 — Put the earliest expiry dates first.
      // Line 96 — Limit the watchlist to six batches.
      `SELECT b.id, p.name AS product_name, b.quantity::text, b.unit, b.expiry_date::text
       FROM inventory_batches b
       JOIN products p ON p.id = b.product_id
       WHERE b.quantity > 0 AND b.expiry_date <= CURRENT_DATE + 7
       ORDER BY b.expiry_date ASC
       LIMIT 6`
    // Finish the watchlist query.
    ),
    // Request one row with the recent waste loss total.
    query<{ loss: string }>(
      // Line 104 — Sum the entered losses and return zero if no records qualify.
      // Line 105 — Read the waste history table.
      // Line 106 — Include waste timestamps on or after the 30-day cutoff date.
      `SELECT COALESCE(SUM(estimated_loss), 0)::numeric::text AS loss
       FROM waste_records
       WHERE wasted_at >= CURRENT_DATE - INTERVAL '30 days'`
    // Finish the loss query.
    ),
    // Request the rows used for the waste ranking.
    query<WasteTrend>(
      // Line 125 — Select product name, the available unit or unspecified, and the summed quantity.
      // Line 126 — Read waste records using the alias w.
      // Line 127 — Look up each waste record's product name.
      // Line 128 — Look for the original batch unit while keeping rows that have no batch reference.
      // Line 129 — Use a subquery that can refer to the current waste row to infer a unit if needed.
      // Line 130 — Select the unit when there is one distinct value.
      // Line 131 — Look through inventory batches for units.
      // Line 132 — Restrict the unit lookup to the same product.
      // Line 133 — Return a unit only if all matching batches have the same unit.
      // Line 134 — Keep the waste record when no unit can be inferred.
      // Line 135 — Filter the ranking to the same 30-day cutoff.
      // Line 136 — Group separately for each product and resolved unit.
      // Line 137 — Rank the groups by summed quantity in descending order.
      // Line 138 — Keep at most five groups.
      `SELECT p.name, COALESCE(b.unit, inferred.unit, 'unspecified') AS unit, SUM(w.quantity)::numeric::text AS qty
       FROM waste_records w
       JOIN products p ON p.id = w.product_id
       LEFT JOIN inventory_batches b ON b.id = w.batch_id
       LEFT JOIN LATERAL (
         SELECT MIN(unit) AS unit
         FROM inventory_batches
         WHERE product_id = w.product_id
         HAVING COUNT(DISTINCT unit) = 1
       ) inferred ON TRUE
       WHERE w.wasted_at >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY p.name, COALESCE(b.unit, inferred.unit, 'unspecified')
       ORDER BY SUM(w.quantity) DESC
       LIMIT 5`
    // Finish the waste ranking query.
    )
  // Finish waiting for the six independent queries.
  ]);

  // Assemble query results into the shape used by the dashboard.
  return {
    // Extract the single active batch summary.
    stock: stock.rows[0],
    // Keep all stock-by-unit groups.
    stockByUnit: stockByUnit.rows,
    // Read the count number from the risk count result.
    riskCount: riskCount.rows[0].count,
    // Keep the risk watchlist rows.
    risks: risks.rows,
    // Extract the single loss summary.
    waste: waste.rows[0],
    // Keep the ranking rows for the chart.
    trend: trend.rows
  // Finish the dashboard data object.
  };
// End the dashboard query helper.
}

// Render the dashboard as an asynchronous server component.
export default async function Home() {
  const account = await requirePageAccount();
  // Start with fallback data in case PostgreSQL cannot be queried.
  let data: DashboardData = {
    // Default the active batch count to zero.
    stock: { batches: 0 },
    // Start with no stock unit totals.
    stockByUnit: [],
    // Default the at-risk batch count to zero.
    riskCount: 0,
    // Start with an empty watchlist.
    risks: [],
    // Default the waste loss to zero.
    waste: { loss: '0' },
    // Start with no waste ranking rows.
    trend: []
  // Finish the fallback data object.
  };
  // Initialize the visible error message to empty.
  let error = '';

  // Attempt to load live dashboard data.
  try {
    // Replace the defaults with the database query results.
    data = await getData();
  // Handle a failure while reading from PostgreSQL.
  } catch (cause) {
    // Log the underlying failure.
    console.error('Dashboard data load failed:', cause);
    // Set a notice explaining why live data is unavailable.
    error = 'Live dashboard data is unavailable. Check the database connection and schema.';
  // Finish the error handling.
  }

  // Keep a maximum waste quantity for each unit to scale like measurements together.
  const largestWasteQuantityByUnit = new Map<string, number>();
  // Visit each row in the waste ranking.
  data.trend.forEach(item => {
    // Update the maximum for this row's unit.
    largestWasteQuantityByUnit.set(
      // Use the unit as the map key.
      item.unit,
      // Compare the quantity with the current maximum and use one as the initial floor.
      Math.max(largestWasteQuantityByUnit.get(item.unit) ?? 1, Number(item.qty))
    // Finish updating the maximum.
    );
  // Finish visiting the ranking rows.
  });

  // Return the dashboard markup.
  return (
    // Line 314 — Use the shared layout and highlight Dashboard.
    // Line 315 — Open the reusable header component.
    // Line 316 — Set its overview label.
    // Line 317 — Set the dashboard's main title.
    // Line 318 — Describe the dashboard's inventory and waste summaries.
    // Offer a shortcut to the add inventory form.
    // Line 320 — Finish setting up the header.
    // Line 321 — Show a notice when the database load failed.
    // Line 322 — Start the top hero banner.
    // Line 323 — Group the banner's message and action.
    // Line 324 — Display its short section label.
    // Line 325 — Show the banner headline.
    // Line 326 — Report the current number of batches needing attention or show that the list is clear.
    // Line 327 — Link to the inventory page.
    // Line 328 — End the banner text group.
    // Line 329 — Provide the fruit illustration and its accessible description.
    // Line 330 — Render a decorative glow under the artwork.
    // Line 331 — End the hero banner.
    // Line 332 — Start the dashboard metrics grid.
    // Line 333 — Start the active-batch card.
    // Line 334 — Label the metric as Active batches.
    // Line 335 — Display the live number of active batches.
    // Line 336 — Explain the definition of an active batch.
    // Line 337 — End the active-batch card.
    // Line 338 — Start the stock-by-unit card.
    // Line 339 — Label the metric as Stock by unit.
    // Line 340 — Open the totals display with a smaller font for multiple unit groups.
    // Line 341 — Check whether the query returned any unit groups.
    // Line 342 — Format each quantity with Indian number separators and join the units for display.
    // Line 343 — Show zero when there are no stock totals.
    // Line 344 — End the totals display.
    // Line 345 — Explain that totals are grouped by measurement unit.
    // Line 346 — End the stock totals card.
    // Line 347 — Start the expiry risk card.
    // Line 348 — Label the metric as Expiry risk.
    // Line 349 — Display the current number of batches needing attention.
    // Line 350 — Explain the upcoming expiry window.
    // Line 351 — End the expiry risk card.
    // Line 352 — Start the recent waste loss card.
    // Line 353 — Label the metric as 30-day waste loss.
    // Line 354 — Format the summed loss as rupees.
    // Line 355 — Explain that the value is the estimated loss entered in waste records.
    // Line 356 — End the loss card.
    // Line 357 — End the metrics grid.
    // Line 358 — Start the layout for the two lower dashboard panels.
    // Line 359 — Start the expiry watchlist panel.
    // Line 360 — Display the watchlist heading.
    // Line 361 — Make the table scrollable if it exceeds the panel width.
    // Line 362 — Start the watchlist table.
    // Line 363 — Label the product, quantity, expiry and risk columns.
    // Line 364 — Start the watchlist data rows.
    // Line 365 — Check whether the database returned any watchlist batches.
    // Line 366 — Build a table row for each batch when the watchlist is nonempty.
    // Line 367 — Calculate the displayed expiry status for this batch.
    // Line 368 — Return the batch row.
    // Line 369 — Use the batch ID as the React key.
    // Line 370 — Display the product name.
    // Line 371 — Show the quantity with its measurement unit.
    // Line 372 — Show the batch expiry date.
    // Line 373 — Show a risk badge with the computed label and style.
    // Line 374 — End the batch row.
    // Line 375 — Finish returning that row.
    // Line 376 — End the watchlist mapping.
    // Line 377 — Show an empty state if no batches meet the filter.
    // Line 378 — End the table body.
    // Line 379 — End the watchlist table.
    // Line 380 — End the scrollable wrapper.
    // Line 381 — Start the row of links below the watchlist.
    // Link to the inventory page.
    // Line 383 — Link to the waste form.
    // Line 384 — End the link row.
    // Line 385 — End the expiry watchlist panel.
    // Line 386 — Start the recent waste analysis panel.
    // Line 387 — Label the panel and its time range.
    // Line 388 — Explain that the ranking groups recorded waste by product and unit.
    // Line 389 — Add spacing around the waste rankings.
    // Line 390 — Check whether the query returned any ranking entries.
    // Line 391 — Create a visual row for each ranking entry.
    // Line 392 — Use the product name as the React key and add spacing between bars.
    // Line 393 — Lay out the name and quantity at opposite ends of the row.
    // Line 394 — Show the product name and exact amount with its unit.
    // Line 395 — End the ranking label row.
    // Line 396 — Render the light track behind the waste bar.
    // Line 397 — Start the filled bar element.
    // Line 398 — Open the inline styles for the filled bar.
    // Line 399 — Set the bar height to match the track.
    // Line 400 — Use the shared burgundy accent for the fill.
    // Line 401 — Round the corners of the fill.
    // Line 402 — Scale the fill by the largest waste quantity of the same unit, clamped to 5 to 100 percent.
    // Line 403 — End the inline style object.
    // Line 404 — Finish rendering the fill.
    // Line 405 — End the bar track.
    // Line 406 — End the ranking entry.
    // Line 407 — Finish mapping the ranking entries.
    // Line 408 — Show an empty state if there is no recent recorded waste.
    // Line 409 — End the ranking container.
    // Line 410 — End the recent waste analysis panel.
    // Line 411 — End the lower dashboard layout.
    // Line 412 — End the shared app shell.
    <Layout active="dashboard">
      <Header
        eyebrow="OVERVIEW / DASHBOARD"
        title="Food waste command centre"
        subtitle="Monitor inventory health, expiry risk and waste performance."
        action={account.role === 'admin' ? <Link className="btn" href="/inventory">+ Add inventory</Link> : undefined}
      />
      {error && <div className="notice">{error}</div>}
      <section className="dashboard-hero">
        <div className="hero-copy">
          <span className="hero-kicker">TODAY&apos;S FOOD HEALTH</span>
          <strong>Your inventory is looking fresh.</strong>
          <p>{data.riskCount ? `${data.riskCount} batches need attention this week.` : 'No batches need attention this week.'}</p>
          <Link href="/inventory">Explore inventory <span>→</span></Link>
        </div>
        <div className="hero-art" role="img" aria-label="Fresh fruit arranged in a bowl" />
        <div className="hero-glow" />
      </section>
      <div className="cards">
        <div className="card">
          <div className="metric-label">Active batches</div>
          <div className="metric">{data.stock.batches}</div>
          <div className="metric-note">Batches with stock available</div>
        </div>
        <div className="card">
          <div className="metric-label">Stock by unit</div>
          <div className="metric" style={{ fontSize: 20 }}>
            {data.stockByUnit.length
              ? data.stockByUnit.map(item => `${Number(item.quantity).toLocaleString('en-IN')} ${item.unit}`).join(' · ')
              : '0'}
          </div>
          <div className="metric-note">Available quantity, grouped by unit</div>
        </div>
        <div className="card">
          <div className="metric-label">Expiry risk</div>
          <div className="metric">{data.riskCount}</div>
          <div className="metric-note">Batches expiring within 7 days</div>
        </div>
        <div className="card">
          <div className="metric-label">30-day waste loss</div>
          <div className="metric">{money(data.waste.loss)}</div>
          <div className="metric-note">Estimated recorded loss</div>
        </div>
      </div>
      <div className="grid2">
        <section className="panel">
          <h2>Expiry watchlist</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Quantity</th><th>Expiry</th><th>Risk</th></tr></thead>
              <tbody>
                {data.risks.length
                  ? data.risks.map(batch => {
                    const status = expiryStatus(batch.expiry_date);
                    return (
                      <tr key={batch.id}>
                        <td>{batch.product_name}</td>
                        <td>{batch.quantity} {batch.unit}</td>
                        <td>{batch.expiry_date}</td>
                        <td><span className={`status ${status.className}`}>{status.label}</span></td>
                      </tr>
                    );
                  })
                  : <tr><td colSpan={4} className="empty">No batches expiring in the next 7 days.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="actions" style={{ marginTop: 16 }}>
            <Link className="btn secondary" href="/inventory">View inventory</Link>
            <Link className="btn secondary" href="/waste">Record waste</Link>
          </div>
        </section>
        <section className="panel">
          <h2>Waste analysis · last 30 days</h2>
          <p className="muted">Top products by recorded waste quantity, grouped by unit.</p>
          <div style={{ marginTop: 14 }}>
            {data.trend.length
              ? data.trend.map(item => (
                <div key={item.name} style={{ margin: '17px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 7 }}>
                    <strong>{item.name}</strong><span>{item.qty} {item.unit}</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--line)', borderRadius: 8 }}>
                    <div
                      style={{
                        height: 8,
                        background: 'var(--burgundy)',
                        borderRadius: 8,
                        width: `${Math.max(5, Math.min(100, Number(item.qty) / (largestWasteQuantityByUnit.get(item.unit) ?? 1) * 100))}%`
                      }}
                    />
                  </div>
                </div>
              ))
              : <div className="empty">No waste records in the last 30 days.</div>}
          </div>
        </section>
      </div>
    </Layout>
  // Finish returning the dashboard markup.
  );
// End the Home page component.
}
