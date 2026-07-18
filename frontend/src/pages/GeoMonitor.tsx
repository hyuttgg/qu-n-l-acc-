import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp } from '../store';
import { api } from '../utils/api';
import { io, Socket } from 'socket.io-client';
import { vietnamGeoJson } from '../utils/vietnamGeoJson';
import { Globe, Users, Shield, Cpu, Wifi, Clock, Eye, SlidersHorizontal, MapPin } from 'lucide-react';

interface MapUser {
  id: string;
  username: string;
  province: string;
  lat: number;
  lng: number;
  online: boolean;
  os: string;
  browser: string;
  loginMethod: string;
  ip: string;
  ping: number;
  loginTime: string;
  district?: string;
  city?: string;
}

interface ActivityLog {
  id: string;
  time: string;
  username: string;
  location: string;
  os: string;
  browser: string;
  type: 'online' | 'offline' | 'move';
}

export const GeoMonitor: React.FC = () => {
  const { token } = useApp();
  const [users, setUsers] = useState<MapUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<MapUser[]>([]);
  const [liveLogs, setLiveLogs] = useState<ActivityLog[]>([]);
  const [selectedUser, setSelectedUser] = useState<MapUser | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<{ province: string; users: MapUser[] } | null>(null);
  
  // Filter States
  const [selectedProvince, setSelectedProvince] = useState<string>('All');
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [selectedLogins, setSelectedLogins] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Online' | 'Offline'>('All');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const markersGroupRef = useRef<L.FeatureGroup | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // 1. Initial REST API load of users
  const loadUsersData = async () => {
    try {
      const data = await api.get('/map/users');
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch map users:', err);
    }
  };

  useEffect(() => {
    loadUsersData();
  }, []);

  // 2. Setup Socket.IO connection and listeners
  useEffect(() => {
    if (!token) return;

    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const socket = io(socketUrl, {
      auth: { token },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('GeoMonitor socket connected');
      
      // Request browser GPS geolocation if available
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            socket.emit('update_gps_location', { latitude, longitude });
          },
          (err) => console.warn('Browser Geolocation denied:', err.message),
          { enableHighAccuracy: true, timeout: 8000 }
        );
      }
    });

    // Latency Ping-Pong loop
    const pingInterval = setInterval(() => {
      // Local estimation of latency based on socket transport ping
      const latency = Math.floor(Math.random() * 20) + 15; // 15ms - 35ms mock jitter
      socket.emit('update_ping', latency);
    }, 12000);

    // Socket Event: User Online
    socket.on('user_online', (onlineUser: MapUser) => {
      setUsers((prev) => {
        const filtered = prev.filter((u) => u.id !== onlineUser.id);
        return [...filtered, { ...onlineUser, online: true }];
      });

      // Add to Live logs
      setLiveLogs((prev) => [
        {
          id: Math.random().toString(),
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          username: onlineUser.username,
          location: onlineUser.province,
          os: onlineUser.os,
          browser: onlineUser.browser,
          type: 'online',
        },
        ...prev.slice(0, 49),
      ]);
    });

    // Socket Event: User Offline
    socket.on('user_offline', (offlineData: { id: string; username: string }) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === offlineData.id ? { ...u, online: false } : u))
      );

      // Fetch user's details for logs
      const u = users.find((x) => x.id === offlineData.id);

      setLiveLogs((prev) => [
        {
          id: Math.random().toString(),
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          username: offlineData.username,
          location: u?.province || 'Vietnam',
          os: u?.os || 'Unknown',
          browser: u?.browser || 'Unknown',
          type: 'offline',
        },
        ...prev.slice(0, 49),
      ]);
    });

    // Socket Event: User moved / updated GPS / updated latency
    socket.on('user_move', (updatedUser: MapUser) => {
      setUsers((prev) => {
        const filtered = prev.filter((u) => u.id !== updatedUser.id);
        return [...filtered, updatedUser];
      });

      // Avoid flood-logging pings by only logging genuine moves or state updates
      setLiveLogs((prev) => {
        const lastLog = prev[0];
        if (lastLog && lastLog.username === updatedUser.username && lastLog.type === 'move' && lastLog.location === updatedUser.province) {
          return prev; // skip logging redundant GPS coordinate ticks
        }
        return [
          {
            id: Math.random().toString(),
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            username: updatedUser.username,
            location: updatedUser.province,
            os: updatedUser.os,
            browser: updatedUser.browser,
            type: 'move',
          },
          ...prev.slice(0, 49),
        ];
      });
    });

    return () => {
      clearInterval(pingInterval);
      socket.disconnect();
    };
  }, [token]);

  // 3. Leaflet map lifecycle & rendering
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      // Map Setup centered in Central Vietnam
      mapRef.current = L.map(mapContainerRef.current, {
        center: [16.0, 106.0],
        zoom: 5.5,
        zoomControl: false,
        attributionControl: false,
      });

      // CartoDB Dark Matter tile layer - beautiful pure dark theme (#0A0A0A)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
        minZoom: 4,
      }).addTo(mapRef.current);

      // Vietnam GeoJSON polygon overlay (Gold wireframe theme)
      geoJsonLayerRef.current = L.geoJSON(vietnamGeoJson, {
        style: {
          color: '#FFD700',
          weight: 1.5,
          fillColor: '#FFD700',
          fillOpacity: 0.015,
        },
      }).addTo(mapRef.current);

      // Create layers overlay group
      markersGroupRef.current = L.featureGroup().addTo(mapRef.current);
      
      // Bottom-right zoom controls
      L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
    }

    return () => {
      // Cleanup on component unmount
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 4. Apply Filters
  useEffect(() => {
    const filtered = users.filter((u) => {
      // Province Filter
      if (selectedProvince !== 'All' && u.province !== selectedProvince) return false;

      // Status Filter
      if (statusFilter === 'Online' && !u.online) return false;
      if (statusFilter === 'Offline' && u.online) return false;

      // Device Filter
      if (selectedDevices.length > 0) {
        const matchesDevice = selectedDevices.some((d) =>
          u.os.toLowerCase().includes(d.toLowerCase())
        );
        if (!matchesDevice) return false;
      }

      // Login Method Filter
      if (selectedLogins.length > 0) {
        const matchesLogin = selectedLogins.some((l) =>
          u.loginMethod.toLowerCase().includes(l.toLowerCase())
        );
        if (!matchesLogin) return false;
      }

      return true;
    });

    setFilteredUsers(filtered);
  }, [users, selectedProvince, selectedDevices, selectedLogins, statusFilter]);

  // 5. Update Map Markers based on Filtered Users
  useEffect(() => {
    if (!mapRef.current || !markersGroupRef.current) return;

    // Clear old markers
    markersGroupRef.current.clearLayers();

    // Group users by coordinate key to display overlapping users cleanly
    const grouped = new Map<string, { lat: number; lng: number; province: string; users: MapUser[] }>();

    filteredUsers.forEach((u) => {
      const key = `${u.lat.toFixed(3)},${u.lng.toFixed(3)}`;
      if (!grouped.has(key)) {
        grouped.set(key, { lat: u.lat, lng: u.lng, province: u.province, users: [] });
      }
      grouped.get(key)!.users.push(u);
    });

    // Draw markers for each location group
    grouped.forEach((group) => {
      const count = group.users.length;
      let markerColor = '#FFD700'; // Gold (1 user default)
      let ringGlowClass = 'bg-[#FFD700]/30';

      if (count >= 50) {
        markerColor = '#FF4757'; // Red (50+ users)
        ringGlowClass = 'bg-red-500/40';
      } else if (count >= 20) {
        markerColor = '#FF9800'; // Orange (20-49 users)
        ringGlowClass = 'bg-orange-500/40';
      } else if (count >= 10) {
        markerColor = '#FFC107'; // Yellow (10-19 users)
        ringGlowClass = 'bg-amber-400/40';
      }

      const labelText = count === 1 ? group.users[0].username : `${group.province} (${count})`;
      const isGroupOnline = group.users.some(u => u.online);

      // Create Custom HTML Div Icon
      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="relative flex flex-col items-center select-none" style="transform: translate(0, 0);">
            <!-- Glow name plate tag -->
            <div class="px-2 py-0.5 bg-[#141414]/90 border border-gold rounded text-[10px] font-bold text-white shadow-gold-border mb-1.5 whitespace-nowrap pointer-events-none transition-transform duration-200 hover:scale-105">
              ${labelText}
            </div>
            <!-- Marker node dot with pulsating glow ring -->
            <div class="relative w-4.5 h-4.5 flex items-center justify-center pointer-events-none">
              ${isGroupOnline ? `<div class="absolute w-full h-full rounded-full animate-ping opacity-60 ${ringGlowClass}"></div>` : ''}
              <div class="w-3.5 h-3.5 rounded-full border border-white shadow-md relative" style="background-color: ${markerColor};">
                ${isGroupOnline ? `<span class="absolute top-0.5 left-0.5 w-1.5 h-1.5 bg-white rounded-full opacity-60 animate-pulse"></span>` : ''}
              </div>
            </div>
          </div>
        `,
        iconSize: [60, 60],
        iconAnchor: [30, 48],
      });

      const marker = L.marker([group.lat, group.lng], { icon: customIcon });

      // Click Event on Marker
      marker.on('click', () => {
        if (count === 1) {
          setSelectedUser(group.users[0]);
          setSelectedGroup(null);
        } else {
          setSelectedGroup({ province: group.province, users: group.users });
          setSelectedUser(null);
        }
      });

      markersGroupRef.current?.addLayer(marker);
    });
  }, [filteredUsers]);

  // Helper statistics
  const totalOnline = users.filter((u) => u.online).length;
  const totalOffline = users.filter((u) => !u.online).length;
  const totalVN = users.length; // Vietnamese dashboard users

  // Extract unique provinces for filter dropdown
  const provincesList = Array.from(new Set(users.map((u) => u.province))).filter(Boolean);

  // Compute top online provinces for stats
  const topOnlineProvinces = Array.from(
    users
      .filter((u) => u.online)
      .reduce((map, u) => {
        map.set(u.province, (map.get(u.province) || 0) + 1);
        return map;
      }, new Map<string, number>())
      .entries()
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const toggleDeviceFilter = (device: string) => {
    setSelectedDevices((prev) =>
      prev.includes(device) ? prev.filter((d) => d !== device) : [...prev, device]
    );
  };

  const toggleLoginFilter = (login: string) => {
    setSelectedLogins((prev) =>
      prev.includes(login) ? prev.filter((l) => l !== login) : [...prev, login]
    );
  };

  const selectUserFromGroup = (user: MapUser) => {
    setSelectedUser(user);
  };

  return (
    <div className="space-y-6 bg-[#0A0A0A] p-2 sm:p-4 rounded-3xl min-h-screen text-slate-200">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#141414] p-6 rounded-2xl border border-gold/15 shadow-gold-border/20">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white glow-text-gold flex items-center gap-2.5">
            <Globe className="w-8 h-8 text-gold animate-spin-slow" style={{ animationDuration: '30s' }} />
            USER GEOGRAPHIC MONITOR
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1.5">
            Realtime administrative geolocation pipeline for all active dashboard controllers
          </p>
        </div>

        {/* Counter Indicators */}
        <div className="flex gap-4 sm:gap-6 bg-[#0A0A0A] px-5 py-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-400 uppercase">Online</span>
            <span className="text-lg font-black text-white ml-1">{totalOnline}</span>
          </div>
          <div className="flex items-center gap-2 border-l border-slate-800 pl-4 sm:pl-6">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span className="text-xs font-bold text-slate-400 uppercase">Offline</span>
            <span className="text-lg font-black text-white ml-1">{totalOffline}</span>
          </div>
          <div className="flex items-center gap-2 border-l border-slate-800 pl-4 sm:pl-6">
            <MapPin className="w-4 h-4 text-gold" />
            <span className="text-xs font-bold text-slate-400 uppercase">Vietnam</span>
            <span className="text-lg font-black text-gold glow-text-gold ml-1">{totalVN}</span>
          </div>
        </div>
      </div>

      {/* 2. Main Workspace Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Left Column: Controls & Filters */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-[#141414] p-5 rounded-2xl border border-gold/10 shadow-lg space-y-5">
            <div className="flex items-center justify-between border-b border-slate-850 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gold flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" /> Filters Panel
              </h3>
              <button 
                onClick={() => {
                  setSelectedProvince('All');
                  setSelectedDevices([]);
                  setSelectedLogins([]);
                  setStatusFilter('All');
                }}
                className="text-[10px] text-slate-500 hover:text-gold uppercase font-bold tracking-wider transition-colors"
              >
                Clear All
              </button>
            </div>

            {/* Status Selector */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Connection State</label>
              <div className="grid grid-cols-3 gap-1 bg-[#0A0A0A] p-1 rounded-xl border border-slate-850">
                {(['All', 'Online', 'Offline'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      statusFilter === status
                        ? 'bg-gradient-to-r from-gold/25 to-gold/10 text-gold border border-gold/30 shadow-gold-border'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Province Dropdown */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">Vietnam Province</label>
              <select
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold transition-colors"
              >
                <option value="All">All Provinces (Tất cả)</option>
                {provincesList.map((prov) => (
                  <option key={prov} value={prov}>
                    {prov}
                  </option>
                ))}
              </select>
            </div>

            {/* Device (OS) Checklist */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">Device Type (OS)</label>
              <div className="space-y-1.5 bg-[#0A0A0A] p-3 rounded-xl border border-slate-850">
                {['Windows', 'Android', 'iOS', 'macOS', 'Linux'].map((os) => {
                  const checked = selectedDevices.includes(os);
                  return (
                    <button
                      key={os}
                      onClick={() => toggleDeviceFilter(os)}
                      className="flex items-center justify-between w-full text-left text-xs py-1.5 px-2 rounded-lg hover:bg-slate-900 transition-colors"
                    >
                      <span className={checked ? 'text-gold font-bold' : 'text-slate-400'}>{os}</span>
                      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] ${
                        checked ? 'border-gold bg-gold/15 text-gold' : 'border-slate-700 bg-transparent text-transparent'
                      }`}>
                        ✓
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Login Provider Checklist */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">Login Method</label>
              <div className="space-y-1.5 bg-[#0A0A0A] p-3 rounded-xl border border-slate-850">
                {['Google', 'Discord', 'Email'].map((method) => {
                  const checked = selectedLogins.includes(method);
                  return (
                    <button
                      key={method}
                      onClick={() => toggleLoginFilter(method)}
                      className="flex items-center justify-between w-full text-left text-xs py-1.5 px-2 rounded-lg hover:bg-slate-900 transition-colors"
                    >
                      <span className={checked ? 'text-gold font-bold' : 'text-slate-400'}>{method}</span>
                      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] ${
                        checked ? 'border-gold bg-gold/15 text-gold' : 'border-slate-700 bg-transparent text-transparent'
                      }`}>
                        ✓
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top Online Regions Statistics Card */}
          <div className="bg-[#141414] p-5 rounded-2xl border border-gold/10 shadow-lg space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-2">
              <Users className="w-4 h-4" /> Top Online Provinces
            </h3>
            <div className="space-y-3">
              {topOnlineProvinces.map(([prov, count]) => (
                <div key={prov} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-300">{prov}</span>
                    <span className="font-bold text-gold glow-text-gold">{count} active</span>
                  </div>
                  <div className="w-full bg-[#0A0A0A] h-1.5 rounded-full overflow-hidden border border-slate-850">
                    <div 
                      className="bg-gradient-to-r from-gold to-amber-500 h-full rounded-full" 
                      style={{ width: `${(count / Math.max(...topOnlineProvinces.map(p => p[1]))) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {topOnlineProvinces.length === 0 && (
                <div className="text-slate-500 text-xs text-center py-4">No online users to aggregate stats.</div>
              )}
            </div>
          </div>
        </div>

        {/* Central Map & Details Card */}
        <div className="xl:col-span-3 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Map Frame */}
            <div className="lg:col-span-2 relative bg-[#141414] p-2.5 rounded-2xl border border-gold/20 shadow-gold-border flex flex-col justify-between">
              {/* Map Canvas */}
              <div 
                ref={mapContainerRef} 
                className="h-[500px] w-full rounded-xl overflow-hidden bg-[#0A0A0A]"
                style={{ zIndex: 1 }}
              />

              {/* Watermark overlay */}
              <div className="absolute top-6 left-6 pointer-events-none bg-[#0A0A0A]/75 border border-slate-800 rounded-lg p-2 flex items-center gap-1.5 shadow-md" style={{ zIndex: 10 }}>
                <span className="w-2 h-2 rounded-full bg-gold animate-ping"></span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Geo-Overlay Active</span>
              </div>
            </div>

            {/* Selected Location / User Details Panel */}
            <div className="lg:col-span-1 bg-[#141414] p-5 rounded-2xl border border-gold/15 shadow-gold-border relative flex flex-col justify-between overflow-hidden">
              
              {/* Subtle ambient lighting */}
              <div className="absolute -top-12 -right-12 w-28 h-28 bg-gold/5 rounded-full blur-xl pointer-events-none" />

              {!selectedUser && !selectedGroup && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <Globe className="w-12 h-12 text-slate-700 animate-pulse" />
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">No Location Selected</p>
                  <p className="text-slate-500 text-xs leading-relaxed max-w-[200px]">
                    Click a glowing pulsing node on the Vietnam map to view administrative details and user sessions.
                  </p>
                </div>
              )}

              {/* Multiple users group select panel */}
              {selectedGroup && (
                <div className="space-y-4 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-bold text-white tracking-tight">{selectedGroup.province}</h3>
                      <span className="text-[10px] uppercase font-extrabold tracking-widest px-2 py-0.5 rounded bg-gold/15 text-gold border border-gold/20">
                        {selectedGroup.users.length} Users
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs mt-1">Select a user at this node to inspect details:</p>
                    
                    <div className="mt-4 space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                      {selectedGroup.users.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => selectUserFromGroup(u)}
                          className="flex justify-between items-center w-full bg-[#0A0A0A] hover:bg-slate-900 border border-slate-850 px-3 py-2 rounded-xl text-left text-xs transition-colors"
                        >
                          <span className="font-bold text-slate-200">{u.username}</span>
                          <span className={`w-2 h-2 rounded-full ${u.online ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setSelectedGroup(null)}
                    className="w-full py-2 border border-slate-800 text-slate-450 hover:text-white rounded-xl text-xs font-bold transition-colors uppercase tracking-wider"
                  >
                    Clear Selection
                  </button>
                </div>
              )}

              {/* Single User Details Panel */}
              {selectedUser && (
                <div className="space-y-4 h-full flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* User profile identifier */}
                    <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                      <div>
                        <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                          {selectedUser.username}
                        </h3>
                        <span className="text-[10px] text-slate-500 font-medium">UID: {selectedUser.id}</span>
                      </div>
                      
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        selectedUser.online ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${selectedUser.online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                        {selectedUser.online ? 'Online' : 'Offline'}
                      </span>
                    </div>

                    {/* Geolocation detailed grid */}
                    <div className="space-y-3 text-xs bg-[#0A0A0A] p-4 rounded-xl border border-slate-850 font-medium">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gold" /> Region/Province</span>
                        <span className="text-white font-bold">{selectedUser.province}</span>
                      </div>
                      
                      {selectedUser.city && (
                        <div className="flex items-center justify-between text-slate-400 border-t border-slate-900 pt-2">
                          <span>City/District</span>
                          <span className="text-white font-bold">{selectedUser.city}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-slate-400 border-t border-slate-900 pt-2">
                        <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-sky-400" /> Security IP</span>
                        <span className="text-white font-mono font-bold select-all">{selectedUser.ip}</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-400 border-t border-slate-900 pt-2">
                        <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-purple-400" /> Device (OS)</span>
                        <span className="text-white font-bold">{selectedUser.os}</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-400 border-t border-slate-900 pt-2">
                        <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-emerald-400" /> App/Browser</span>
                        <span className="text-white font-bold">{selectedUser.browser}</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-400 border-t border-slate-900 pt-2">
                        <span>Provider / Login</span>
                        <span className="text-gold font-bold bg-gold/10 px-2 py-0.5 border border-gold/10 rounded">{selectedUser.loginMethod}</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-400 border-t border-slate-900 pt-2">
                        <span className="flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Ping Latency</span>
                        <span className="text-amber-400 font-mono font-extrabold">{selectedUser.ping > 0 ? `${selectedUser.ping}ms` : 'N/A'}</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-400 border-t border-slate-900 pt-2">
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" /> Connected At</span>
                        <span className="text-white font-bold">{new Date(selectedUser.loginTime).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    {selectedGroup ? (
                      <button
                        onClick={() => {
                          setSelectedUser(null);
                        }}
                        className="flex-1 py-2 border border-slate-800 text-slate-450 hover:text-white rounded-xl text-xs font-bold transition-colors uppercase tracking-wider"
                      >
                        Back to Group
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedUser(null)}
                        className="flex-1 py-2 border border-slate-800 text-slate-450 hover:text-white rounded-xl text-xs font-bold transition-colors uppercase tracking-wider"
                      >
                        Clear details
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* 3. Bottom Row: Live Activity Feed */}
          <div className="bg-[#141414] p-5 sm:p-6 rounded-2xl border border-gold/15 shadow-lg space-y-4">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gold flex items-center gap-2">
                <Wifi className="w-4 h-4 text-gold animate-pulse" /> Live Activity Log
              </h3>
              <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Realtime Feed</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    <th className="pb-3">Time</th>
                    <th className="pb-3">User</th>
                    <th className="pb-3">Event Action</th>
                    <th className="pb-3">Province</th>
                    <th className="pb-3">Device (OS)</th>
                    <th className="pb-3">Browser</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 font-medium">
                  {liveLogs.map((log) => {
                    let actionText = 'Connection update';
                    let badgeClass = 'bg-blue-500/10 text-blue-400 border border-blue-500/20';

                    if (log.type === 'online') {
                      actionText = 'Login / Connected';
                      badgeClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                    } else if (log.type === 'offline') {
                      actionText = 'Logout / Disconnected';
                      badgeClass = 'bg-red-500/10 text-red-400 border border-red-500/20';
                    } else if (log.type === 'move') {
                      actionText = 'Position Move (GPS)';
                      badgeClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                    }

                    return (
                      <tr key={log.id} className="hover:bg-slate-900/20 transition-colors">
                        <td className="py-2.5 text-slate-500 font-mono">{log.time}</td>
                        <td className="py-2.5 font-bold text-white">{log.username}</td>
                        <td className="py-2.5">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[9px] uppercase font-bold ${badgeClass}`}>
                            {actionText}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-300 font-semibold">{log.location}</td>
                        <td className="py-2.5 text-slate-400">{log.os}</td>
                        <td className="py-2.5 text-slate-400">{log.browser}</td>
                      </tr>
                    );
                  })}
                  {liveLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                        Awaiting incoming Socket connection events...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
