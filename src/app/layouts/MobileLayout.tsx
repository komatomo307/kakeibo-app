import type { PropsWithChildren } from "react";
import { BottomNav } from "./BottomNav";
import { useAppState } from "../../state/AppContext";

export function MobileLayout({ children }: PropsWithChildren) {
  const { state, setSelectedMonthKey } = useAppState();

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-slate-50 pb-24">
      <header className="px-4 pt-4">
        <input
          type="month"
          value={`${state.selectedMonthKey.slice(0, 4)}-${state.selectedMonthKey.slice(4, 6)}`}
          onChange={(event) =>
            setSelectedMonthKey(event.target.value.replace("-", ""))
          }
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
        />
      </header>
      <main className="px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  );
}
