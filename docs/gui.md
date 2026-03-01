# CheckoutDesignator – Frontend Plan

## Tech Stack
- **Framework:** React 18 with Vite for fast dev/build.
- **Language:** TypeScript for type safety with backend contracts.
- **UI Library:** Radix UI primitives + TailwindCSS for rapid dark theme implementation.
- **State/Query:** React Query for data fetching + caching, Zustand for local UI state (drawer, modals).
- **HTTP Client:** Axios with interceptors pointing at FastAPI backend (`/api`).

## Layout & Navigation
- **Shell:** Persistent left rail (80px collapsed / 240px expanded) featuring SK Games branding, quick links (Dashboard, Inventory, Orders, Preorders, Customers, Settings).
- **Top Bar:** Search, active register indicator, operator profile dropdown, quick actions (new order, receive stock).
- **Content Panels:** Cards + tables with subtle glassmorphism and neon accent tokens, high-contrast dark palette (#0F1117 background, #1C1F2B surfaces, SK teal accent #29D3C3).

## Key Screens
1. **Dashboard**
   - KPIs: Available vs allocated stock, active preorder claims, pickup queue.
   - Activity feed (recent adjustments, orders, claims).
2. **Inventory**
   - Data grid with SKU, name, source (Single vs Supplier), game title, and physical/allocated/available ratios (colored bars), quick adjust buttons.
   - Drawer for editing/receiving stock, CSV import modal.
3. **Orders**
   - Tabs for Draft/Open/Ready/Picked Up/Cancelled.
   - Detail flyout with timeline, line items, status actions.
4. **Preorders**
   - Timeline of upcoming releases, claim table with FIFO indicators.
   - Allocation progress bars.
5. **Customers**
   - List with search + filter; cards showing pickup status, outstanding claims/orders.

## Component Hierarchy
```
AppShell
 ├─ SideNav
 ├─ TopBar
 └─ Outlet (React Router)

DashboardPage
 ├─ StatCards
 ├─ ActivityFeed

InventoryPage
 ├─ InventoryTable (TanStack Table)
 ├─ AdjustDrawer
 └─ ReceiveModal

OrdersPage
 ├─ StatusTabs
 ├─ OrdersTable
 └─ OrderDetailDrawer

PreordersPage
 ├─ ReleaseTimeline
 ├─ ClaimsTable

CustomersPage
 ├─ CustomerTable
 └─ CustomerProfileSheet
```

## Data Contracts
Use `src/api/types.ts` generated from backend schemas (manual mapping for now). Shared interfaces for `InventoryItem`, `Order`, `Customer`, `PreorderClaim`, etc.

## Routing
- `/` Dashboard
- `/inventory`
- `/orders`
- `/preorders`
- `/customers`
- `/settings`

## Theming
- Tailwind config with CSS variables for dark palette.
- Typographic scale using Inter.
- Use glass panels with 8px radius, 1px border (#ffffff1a), drop shadows.

## Accessibility & Responsiveness
- Minimum contrast ratio 4.5:1.
- Keyboard navigable modals/drawers.
- Responsive layout: collapsible rail, stacked cards on tablet, full-width tables adopt horizontal scroll.

## Future Enhancements
- Offline queue for network drops.
- WebSocket live updates for inventory adjustments.
- Role-based access control (manager vs clerk).
