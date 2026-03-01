import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useAuth } from "../contexts/AuthContext";

const AvatarMenu = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-indigo-500 text-sm font-semibold text-[#0a0f0e]">
            {getInitials(user.name)}
          </span>
          <div className="text-left text-xs leading-tight">
            <p className="font-semibold text-white">{user.name}</p>
            <p className="text-white/60">{user.title || user.role}</p>
          </div>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content className="min-w-[220px] rounded-2xl border border-white/10 bg-[#161927] p-2 text-sm text-white shadow-xl" sideOffset={10} align="end">
        <DropdownMenu.Label className="px-3 py-1 text-xs uppercase tracking-widest text-white/40">Session</DropdownMenu.Label>
        
        {/* Show additional options only for managers and owners */}
        {(user.role === "owner" || user.role === "manager") && (
          <>
            <DropdownMenu.Item className="cursor-pointer rounded-xl px-3 py-2 hover:bg-white/5">
              Switch register
            </DropdownMenu.Item>
            <DropdownMenu.Item className="cursor-pointer rounded-xl px-3 py-2 hover:bg-white/5">
              Team settings
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-2 border-t border-white/10" />
          </>
        )}
        
        <DropdownMenu.Item 
          className="cursor-pointer rounded-xl px-3 py-2 text-red-300 hover:bg-red-500/10"
          onClick={logout}
        >
          Sign out
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};

export default AvatarMenu;
