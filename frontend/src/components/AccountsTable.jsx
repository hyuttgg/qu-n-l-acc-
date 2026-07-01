import { formatNumber, timeAgo, seaLabel, seaClass, levelColor, fruitTier, fruitTierColor } from "../utils";

export default function AccountsTable({ accounts, onSelect, selectedUsername, sortBy, sortDir, onSort }) {

  const cols = [
    { key: "username",   label: "Username" },
    { key: "level",      label: "Level" },
    { key: "beli",       label: "Beli" },
    { key: "fragments",  label: "Fragments" },
    { key: "sea",        label: "Sea" },
    { key: "fruit",      label: "Fruit" },
    { key: "race",       label: "Race" },
    { key: "status",     label: "Status" },
    { key: "last_seen",  label: "Last Seen" },
  ];

  if (!accounts || accounts.length === 0) {
    return (
      <div className="table-wrap">
        <div className="empty-wrap">
          <div className="empty-icon">🎮</div>
          <div className="empty-text">Không có tài khoản nào. Hãy chạy Lua Sender!</div>
        </div>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="accounts-table">
        <thead>
          <tr>
            {cols.map(col => (
              <th key={col.key} onClick={() => onSort(col.key)}>
                {col.label}
                {sortBy === col.key && (
                  <span style={{ marginLeft: 4, color: "var(--accent-blue)" }}>
                    {sortDir === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {accounts.map(acc => {
            const tier = fruitTier(acc.fruit);
            const tierColor = fruitTierColor(tier);
            const isSelected = acc.username === selectedUsername;

            return (
              <tr
                key={acc.username}
                onClick={() => onSelect(acc)}
                className={isSelected ? "selected" : ""}
              >
                {/* Username */}
                <td>
                  <span className="username-cell">{acc.username}</span>
                </td>

                {/* Level */}
                <td>
                  <span style={{ color: levelColor(acc.level), fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 600 }}>
                    {formatNumber(acc.level)}
                  </span>
                </td>

                {/* Beli */}
                <td><span className="num-yellow">{formatNumber(acc.beli)}</span></td>

                {/* Fragments */}
                <td><span className="num-cyan">{formatNumber(acc.fragments)}</span></td>

                {/* Sea */}
                <td>
                  <span className={`sea-badge ${seaClass(acc.sea)}`}>
                    {seaLabel(acc.sea)}
                  </span>
                </td>

                {/* Fruit */}
                <td>
                  {acc.fruit && acc.fruit !== "None" ? (
                    <span className="fruit-chip" style={{
                      color: tierColor,
                      background: `${tierColor}14`,
                      borderColor: `${tierColor}33`,
                    }}>
                      🍑 {acc.fruit}
                    </span>
                  ) : (
                    <span className="fruit-chip none">None</span>
                  )}
                </td>

                {/* Race */}
                <td>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {acc.race || "—"}
                  </span>
                </td>

                {/* Status */}
                <td>
                  <span className={`badge ${acc.is_online ? "badge-online" : "badge-offline"}`}>
                    <span className="badge-dot" />
                    {acc.is_online ? "Online" : "Offline"}
                  </span>
                </td>

                {/* Last Seen */}
                <td>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {timeAgo(acc.last_seen)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
