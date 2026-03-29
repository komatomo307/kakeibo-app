import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/input", label: "入力" },
  { to: "/history", label: "履歴" },
  { to: "/dashboard", label: "集計" },
  { to: "/settings", label: "設定" },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur">
      <ul className="mx-auto grid max-w-md grid-cols-4 gap-2">
        {tabs.map((tab) => (
          <li key={tab.to}>
            <NavLink
              to={tab.to}
              className={({ isActive }) =>
                [
                  "block rounded-xl px-2 py-2 text-center text-xs font-medium transition",
                  isActive
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600",
                ].join(" ")
              }
            >
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
