import React, { useState } from 'react';
import { 
  formatNumber, 
  timeAgo, 
  seaLabel, 
  seaClass, 
  levelColor, 
  fruitTier, 
  fruitTierColor, 
  formatDate 
} from "../utils";
import { 
  Shield, 
  Clock, 
  Coins, 
  Gem, 
  Sparkles, 
  User, 
  Sword, 
  Crosshair, 
  Flame, 
  Apple,
  Backpack,
  Hammer
} from 'lucide-react';

// Image resolvers
const getSwordImage = (name) => {
  if (!name || name === "None") return null;
  const formatted = name.trim().replace(/\s+/g, '_');
  return `/ảnh/kiếm/${formatted}.webp`;
};

const getMeleeImage = (name) => {
  if (!name || name === "None") return null;
  const formatted = name.trim().replace(/\s+/g, '_');
  return `/ảnh/võ/${formatted}.webp`;
};

const getGunImage = (name) => {
  if (!name || name === "None") return null;
  const formatted = name.trim().replace(/\s+/g, '_');
  return `/ảnh/súng/${formatted}.webp`;
};

const getAccessoryImage = (name) => {
  if (!name) return null;
  const formatted = name.trim().replace(/\s+/g, '_');
  return `/ảnh/phụ kiên/${formatted}.webp`;
};

const getMaterialImage = (name) => {
  if (!name) return null;
  const clean = name.trim().replace(/\s+/g, '');
  if (clean === "MagmaOre") return "/ảnh/nguyên liệu võ godhuamn/Magma_Ore.webp";
  return `/ảnh/nguyên liệu võ godhuamn/${clean}.webp`;
};

const ImageWithFallback = ({ src, alt, fallbackIcon, className }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`img-fallback ${className}`}>
        {fallbackIcon}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
};

