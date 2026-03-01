import { ReactNode, useState } from "react";

import SideNav from "../components/SideNav";
import TopBar from "../components/TopBar";
import NewOrderModal from "../components/NewOrderModal";
import ReceiveStockModal from "../components/ReceiveStockModal";

type Props = {
  children: ReactNode;
};

const AppShell = ({ children }: Props) => {
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showReceiveStockModal, setShowReceiveStockModal] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#090b11] text-white">
      <SideNav />
      <div className="flex flex-1 flex-col">
        <TopBar 
          onNewOrder={() => setShowNewOrderModal(true)}
          onReceiveStock={() => setShowReceiveStockModal(true)}
        />
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-[#0f1117] via-[#111526] to-[#090b11] px-8 pb-10 pt-6">
          {children}
        </main>
      </div>

      {/* Global Modals */}
      {showNewOrderModal && (
        <NewOrderModal onClose={() => setShowNewOrderModal(false)} />
      )}

      {showReceiveStockModal && (
        <ReceiveStockModal onClose={() => setShowReceiveStockModal(false)} />
      )}
    </div>
  );
};

export default AppShell;
