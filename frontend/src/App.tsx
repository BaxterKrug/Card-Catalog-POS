import { Navigate, Route, Routes } from "react-router-dom";
import { ReactNode } from "react";

import AppShell from "./layout/AppShell";
import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import OrdersPage from "./pages/OrdersPage";
import PreordersPage from "./pages/PreordersPage";
import CustomersPage from "./pages/CustomersPage";
import BuylistPage from "./pages/BuylistPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import { useAuth } from "./contexts/AuthContext";

// Protected route wrapper that checks user role
function ProtectedRoute({ children, allowedRoles }: { children: ReactNode; allowedRoles: string[] }) {
  const { user } = useAuth();
  
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/orders" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <AppShell>
      <Routes>
        <Route 
          path="/" 
          element={
            <ProtectedRoute allowedRoles={["owner", "manager"]}>
              <DashboardPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/inventory" 
          element={
            <ProtectedRoute allowedRoles={["owner", "manager"]}>
              <InventoryPage />
            </ProtectedRoute>
          } 
        />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/preorders" element={<PreordersPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/buylist" element={<BuylistPage />} />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute allowedRoles={["owner", "manager"]}>
              <SettingsPage />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/orders" />} />
      </Routes>
    </AppShell>
  );
}

export default App;
