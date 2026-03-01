import { Bell, Plus, Search } from "lucide-react";
import AvatarMenu from "./AvatarMenu";

interface TopBarProps {
  onNewOrder: () => void;
  onReceiveStock: () => void;
}

const TopBar = ({ onNewOrder, onReceiveStock }: TopBarProps) => {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-[#0f1117]/80 px-8 py-4 backdrop-blur-xl">
      <div className="flex flex-1 items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2">
        <Search size={18} className="text-white/50" />
        <input
          placeholder="Search SK catalog, customers, orders..."
          className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
        />
      </div>
      <div className="ml-6 flex items-center gap-3">
        <button 
          onClick={onNewOrder}
          className="rounded-full border border-white/10 px-5 py-2 text-sm font-medium text-white hover:border-accent hover:text-accent"
        >
          New Order
        </button>
        <button 
          onClick={onReceiveStock}
          className="flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-[#061012] shadow-glow hover:bg-accent/90"
        >
          <Plus size={16} /> Receive Stock
        </button>
        <button className="relative rounded-full border border-white/10 p-2 text-white/70 hover:text-accent">
          <Bell size={18} />
          <span className="absolute right-1 top-1 inline-flex h-2.5 w-2.5 rounded-full bg-pink-500" />
        </button>
        <AvatarMenu />
      </div>
    </header>
  );
};

export default TopBar;
