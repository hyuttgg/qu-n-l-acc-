import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../store';
import { ShoppingBag, Search, Sparkles, Swords, Zap, Crown, Box } from 'lucide-react';

export const InventoryList: React.FC = () => {
  const { fetchAccounts } = useApp();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'fruits' | 'swords' | 'guns' | 'styles' | 'accessories' | 'materials'>('fruits');
  const [searchTerm, setSearchTerm] = useState('');
  const [inventories, setInventories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('fruits')) {
      setActiveTab('fruits');
    } else if (path.includes('weapons')) {
      setActiveTab('swords');
    } else if (path.includes('styles')) {
      setActiveTab('styles');
    } else if (path.includes('accessories')) {
      setActiveTab('accessories');
    } else if (path.includes('inventory')) {
      setActiveTab('materials'); // default to materials on inventory tab
    }
  }, [location]);

  useEffect(() => {
    const loadInventories = async () => {
      setLoading(true);
      await fetchAccounts();
      
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/accounts', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const accountsData = await res.json();
        
        if (accountsData.success) {
          const invList = await Promise.all(
            accountsData.data.map(async (acc: any) => {
              const resInv = await fetch(`http://localhost:5000/api/inventory/${acc._id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              const invData = await resInv.json();
              return {
                accountName: acc.robloxUsername,
                accountId: acc._id,
                inventory: invData.data || { fruits: [], weapons: [], guns: [], styles: [], accessories: [], materials: [] }
              };
            })
          );
          setInventories(invList);
        }
      } catch (err) {
        console.error('Error fetching batch inventories', err);
      } finally {
        setLoading(false);
      }
    };
    loadInventories();
  }, []);

  // Aggregate items across all account inventories
  const getAggregatedItems = () => {
    const itemsMap: { [key: string]: { name: string; quantity: number; accounts: string[] } } = {};

    inventories.forEach((invObj) => {
      const username = invObj.accountName;
      const inv = invObj.inventory;

      if (activeTab === 'fruits') {
        inv.fruits.forEach((item: string) => {
          if (!itemsMap[item]) itemsMap[item] = { name: item, quantity: 0, accounts: [] };
          itemsMap[item].quantity += 1;
          if (!itemsMap[item].accounts.includes(username)) itemsMap[item].accounts.push(username);
        });
      } else if (activeTab === 'swords') {
        inv.weapons.forEach((item: string) => {
          if (!itemsMap[item]) itemsMap[item] = { name: item, quantity: 0, accounts: [] };
          itemsMap[item].quantity += 1;
          if (!itemsMap[item].accounts.includes(username)) itemsMap[item].accounts.push(username);
        });
      } else if (activeTab === 'guns') {
        inv.guns.forEach((item: string) => {
          if (!itemsMap[item]) itemsMap[item] = { name: item, quantity: 0, accounts: [] };
          itemsMap[item].quantity += 1;
          if (!itemsMap[item].accounts.includes(username)) itemsMap[item].accounts.push(username);
        });
      } else if (activeTab === 'styles') {
        inv.styles.forEach((item: string) => {
          if (!itemsMap[item]) itemsMap[item] = { name: item, quantity: 0, accounts: [] };
          itemsMap[item].quantity += 1;
          if (!itemsMap[item].accounts.includes(username)) itemsMap[item].accounts.push(username);
        });
      } else if (activeTab === 'accessories') {
        inv.accessories.forEach((item: string) => {
          if (!itemsMap[item]) itemsMap[item] = { name: item, quantity: 0, accounts: [] };
          itemsMap[item].quantity += 1;
          if (!itemsMap[item].accounts.includes(username)) itemsMap[item].accounts.push(username);
        });
      } else if (activeTab === 'materials') {
        inv.materials.forEach((mat: any) => {
          const item = mat.name;
          if (!itemsMap[item]) itemsMap[item] = { name: item, quantity: 0, accounts: [] };
          itemsMap[item].quantity += mat.quantity;
          if (!itemsMap[item].accounts.includes(username)) itemsMap[item].accounts.push(username);
        });
      }
    });

    return Object.values(itemsMap).filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const resolveItemImage = (category: string, name: string) => {
    if (!name || name === 'None') return '';
    const normalizedName = name.trim().replace(/\s+/g, '_');
    let folder = '';
    
    if (category === 'swords') folder = 'ki%E1%BA%BFm';
    else if (category === 'guns') folder = 's%C3%BAng';
    else if (category === 'styles') folder = 'v%C3%B5';
    else if (category === 'accessories') folder = 'ph%E1%BB%A5%20ki%C3%AAn';
    else if (category === 'materials') folder = 'nguy%C3%AAn%20li%E1%BB%87u%20v%C3%B5%20godhuamn';

    if (!folder) return '';
    return `http://localhost:5000/api/images/${folder}/${normalizedName}.webp`;
  };

  const tabs = [
    { id: 'fruits', label: 'Fruits', icon: Sparkles },
    { id: 'swords', label: 'Swords', icon: Swords },
    { id: 'guns', label: 'Guns', icon: Zap },
    { id: 'styles', label: 'Styles', icon: Zap },
    { id: 'accessories', label: 'Accessories', icon: Crown },
    { id: 'materials', label: 'Materials', icon: Box },
  ] as const;

  const aggregatedItems = getAggregatedItems();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white glow-text-cyan flex items-center gap-2">
            <ShoppingBag className="w-8 h-8 text-gold" /> GLOBAL INVENTORY
          </h1>
          <p className="text-slate-400 text-sm mt-1">Aggregated inventory items and drops across all bot accounts</p>
        </div>

        <div className="relative w-full sm:w-72">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search items..."
            className="w-full bg-ocean-deep/60 border border-slate-800 focus:border-ocean-cyan focus:ring-1 focus:ring-ocean-cyan rounded-xl py-2.5 pl-10 pr-4 text-white text-sm outline-none transition"
          />
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex flex-wrap gap-2 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-gold/20 to-gold/5 border-gold text-gold shadow-gold-border'
                  : 'bg-ocean-deep/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm mt-4 font-semibold uppercase tracking-wider">Unpacking Inventory Chests...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {aggregatedItems.map((item) => (
            <div
              key={item.name}
              className={`bg-ocean-deep p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between items-center text-center relative overflow-hidden group hover:border-gold/30 hover:shadow-gold-border transition transform duration-200`}
            >
              {/* Image box */}
              <div className="w-20 h-20 bg-ocean-abyss/80 rounded-xl border border-slate-900 flex items-center justify-center overflow-hidden mb-3 relative group-hover:scale-105 transition-transform duration-200">
                {resolveItemImage(activeTab, item.name) ? (
                  <img
                    src={resolveItemImage(activeTab, item.name)}
                    alt={item.name}
                    className="w-16 h-16 object-contain"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                ) : (
                  <span className="text-3xl">
                    {activeTab === 'fruits' ? '🍓' : activeTab === 'swords' ? '⚔️' : activeTab === 'guns' ? '🔫' : activeTab === 'styles' ? '👊' : activeTab === 'accessories' ? '👑' : '📦'}
                  </span>
                )}
              </div>

              {/* Item Name */}
              <span className="text-sm font-extrabold text-white line-clamp-2 px-1">{item.name}</span>

              {/* Total Stock badge */}
              <span className="mt-2 text-xs font-bold bg-gold/10 border border-gold/30 text-gold px-2 py-0.5 rounded-full">
                Stock: {item.quantity}
              </span>

              {/* Owners list dropdown layout style */}
              <div className="mt-3 w-full border-t border-slate-900 pt-2 text-[10px] text-slate-500 text-left truncate">
                <span className="font-semibold block text-[9px] uppercase text-slate-600 mb-0.5">Found on:</span>
                <span className="font-medium text-slate-400">{item.accounts.join(', ')}</span>
              </div>
            </div>
          ))}

          {aggregatedItems.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-500 text-sm">
              No items discovered in this category. Connect your accounts and start farming!
            </div>
          )}
        </div>
      )}
    </div>
  );
};
