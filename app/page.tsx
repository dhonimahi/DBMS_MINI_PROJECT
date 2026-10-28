import Link from 'next/link';
import { Layout, Header } from './components';
import { query } from '@/lib/db';
import { money, expiryStatus } from '@/lib/format';

export const dynamic = 'force-dynamic';

type StockByUnit = { unit: string; quantity: string };
type RiskBatch = {
  id: number;
  product_name: string;
  quantity: string;
  unit: string;
  expiry_date: string;
};
type WasteTrend = { name: string; unit: string; qty: string };
type DashboardData = {
  stock: { batches: number };
  stockByUnit: StockByUnit[];
  riskCount: number;
  risks: RiskBatch[];
  waste: { loss: string };
  trend: WasteTrend[];
};

async function getData(): Promise<DashboardData> {
  const [stock, stockByUnit, riskCount, risks, waste, trend] = await Promise.all([
    query<{ batches: number }>(
      'SELECT COUNT(*)::int AS batches FROM inventory_batches WHERE quantity > 0'
    ),
    query<StockByUnit>(
      `SELECT unit, SUM(quantity)::numeric::text AS quantity
       FROM inventory_batches
       WHERE quantity > 0
       GROUP BY unit
       ORDER BY unit`
    ),
    query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM inventory_batches
       WHERE quantity > 0 AND expiry_date <= CURRENT_DATE + 7`
    ),
    query<RiskBatch>(
      `SELECT b.id, p.name AS product_name, b.quantity::text, b.unit, b.expiry_date::text
       FROM inventory_batches b
       JOIN products p ON p.id = b.product_id
       WHERE b.quantity > 0 AND b.expiry_date <= CURRENT_DATE + 7
       ORDER BY b.expiry_date ASC
       LIMIT 6`
    ),
    query<{ loss: string }>(
      `SELECT COALESCE(SUM(estimated_loss), 0)::numeric::text AS loss
       FROM waste_records
       WHERE wasted_at >= CURRENT_DATE - INTERVAL '30 days'`
    ),
    query<WasteTrend>(
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
    )
  ]);

  return {
    stock: stock.rows[0],
    stockByUnit: stockByUnit.rows,
    riskCount: riskCount.rows[0].count,
    risks: risks.rows,
    waste: waste.rows[0],
    trend: trend.rows
  };
}

export default async function Home() {
  let data: DashboardData = {
    stock: { batches: 0 },
    stockByUnit: [],
    riskCount: 0,
    risks: [],
    waste: { loss: '0' },
    trend: []
  };
  let error = '';

  try {
    data = await getData();
  } catch (cause) {
    console.error('Dashboard data load failed:', cause);
    error = 'Live dashboard data is unavailable. Check the database connection and schema.';
  }

  const largestWasteQuantityByUnit = new Map<string, number>();
  data.trend.forEach(item => {
    largestWasteQuantityByUnit.set(
      item.unit,
      Math.max(largestWasteQuantityByUnit.get(item.unit) ?? 1, Number(item.qty))
    );
  });

  return (
    <Layout active="dashboard">
      <Header
        eyebrow="OVERVIEW / DASHBOARD"
        title="Food waste command centre"
        subtitle="Monitor inventory health, expiry risk and waste performance."
        action={<Link className="btn" href="/inventory">+ Add inventory</Link>}
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
            <Link className="btn secondary" href="/inventory">Manage inventory</Link>
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
                  <div style={{ height: 8, background: '#edf2ed', borderRadius: 8 }}>
                    <div
                      style={{
                        height: 8,
                        background: '#4d9a72',
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
  );
}
