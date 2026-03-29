import { Navigate, Route, Routes } from "react-router-dom";
import { MobileLayout } from "./layouts/MobileLayout";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { HistoryPage } from "../features/history/pages/HistoryPage";
import { InputPage } from "../features/input/pages/InputPage";
import { SettingsPage } from "../features/settings/pages/SettingsPage";
import { AuthPage } from "../features/auth/pages/AuthPage";
import { useAuth } from "../state/AuthContext";

export function AppRouter() {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <MobileLayout>
        <p className="rounded-2xl bg-white p-4 text-sm text-slate-500 shadow-sm">
          起動準備中...
        </p>
      </MobileLayout>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <MobileLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/input" replace />} />
        <Route path="/input" element={<InputPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </MobileLayout>
  );
}