export default function AccountDetail({ account, onClose }) {
  if (!account) return null;

  const tier = fruitTier(account.fruit);
  const tierColor = fruitTierColor(tier);

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  // Deduplicate inventory items and count them
  const inventoryCounts = (account.inventory || []).reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="detail-overlay" onClick={handleOverlayClick}>
      <div className="detail-panel" role="dialog" aria-modal="true">

        {/* Header */}
        <div className="detail-header">
          <div>
            <div className="detail-username-row">
              <span className="detail-username">{account.username}</span>
              <span className={`badge ${account.is_online ? "badge-online" : "badge-offline"}`}>
                <span className="badge-dot" />
                {account.is_online ? "Online" : "Offline"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
              <span className={`sea-badge ${seaClass(account.sea)}`}>
                {seaLabel(account.sea)}
              </span>
              <span className="detail-id-badge">
                ID: {account.user_id}
              </span>
            </div>
          </div>
          <button className="detail-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Body */}
        <div className="detail-body">

          {/* Section 1: Stats */}
          <div className="detail-section">
            <h4 className="detail-sec-title">📊 Chỉ số cơ bản</h4>
            <div className="detail-grid">
              <div className="detail-card-stat">
                <div className="card-stat-icon" style={{ color: levelColor(account.level) }}>⭐</div>
                <div>
                  <div className="card-stat-label">Level</div>
                  <div className="card-stat-value" style={{ color: levelColor(account.level) }}>
                    {formatNumber(account.level)}
                  </div>
                </div>
              </div>

              <div className="detail-card-stat">
                <div className="card-stat-icon text-yellow-glow"><Coins size={18} /></div>
                <div>
                  <div className="card-stat-label">Beli</div>
                  <div className="card-stat-value text-yellow-glow">
                    {formatNumber(account.beli)}
                  </div>
                </div>
              </div>

              <div className="detail-card-stat">
                <div className="card-stat-icon text-cyan-glow"><Gem size={18} /></div>
                <div>
                  <div className="card-stat-label">Fragments</div>
                  <div className="card-stat-value text-cyan-glow">
                    {formatNumber(account.fragments)}
                  </div>
                </div>
              </div>

              <div className="detail-card-stat">
                <div className="card-stat-icon text-blue-glow"><User size={18} /></div>
                <div>
                  <div className="card-stat-label">Chủng tộc</div>
                  <div className="card-stat-value text-blue-glow">
                    {account.race || "Unknown"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Primary Equipment */}
          <div className="detail-section">
            <h4 className="detail-sec-title">⚔️ Trang bị chính</h4>
            <div className="equipment-grid-layout">
              {/* Fruit */}
              <div className="equip-item-card" style={account.fruit !== "None" ? { borderColor: `${tierColor}55` } : {}}>
                <div className="equip-avatar-box" style={{ background: account.fruit !== "None" ? `${tierColor}14` : 'rgba(255,255,255,0.02)' }}>
                  <ImageWithFallback 
                    src={account.fruit && account.fruit !== "None" ? `/ảnh/fruit/${account.fruit.replace(/\s+/g, '_')}.webp` : null} 
                    alt={account.fruit}
                    fallbackIcon={<Apple size={24} color={account.fruit !== "None" ? tierColor : 'var(--text-muted)'} />}
                    className="equip-img"
                  />
                </div>
                <div className="equip-info">
                  <div className="equip-label">Trái Ác Quỷ</div>
                  <div className="equip-name" style={account.fruit !== "None" ? { color: tierColor } : {}}>{account.fruit || "None"}</div>
                  {account.fruit !== "None" && <span className="equip-tier-tag" style={{ background: `${tierColor}22`, color: tierColor }}>Tier {tier}</span>}
                </div>
              </div>

              {/* Sword */}
              <div className="equip-item-card" style={account.sword !== "None" ? { borderColor: 'rgba(239, 68, 68, 0.4)' } : {}}>
                <div className="equip-avatar-box" style={{ background: account.sword !== "None" ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255,255,255,0.02)' }}>
                  <ImageWithFallback 
                    src={getSwordImage(account.sword)} 
                    alt={account.sword}
                    fallbackIcon={<Sword size={24} color={account.sword !== "None" ? 'var(--accent-red)' : 'var(--text-muted)'} />}
                    className="equip-img"
                  />
                </div>
                <div className="equip-info">
                  <div className="equip-label">Kiếm</div>
                  <div className="equip-name" style={account.sword !== "None" ? { color: 'var(--accent-red)' } : {}}>{account.sword || "None"}</div>
                </div>
              </div>

              {/* Melee */}
              <div className="equip-item-card" style={account.melee !== "None" ? { borderColor: 'rgba(16, 185, 129, 0.4)' } : {}}>
                <div className="equip-avatar-box" style={{ background: account.melee !== "None" ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.02)' }}>
                  <ImageWithFallback 
                    src={getMeleeImage(account.melee)} 
                    alt={account.melee}
                    fallbackIcon={<Flame size={24} color={account.melee !== "None" ? 'var(--accent-green)' : 'var(--text-muted)'} />}
                    className="equip-img"
                  />
                </div>
                <div className="equip-info">
                  <div className="equip-label">Võ Thuật</div>
                  <div className="equip-name" style={account.melee !== "None" ? { color: 'var(--accent-green)' } : {}}>{account.melee || "None"}</div>
                </div>
              </div>

              {/* Gun */}
              <div className="equip-item-card" style={account.gun !== "None" ? { borderColor: 'rgba(249, 115, 22, 0.4)' } : {}}>
                <div className="equip-avatar-box" style={{ background: account.gun !== "None" ? 'rgba(249, 115, 22, 0.08)' : 'rgba(255,255,255,0.02)' }}>
                  <ImageWithFallback 
                    src={getGunImage(account.gun)} 
                    alt={account.gun}
                    fallbackIcon={<Crosshair size={24} color={account.gun !== "None" ? 'var(--accent-orange)' : 'var(--text-muted)'} />}
                    className="equip-img"
                  />
                </div>
                <div className="equip-info">
                  <div className="equip-label">Súng</div>
                  <div className="equip-name" style={account.gun !== "None" ? { color: 'var(--accent-orange)' } : {}}>{account.gun || "None"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Accessories */}
          <div className="detail-section">
            <h4 className="detail-sec-title">👑 Phụ kiện ({(account.accessories || []).length})</h4>
            {account.accessories && account.accessories.length > 0 ? (
              <div className="items-grid-container">
                {account.accessories.map((accName, i) => (
                  <div className="grid-item-slot" key={i} title={accName}>
                    <div className="item-slot-image-box">
                      <ImageWithFallback 
                        src={getAccessoryImage(accName)} 
                        alt={accName}
                        fallbackIcon={<Shield size={20} color="var(--accent-blue)" />}
                        className="item-slot-img"
                      />
                    </div>
                    <div className="item-slot-name">{accName}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="detail-empty">Không có accessories</div>
            )}
          </div>

          {/* Section 4: Materials */}
          <div className="detail-section">
            <h4 className="detail-sec-title"><Hammer size={14} style={{ marginRight: 6, display: 'inline' }} /> Nguyên liệu ({Object.keys(account.materials || {}).length} loại)</h4>
            {account.materials && Object.keys(account.materials).length > 0 ? (
              <div className="materials-grid-container">
                {Object.entries(account.materials).map(([name, count], i) => (
                  <div className="material-card-slot" key={i} title={`${name}: ${count}`}>
                    <div className="material-image-box">
                      <ImageWithFallback 
                        src={getMaterialImage(name)} 
                        alt={name}
                        fallbackIcon={<Hammer size={18} color="var(--accent-yellow)" />}
                        className="material-slot-img"
                      />
                    </div>
                    <div className="material-info-box">
                      <div className="material-name-text">{name}</div>
                      <div className="material-count-text">×{count}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="detail-empty">Không có materials</div>
            )}
          </div>

          {/* Section 5: Backpack Inventory */}
          <div className="detail-section">
            <h4 className="detail-sec-title"><Backpack size={14} style={{ marginRight: 6, display: 'inline' }} /> Hòm đồ Backpack ({(account.inventory || []).length} items)</h4>
            {account.inventory && account.inventory.length > 0 ? (
              <div className="items-grid-container">
                {Object.entries(inventoryCounts).map(([item, count], i) => (
                  <div className="grid-item-slot" key={i} title={`${item} (Số lượng: ${count})`}>
                    <div className="item-slot-image-box">
                      <ImageWithFallback 
                        src={getSwordImage(item) || getGunImage(item)} 
                        alt={item}
                        fallbackIcon={<Backpack size={20} color="var(--accent-cyan)" />}
                        className="item-slot-img"
                      />
                    </div>
                    <div className="item-slot-name">{item}</div>
                    {count > 1 && <span className="item-slot-badge">×{count}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="detail-empty">Backpack trống</div>
            )}
          </div>

          {/* Section 6: Meta Info */}
          <div className="detail-section" style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <h4 className="detail-sec-title">🕐 Thông tin đồng bộ</h4>
            <div className="detail-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              <div className="meta-info-item">
                <span className="meta-info-icon"><Clock size={14} /></span>
                <span>Last Seen: <strong>{timeAgo(account.last_seen)}</strong></span>
              </div>
              <div className="meta-info-item">
                <span className="meta-info-icon">📅</span>
                <span>Thời gian tạo: <strong>{formatDate(account.created_at)}</strong></span>
              </div>
              <div className="meta-info-item">
                <span className="meta-info-icon">🔄</span>
                <span>Cập nhật cuối: <strong>{formatDate(account.updated_at)}</strong></span>
              </div>
              <div className="meta-info-item">
                <span className="meta-info-icon">🛰️</span>
                <span>Status gửi: <strong style={{ color: account.status === "online" ? "var(--accent-green)" : "var(--text-secondary)" }}>{account.status}</strong></span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
