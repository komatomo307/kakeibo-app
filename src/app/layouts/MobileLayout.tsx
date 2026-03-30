import { type PropsWithChildren, useEffect, useState } from "react";
import { BottomNav } from "./BottomNav";
import { useAppState } from "../../state/AppContext";

export function MobileLayout({ children }: PropsWithChildren) {
  const { state, setSelectedMonthKey } = useAppState();
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const updateMode = () => {
      const navigatorStandalone =
        "standalone" in navigator &&
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

      setIsStandaloneMode(mediaQuery.matches || navigatorStandalone);
    };

    updateMode();
    mediaQuery.addEventListener("change", updateMode);

    return () => {
      mediaQuery.removeEventListener("change", updateMode);
    };
  }, []);

  const openInSafari = () => {
    window.open(window.location.href, "_blank", "noopener,noreferrer");
  };

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

        {isStandaloneMode ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-800">
              Safariのツールバーが必要な場合は、ブラウザ表示で開いてください。
            </p>
            <button
              type="button"
              onClick={openInSafari}
              className="mt-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Safariで開く
            </button>
          </div>
        ) : null}
      </header>
      <main className="px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  );
}
