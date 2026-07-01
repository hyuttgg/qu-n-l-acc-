const FRUIT_COLORS = {
  "Mythical":  "#f59e0b",
  "Legendary": "#8b5cf6",
  "Rare":      "#3b82f6",
  "Common":    "#94a3b8",
};

const RACE_COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"];

export default function TopCharts({ stats }) {
  const fruits = stats?.top_fruits || [];
  const races  = stats?.top_races  || [];

  const maxFruit = fruits[0]?.count || 1;
  const maxRace  = races[0]?.count  || 1;

  return (
    <div className="charts-row">

      {/* Top Fruits */}
      <div className="chart-card">
        <div className="chart-title">🍑 Top Fruits</div>
        {fruits.length === 0 ? (
          <div className="detail-empty">Chưa có dữ liệu</div>
        ) : fruits.map((item, i) => {
          const tier = getTier(item.fruit);
          const color = FRUIT_COLORS[tier] || "#94a3b8";
          return (
            <div className="chart-item" key={i}>
              <div className="chart-item-name" title={item.fruit}>
                {item.fruit || "None"}
              </div>
              <div className="chart-item-bar-wrap">
                <div className="chart-item-bar"
                  style={{
                    width: `${(item.count / maxFruit * 100).toFixed(1)}%`,
                    background: `linear-gradient(90deg, ${color}99, ${color})`,
                  }}
                />
              </div>
              <div className="chart-item-count">{item.count}</div>
            </div>
          );
        })}
      </div>

      {/* Top Races */}
      <div className="chart-card">
        <div className="chart-title">🧬 Top Races</div>
        {races.length === 0 ? (
          <div className="detail-empty">Chưa có dữ liệu</div>
        ) : races.map((item, i) => {
          const color = RACE_COLORS[i % RACE_COLORS.length];
          return (
            <div className="chart-item" key={i}>
              <div className="chart-item-name" title={item.race}>
                {item.race || "Unknown"}
              </div>
              <div className="chart-item-bar-wrap">
                <div className="chart-item-bar"
                  style={{
                    width: `${(item.count / maxRace * 100).toFixed(1)}%`,
                    background: `linear-gradient(90deg, ${color}99, ${color})`,
                  }}
                />
              </div>
              <div className="chart-item-count">{item.count}</div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

const MYTHICAL  = ["Leopard Fruit", "Dragon Fruit", "Kitsune Fruit"];
const LEGENDARY = ["Dough Fruit", "Soul Fruit", "Venom Fruit", "Control Fruit", "Spirit Fruit", "Mammoth Fruit", "T-Rex Fruit"];
const RARE      = ["Quake Fruit", "Blizzard Fruit", "Gravity Fruit", "Portal Fruit", "Phoenix Fruit", "Rumble Fruit", "Pain Fruit", "Magma Fruit"];

function getTier(fruit) {
  if (MYTHICAL.includes(fruit))  return "Mythical";
  if (LEGENDARY.includes(fruit)) return "Legendary";
  if (RARE.includes(fruit))      return "Rare";
  return "Common";
}
