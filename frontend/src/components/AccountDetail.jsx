import { formatNumber, timeAgo, seaLabel, seaClass, levelColor, fruitTier, fruitTierColor, formatDate } from "../utils";

export default function AccountDetail({ account, onClose }) {
  if (!account) return null;

  const tier = fruitTier(account.fruit);
  const tierColor = fruitTierColor(tier);

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="detail-overlay" onClick={handleOverlayClick}>
      <div className="detail-panel" role="dialog" aria-modal="true">

        {/* Header */}
        <div className="detail-header">
          <div>
            <div className="detail-username">{account.username}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
              <span className={`badge ${account.is_online ? "badge-online" : "badge-offline"}`}>
                <span className="badge-dot" />
                {account.is_online ? "Online" : "Offline"}
              </span>
              <span className={`sea-badge ${seaClass(account.sea)}`}>
                {seaLabel(account.sea)}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                ID: {account.user_id}
              </span>
            </div>
          </div>
          <button className="detail-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Body */}
        <div className="detail-body">

          {/* Stats */}
          <div className="detail-section">
            <div className="detail-section-title">📊 Stats</div>
            <div className="detail-grid">
              <DetailItem label="Level" value={formatNumber(account.level)}
                valueColor={levelColor(account.level)} />
              <DetailItem label="Beli" value={formatNumber(account.beli)} valueColor="var(--accent-yellow)" />
              <DetailItem label="Fragments" value={formatNumber(account.fragments)} valueColor="var(--accent-cyan)" />
              <DetailItem label="Race" value={account.race || "Unknown"} valueColor="var(--accent-blue)" />
            </div>
          </div>

          {/* Equipment */}
          <div className="detail-section">
            <div className="detail-section-title">⚔️ Equipment</div>
            <div className="detail-grid">
              <DetailItem label="Fruit" value={account.fruit || "None"}
                valueColor={account.fruit !== "None" ? tierColor : undefined}
                sub={tier} />
              <DetailItem label="Sword" value={account.sword || "None"} valueColor="var(--accent-red)" />
              <DetailItem label="Gun" value={account.gun || "None"} valueColor="var(--accent-orange)" />
              <DetailItem label="Melee" value={account.melee || "None"} valueColor="var(--accent-green)" />
            </div>
          </div>

          {/* Accessories */}
          <div className="detail-section">
            <div className="detail-section-title">🎒 Accessories ({(account.accessories || []).length})</div>
            {account.accessories && account.accessories.length > 0 ? (
              <div className="detail-tags">
                {account.accessories.map((a, i) => (
                  <span className="detail-tag" key={i}>{a}</span>
                ))}
              </div>
            ) : (
              <div className="detail-empty">Không có accessories</div>
            )}
          </div>

          {/* Inventory */}
          <div className="detail-section">
            <div className="detail-section-title">🎒 Inventory ({(account.inventory || []).length} items)</div>
            {account.inventory && account.inventory.length > 0 ? (
              <div className="detail-tags">
                {[...new Set(account.inventory)].slice(0, 30).map((item, i) => (
                  <span className="detail-tag" key={i}
                    style={{ background: "rgba(6,182,212,0.06)", borderColor: "rgba(6,182,212,0.15)", color: "var(--accent-cyan)" }}>
                    {item}
                  </span>
                ))}
                {account.inventory.length > 30 && (
                  <span className="detail-empty">+{account.inventory.length - 30} more...</span>
                )}
              </div>
            ) : (
              <div className="detail-empty">Backpack trống</div>
            )}
          </div>

          {/* Materials */}
          <div className="detail-section">
            <div className="detail-section-title">
              🧱 Materials ({Object.keys(account.materials || {}).length} loại)
            </div>
            {account.materials && Object.keys(account.materials).length > 0 ? (
              <div className="detail-tags">
                {Object.entries(account.materials).map(([name, count], i) => (
                  <span className="detail-tag" key={i}
                    style={{ background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.15)", color: "var(--accent-yellow)" }}>
                    {name} ×{count}
                  </span>
                ))}
              </div>
            ) : (
              <div className="detail-empty">Không có materials</div>
            )}
          </div>

          {/* Meta */}
          <div className="detail-section">
            <div className="detail-section-title">🕐 Thông tin</div>
            <div className="detail-grid">
              <DetailItem label="Last Seen" value={timeAgo(account.last_seen)} />
              <DetailItem label="Created" value={formatDate(account.created_at)} />
              <DetailItem label="Updated" value={formatDate(account.updated_at)} />
              <DetailItem label="Status" value={account.status} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value, valueColor, sub }) {
  return (
    <div className="detail-item">
      <div className="detail-item-label">{label}</div>
      <div className="detail-item-value" style={valueColor ? { color: valueColor } : {}}>
        {value || "—"}
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
