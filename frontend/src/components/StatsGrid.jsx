import React from 'react';
import { Users, Activity, GraduationCap, Coins, Gem, Trophy, Swords, Flame, Music } from 'lucide-react';
import { formatNumber } from "../utils";

export default function StatsGrid({ stats }) {
  if (!stats) {
    return (
      <div className="stats-container">
        <h3 className="stats-section-header">⚙️ HỆ THỐNG GIÁM SÁT</h3>
        <div className="stats-grid">
          {[1, 2, 3, 4].map(i => (
            <div className="stat-card loading" key={i} style={{ minHeight: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="loading-spinner" style={{ width: 24, height: 24 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const total = stats.total_accounts || 0;
  const online = stats.online_now || 0;
  const avgLevel = stats.avg_level || 0;
  const totalBeli = stats.total_beli || 0;
  const totalFragments = stats.total_fragments || 0;
  const maxLevelCount = stats.max_level_count || 0;
  const godhumanCount = stats.godhuman_count || 0;
  const cdkCount = stats.cdk_count || 0;
  const soulGuitarCount = stats.soul_guitar_count || 0;

  const s1 = stats.sea_breakdown?.sea1 || 0;
  const s2 = stats.sea_breakdown?.sea2 || 0;
  const s3 = stats.sea_breakdown?.sea3 || 0;

  // Format big numbers like 1.2M or 450K
  const formatCompact = (num) => {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="stats-container">
      {/* SECTION 1: SYSTEM OVERVIEW */}
      <h3 className="stats-section-header">⚙️ HỆ THỐNG GIÁM SÁT</h3>
      <div className="stats-grid">
        <div className="stat-card stat-blue">
          <div className="stat-card-icon"><Users size={20} /></div>
          <div className="stat-card-value">{formatNumber(total)}</div>
          <div className="stat-card-label">Tài khoản</div>
          <div className="stat-card-sub">Tổng số tài khoản quản lý</div>
        </div>

        <div className="stat-card stat-green">
          <div className="stat-card-icon"><Activity size={20} /></div>
          <div className="stat-card-value">{formatNumber(online)}</div>
          <div className="stat-card-label">Online Hiện Tại</div>
          <div className="stat-card-sub">{total > 0 ? Math.round(online / total * 100) : 0}% đang kết nối</div>
        </div>

        <div className="stat-card stat-orange">
          <div className="stat-card-icon"><GraduationCap size={20} /></div>
          <div className="stat-card-value">{avgLevel}</div>
          <div className="stat-card-label">Level Trung Bình</div>
          <div className="stat-card-sub">Của tất cả các tài khoản</div>
        </div>

        <div className="stat-card stat-cyan">
          <div className="stat-card-icon">🏝️</div>
          <div className="stat-card-value" style={{ fontSize: '18px', marginTop: '6px' }}>Bản Đồ</div>
          <div className="stat-card-label" style={{ marginTop: '2px' }}>Phân Bố Sea</div>
          <SeaBar s1={s1} s2={s2} s3={s3} total={total} />
        </div>
      </div>

      {/* SECTION 2: FARMING ACHIEVEMENTS */}
      <h3 className="stats-section-header" style={{ marginTop: '24px' }}>🏆 THÀNH TÍCH CÀY CUỐC</h3>
      <div className="stats-grid achievements-grid">
        <div className="stat-card stat-yellow">
          <div className="stat-card-icon"><Coins size={20} /></div>
          <div className="stat-card-value text-yellow-glow">{formatCompact(totalBeli)}</div>
          <div className="stat-card-label">Tổng Beli Cày Được</div>
          <div className="stat-card-sub">+{formatNumber(totalBeli)} Beli</div>
        </div>

        <div className="stat-card stat-cyan">
          <div className="stat-card-icon"><Gem size={20} color="#06b6d4" /></div>
          <div className="stat-card-value text-cyan-glow">{formatCompact(totalFragments)}</div>
          <div className="stat-card-label">Tổng Fragments</div>
          <div className="stat-card-sub">+{formatNumber(totalFragments)} F</div>
        </div>

        <div className="stat-card stat-red">
          <div className="stat-card-icon"><Trophy size={20} /></div>
          <div className="stat-card-value text-red-glow">{maxLevelCount}</div>
          <div className="stat-card-label">Tài Khoản Max Level</div>
          <div className="stat-card-sub">{total > 0 ? Math.round(maxLevelCount / total * 100) : 0}% đạt lv 2550</div>
        </div>

        <div className="stat-card stat-green">
          <div className="stat-card-icon"><Flame size={20} /></div>
          <div className="stat-card-value text-green-glow">{godhumanCount}</div>
          <div className="stat-card-label">Đã Có Godhuman</div>
          <div className="stat-card-sub">{total > 0 ? Math.round(godhumanCount / total * 100) : 0}% acc đã học võ</div>
        </div>

        <div className="stat-card stat-blue">
          <div className="stat-card-icon"><Swords size={20} /></div>
          <div className="stat-card-value text-blue-glow">{cdkCount}</div>
          <div className="stat-card-label">Có Cursed Dual Katana</div>
          <div className="stat-card-sub">{total > 0 ? Math.round(cdkCount / total * 100) : 0}% acc sở hữu song kiếm</div>
        </div>

        <div className="stat-card stat-purple">
          <div className="stat-card-icon"><Music size={20} /></div>
          <div className="stat-card-value text-purple-glow">{soulGuitarCount}</div>
          <div className="stat-card-label">Có Soul Guitar</div>
          <div className="stat-card-sub">{total > 0 ? Math.round(soulGuitarCount / total * 100) : 0}% acc sở hữu súng</div>
        </div>
      </div>
    </div>
  );
}

function SeaBar({ s1, s2, s3, total }) {
  const t = total || s1 + s2 + s3 || 1;
  return (
    <div style={{ marginTop: '8px' }}>
      <div className="sea-bar-wrap" style={{ height: '6px', borderRadius: '3px', overflow: 'hidden', display: 'flex', background: 'rgba(255,255,255,0.05)' }}>
        <div className="sea-bar-seg"
          style={{ width: `${(s1 / t) * 100}%`, background: "var(--sea1-color)", opacity: 0.8 }} 
          title={`Sea 1: ${s1} acc`}
        />
        <div className="sea-bar-seg"
          style={{ width: `${(s2 / t) * 100}%`, background: "var(--sea2-color)", opacity: 0.8 }}
          title={`Sea 2: ${s2} acc`}
        />
        <div className="sea-bar-seg"
          style={{ width: `${(s3 / t) * 100}%`, background: "var(--sea3-color)", opacity: 0.8 }}
          title={`Sea 3: ${s3} acc`}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', opacity: 0.8 }}>
        <span>S1: {s1}</span>
        <span>S2: {s2}</span>
        <span>S3: {s3}</span>
      </div>
    </div>
  );
}
