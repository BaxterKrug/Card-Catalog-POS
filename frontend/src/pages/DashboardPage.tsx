import { Activity, Package, ShoppingCart, Users } from "lucide-react";

const statCards = [
  {
    label: "Today's Revenue",
    value: "$18,420",
    change: "+12.5% vs yesterday",
    icon: Activity,
  },
  {
    label: "Inventory Alerts",
    value: "23 items",
    change: "7 critical, 16 warning",
    icon: Package,
  },
  {
    label: "Open Orders",
    value: "64",
    change: "18 awaiting payment",
    icon: ShoppingCart,
  },
  {
    label: "Active Customers",
    value: "1,482",
    change: "+3.8% MoM",
    icon: Users,
  },
];

const DashboardPage = () => {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-white/40">Overview</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Control tower</h1>
        <p className="mt-1 text-sm text-white/60">
          Quick pulse on revenue, catalog health, orders, and customers.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.25em] text-white/40">{card.label}</p>
              <card.icon size={18} className="text-accent" />
            </div>
            <p className="mt-4 text-2xl font-semibold text-white">{card.value}</p>
            <p className="mt-1 text-xs text-white/60">{card.change}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">Catalog Velocity</p>
              <h2 className="text-xl font-semibold text-white">Today vs forecast</h2>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">
              Updated 3m ago
            </span>
          </div>
          <div className="mt-6 h-48 rounded-2xl border border-white/5 bg-gradient-to-br from-white/5 via-transparent to-white/0"></div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">Operations</p>
              <h2 className="text-xl font-semibold text-white">Shift checklist</h2>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">
              Due today
            </span>
          </div>
          <ul className="mt-6 space-y-3 text-sm text-white/70">
            <li className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/0 px-4 py-3">
              Reconcile web + counter orders
              <span className="text-xs text-white/40">12:00 PM</span>
            </li>
            <li className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/0 px-4 py-3">
              Audit preorder deposits
              <span className="text-xs text-white/40">2:30 PM</span>
            </li>
            <li className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/0 px-4 py-3">
              Prep restock manifests
              <span className="text-xs text-white/40">4:45 PM</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
