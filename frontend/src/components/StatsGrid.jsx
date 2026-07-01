import { formatNumber } from "../utils";

export default function StatsGrid({ stats }) {
  if (!stats) {
    return (
      <div className="stats-grid">
        {[1,2,3,4,5,6].map(i => (
          <div className="stat-card" key={i} style={{ opacity: 0.4 }}>
            <div className="loading-spinner" style={{ width: 24, height: 24, margin: "8px 0" }} />
          </div>
        ))}
      </div>
    );
  }

  const total = stats.total_accounts || 0;
  const online = stats.online_now || 0;
  const s1 = stats.sea_breakdown?.sea1 || 0;
  const s2 = stats.sea_breakdown?.sea2 || 0;
  const s3 = stats.sea_breakdown?.sea3 || 0;

  return (
    <div className="stats-grid">

      <div className="stat-card stat-blue">
        <div className="stat-card-icon">🎮</div>
        <div className="stat-card-value">{formatNumber(total)}</div>
        <div className="stat-card-label">Total Accounts</div>
        <div className="stat-card-sub">Tất cả accounts đã track</div>
      </div>

      <div className="stat-card stat-green">
        <div className="stat-card-icon">🟢</div>
        <div className="stat-card-value">{formatNumber(online)}</div>
        <div className="stat-card-label">Online Now</div>
        <div className="stat-card-sub">{total > 0 ? Math.round(online / total * 100) : 0}% của tổng</div>
      </div>

      <div className="stat-card stat-cyan">
        <div className="stat-card-icon">🏝️</div>
        <div className="stat-card-value">{formatNumber(s1)}</div>
        <div className="stat-card-label">Sea 1 (First Sea)</div>
        <SeaBar s1={s1} s2={s2} s3={s3} />
      </div>

      <div className="stat-card stat-purple">
        <div className="stat-card-icon">🌊</div>
        <div className="stat-card-value">{formatNumber(s2)}</div>
        <div className="stat-card-label">Sea 2 (New World)</div>
        <div className="stat-card-sub">Level 700 – 1499</div>
      </div>

      <div className="stat-card stat-yellow">
        <div className="stat-card-icon">⚡</div>
        <div className="stat-card-value">{formatNumber(s3)}</div>
        <div className="stat-card-label">Sea 3 (Third Sea)</div>
        <div className="stat-card-sub">Level 1500+</div>
      </div>

      <div className="stat-card stat-orange">
        <div className="stat-card-icon">📈</div>
        <div className="stat-card-value">{formatNumber(stats.avg_level || 0)}</div>
        <div className="stat-card-label">Avg Level</div>
        <div className="stat-card-sub">Trung bình tất cả acc</div>
      </div>

    </div>
  );
}

function SeaBar({ s1, s2, s3 }) {
  const total = s1 + s2 + s3 || 1;
  return (
    <div className="sea-bar-wrap">
      <div className="sea-bar-seg"
        style={{ flex: s1 / total, background: "var(--sea1-color)", opacity: 0.7 }} />
      <div className="sea-bar-seg"
        style={{ flex: s2 / total, background: "var(--sea2-color)", opacity: 0.7 }} />
      <div className="sea-bar-seg"
        style={{ flex: s3 / total, background: "var(--sea3-color)", opacity: 0.7 }} />
    </div>
  );
}
