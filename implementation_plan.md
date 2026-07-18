# Implementation Plan - User Geographic Monitor Dashboard

This plan outlines the steps required to implement the professional **User Geographic Monitor** dashboard, styled with dark mode, glassmorphism, gold neon borders, custom pulsing markers, and real-time Socket.IO synchronization.

---

## User Review Required

> [!IMPORTANT]
> **Map & Styling Aesthetics**: The dashboard is designed to look like Cloudflare Radar/Datadog/Grafana. It uses a CartoDB Dark Matter tile layer for an elegant black background (`#0A0A0A`), layered with a gold-bordered Vietnam GeoJSON outline (`#FFD700`), custom pulsing HTML markers with user avatars/usernames, and micro-animations for real-time connection events.

---

## Proposed Changes

We will modify both the backend and frontend components.

---

### Backend Components

#### [NEW] [IpCache.js](file:///d:/Users/khanh/Desktop/qu%E1%BA%A3n%20l%C3%BD%20acc%20python%2520-%2520Copy/backend/models/IpCache.js)
- Add a Mongoose schema to cache IP geolocation results (latitude, longitude, province, city, ISP) for 30 days. This optimizes API requests to `ipwho.is` and avoids rate limits.

#### [NEW] [map.js](file:///d:/Users/khanh/Desktop/qu%E1%BA%A3n%20l%C3%BD%20acc%20python%2520-%2520Copy/backend/routes/map.js)
- Implement `GET /api/map/users`:
  - Fetch all online users currently connected via Socket.IO.
  - Fetch offline users from the `User` collection (and their last recorded successful `LoginHistory`).
  - Resolve locations for all user IPs using the caching lookup.
  - Return aggregated user data: username, online status, lat, lng, province, OS, browser, loginMethod, ip, and ping.

#### [MODIFY] [server.js](file:///d:/Users/khanh/Desktop/qu%E1%BA%A3n%20l%C3%BD%20acc%20python%2520-%2520Copy/backend/server.js)
- Mount the new map router: `/api/map` -> `backend/routes/map.js`.
- Expand Socket.IO connection event:
  - On socket connection, authenticate JWT, extract request IP and user agent.
  - Look up geolocation using cached IP details, compile a session object, and add the user to the active sessions tracking map.
  - Broadcast `user_online` to all connected clients.
  - Bind listener `update_gps_location` to accept browser-level latitude/longitude coordinates (replaces IP-level coordinates with accurate GPS coordinates) and broadcast `user_move`.
  - Bind listener `update_ping` to update user latency and broadcast `user_move`.
  - On socket disconnect, remove the session and broadcast `user_offline` to notify dashboards in real-time.

---

### Frontend Components

#### [MODIFY] [App.tsx](file:///d:/Users/khanh/Desktop/qu%E1%BA%A3n%20l%C3%BD%20acc%20python%2520-%2520Copy/frontend/src/App.tsx)
- Import the new `GeoMonitor` page.
- Add a protected route `/dashboard/geo` linked to the page component.

#### [MODIFY] [DashboardLayout.tsx](file:///d:/Users/khanh/Desktop/qu%E1%BA%A3n%20l%C3%BD%2520acc%2520python%2520-%2520Copy/frontend/src/layouts/DashboardLayout.tsx)
- Add a new navigation menu item: **Geo Monitor** under the "Core Fleet" section, linked to `/dashboard/geo` with a custom Map/Target icon.

#### [NEW] [GeoMonitor.tsx](file:///d:/Users/khanh/Desktop/qu%E1%BA%A3n%2520l%25C3%25BD%2520acc%2520python%2520-%2520Copy/frontend/src/pages/GeoMonitor.tsx)
- Implement a gorgeous, premium, dark dashboard page:
  - **Leaflet Map**: Render CartoDB Dark Matter tile layers styled with gold border GeoJSON Vietnam overlays.
  - **Pulsing Markers**: Custom HTML markers with gold halos (`rgba(255, 215, 0, 0.4)`) and user tags. Heatmap-based marker colors based on density (yellow-dot -> yellow -> orange -> red).
  - **Click Drawer/Tooltip**: Sleek card on marker click showing user profile details (Login type, OS, Browser, Exact coordinates, ISP, Ping in ms, Runtime).
  - **Realtime stats header**: Displays Total Online, Offline, and Vietnam-focused active users.
  - **Filters side panel**: Filter users in real-time by province, device type, login method (Google/Discord/Email), and status (Online/Offline).
  - **Live Activity logger**: Automatically updates whenever `user_online`, `user_offline`, or `user_move` socket events fire.
  - **Geolocation Integration**: Triggers `navigator.geolocation.getCurrentPosition(...)` to fetch GPS coordinates. If granted, emits the updated location to the backend socket, enabling the dual-tier tracking.

#### [MODIFY] [index.css](file:///d:/Users/khanh/Desktop/qu%E1%BA%A3n%2520l%25C3%25BD%2520acc%2520python%2520-%2520Copy/frontend/src/index.css)
- Add custom classes for leaflet container borders, golden glowing scrollbars, card overlays, and ring expansion animations for marker entrances.

---

## Verification Plan

### Automated Tests
- Check frontend bundling and compile correctness (`npm run build` inside `frontend/`).
- Validate backend server starts up correctly.

### Manual Verification
- Launch the application and log in.
- Navigate to the **Geo Monitor** page.
- Test changing filters (Province, Device, Login, Online status) and confirm the list and map update instantly.
- Click a marker and verify the detailed information panel displays correct user agent, IP, provider, and ping details.
- Verify GPS location permissions dialog. Grant permission and verify that the marker moves to the exact location and emits `user_move` socket events.
- Test Socket connection updates by logging in with a second browser session and observing the marker appearing and the Activity Feed updating in real-time without reloading.
