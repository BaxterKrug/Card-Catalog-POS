import { NavLink } from "react-router-dom";
import { Home, Boxes, ShoppingCart, Sparkles, Users, DollarSign, Settings, Menu, LogOut } from "lucide-react";
import clsx from "clsx";
import { useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const allLinks = [
  { to: "/", label: "Dashboard", icon: Home, roles: ["owner", "manager"] },
  { to: "/inventory", label: "Inventory", icon: Boxes, roles: ["owner", "manager"] },
  { to: "/orders", label: "Orders", icon: ShoppingCart, roles: ["owner", "manager", "employee"] },
  { to: "/preorders", label: "Preorders", icon: Sparkles, roles: ["owner", "manager", "employee"] },
  { to: "/customers", label: "Customers", icon: Users, roles: ["owner", "manager", "employee"] },
  { to: "/buylist", label: "Buylist", icon: DollarSign, roles: ["owner", "manager", "employee"] },
  { to: "/settings", label: "Settings", icon: Settings, roles: ["owner", "manager"] }
];

const SideNav = () => {
  const [expanded, setExpanded] = useState(true);
  const { user, logout } = useAuth();
  
  // Filter links based on user role
  const links = useMemo(() => {
    if (!user) return [];
    return allLinks.filter(link => link.roles.includes(user.role));
  }, [user]);
  
  const navClasses = useMemo(
    () =>
      clsx(
        "flex flex-col border-r border-white/5 bg-[#0a0c12] text-white transition-all duration-300",
        expanded ? "w-64" : "w-20"
      ),
    [expanded]
  );

  return (
    <aside className={navClasses}>
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-accent to-indigo-500 text-2xl font-black text-center leading-10">
            CD
          </div>
          {expanded && (
            <div>
              <p className="text-xs uppercase tracking-widest text-white/60">SK R&D</p>
              <p className="text-lg font-semibold">CheckoutDesignator</p>
            </div>
          )}
        </div>
        <button
          type="button"
          className="rounded-full border border-white/10 p-2 hover:border-accent hover:text-accent"
          onClick={() => setExpanded(!expanded)}
        >
          <Menu size={18} />
        </button>
      </div>

      {expanded && user && (
        <div className="mx-3 mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Signed in as</p>
          <p className="mt-1 font-medium text-white">{user.name}</p>
          <p className="text-xs text-white/50">@{user.username} · {user.role}</p>
        </div>
      )}

      <nav className="mt-4 flex flex-1 flex-col gap-1 px-3">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                isActive
                  ? "bg-gradient-to-r from-accent/20 to-transparent text-accent"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )
            }
          >
            <Icon size={18} />
            {expanded && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/5 px-6 py-4">
        {expanded ? (
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut size={18} />
            <span>Sign out</span>
          </button>
        ) : (
          <button
            onClick={logout}
            className="flex w-full items-center justify-center rounded-2xl p-2 text-white/60 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut size={18} />
          </button>
        )}
        <p className="mt-3 text-xs text-white/50">POS v0.1 · SK Games</p>
      </div>
    </aside>
  );
};

export default SideNav;
