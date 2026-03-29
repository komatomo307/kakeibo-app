import type { PropsWithChildren } from "react";
import { AppStateProvider } from "../../state/AppContext";
import { AuthProvider } from "../../state/AuthContext";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AuthProvider>
      <AppStateProvider>{children}</AppStateProvider>
    </AuthProvider>
  );
}
