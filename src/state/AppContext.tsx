import dayjs from "dayjs";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_PAYMENT_SOURCES,
  type JournalEntry,
  type UserSettings,
} from "../domain/models/accounting";
import {
  deleteJournalEntry,
  ensureOpeningBalanceEntries,
  ensureUserSettings,
  fetchMonthlyEntries,
  saveUserSettings as saveUserSettingsRepository,
  updateJournalEntry as updateJournalEntryRepository,
  upsertJournalEntry,
} from "../lib/repositories/kakeiboRepository";
import { useAuth } from "./AuthContext";

const REQUEST_TIMEOUT_MS = 8000;

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("ネットワーク応答がタイムアウトしました。"));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

interface AppState {
  userId: string;
  selectedMonthKey: string;
  settings: UserSettings | null;
  entries: JournalEntry[];
}

type AppAction =
  | { type: "bootstrap"; payload: { userId: string; settings: UserSettings } }
  | { type: "setMonth"; payload: string }
  | { type: "setEntries"; payload: JournalEntry[] }
  | { type: "setSettings"; payload: UserSettings }
  | { type: "reset" };

interface AppContextValue {
  state: AppState;
  monthEntries: JournalEntry[];
  loading: boolean;
  syncing: boolean;
  errorMessage: string | null;
  setSelectedMonthKey: (monthKey: string) => void;
  addEntry: (entry: JournalEntry) => Promise<void>;
  updateEntry: (
    previousEntry: JournalEntry,
    nextEntry: JournalEntry,
  ) => Promise<void>;
  deleteEntry: (entry: JournalEntry) => Promise<void>;
  saveSettings: (settings: UserSettings) => Promise<void>;
  refreshMonthEntries: () => Promise<void>;
}

const initialState: AppState = {
  userId: "",
  selectedMonthKey: dayjs().format("YYYYMM"),
  settings: null,
  entries: [],
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "bootstrap":
      return {
        ...state,
        userId: action.payload.userId,
        settings: action.payload.settings,
      };
    case "setMonth":
      return { ...state, selectedMonthKey: action.payload };
    case "setEntries":
      return { ...state, entries: action.payload };
    case "setSettings":
      return { ...state, settings: action.payload };
    case "reset":
      return initialState;
    default:
      return state;
  }
}

const AppStateContext = createContext<AppContextValue | null>(null);

export function AppStateProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const userId = user?.uid ?? "";

  const refreshMonthEntries = useCallback(async () => {
    if (!userId) {
      dispatch({ type: "setEntries", payload: [] });
      return;
    }

    const rows = await withTimeout(
      fetchMonthlyEntries(userId, state.selectedMonthKey),
    );
    dispatch({ type: "setEntries", payload: rows });
  }, [userId, state.selectedMonthKey]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      if (!userId) {
        const bootSettings: UserSettings = {
          userId: "",
          timezone: "Asia/Tokyo",
          locale: "ja-JP",
          currency: "JPY",
          categories: DEFAULT_CATEGORIES,
          paymentSources: DEFAULT_PAYMENT_SOURCES,
          updatedAt: Date.now(),
        };

        dispatch({
          type: "bootstrap",
          payload: { userId: "", settings: bootSettings },
        });
        dispatch({ type: "setEntries", payload: [] });
        setErrorMessage(
          "未ログインまたはFirestore未設定のため保存できません。Firebase Consoleで認証（Google/匿名）とFirestore Databaseを有効化してください。",
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);
      try {
        const settings = await withTimeout(ensureUserSettings(userId));
        const rows = await withTimeout(
          fetchMonthlyEntries(userId, state.selectedMonthKey),
        );
        const createdOpeningEntries = await withTimeout(
          ensureOpeningBalanceEntries(userId, state.selectedMonthKey, rows),
        );
        const rowsWithOpening = createdOpeningEntries
          ? await withTimeout(
              fetchMonthlyEntries(userId, state.selectedMonthKey),
            )
          : rows;

        if (!active) {
          return;
        }

        dispatch({ type: "bootstrap", payload: { userId, settings } });
        dispatch({ type: "setEntries", payload: rowsWithOpening });
      } catch (error) {
        if (active) {
          const fallbackSettings: UserSettings = {
            userId,
            timezone: "Asia/Tokyo",
            locale: "ja-JP",
            currency: "JPY",
            categories: DEFAULT_CATEGORIES,
            paymentSources: DEFAULT_PAYMENT_SOURCES,
            updatedAt: Date.now(),
          };

          dispatch({
            type: "bootstrap",
            payload: { userId, settings: fallbackSettings },
          });
          dispatch({ type: "setEntries", payload: [] });

          setErrorMessage(
            error instanceof Error ? error.message : "初期化に失敗しました。",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [userId, state.selectedMonthKey]);

  const setSelectedMonthKey = useCallback((monthKey: string) => {
    dispatch({ type: "setMonth", payload: monthKey });
  }, []);

  const addEntry = useCallback(
    async (entry: JournalEntry) => {
      if (!userId) {
        setErrorMessage(
          "認証されていないため保存できません。Googleまたはゲストでログインしてください。",
        );
        return;
      }

      setSyncing(true);
      setErrorMessage(null);
      try {
        await withTimeout(upsertJournalEntry(userId, entry));
        await refreshMonthEntries();
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? `Firestoreへの保存に失敗しました: ${error.message}`
            : "Firestoreへの保存に失敗しました。",
        );
      } finally {
        setSyncing(false);
      }
    },
    [refreshMonthEntries, userId],
  );

  const deleteEntry = useCallback(
    async (entry: JournalEntry) => {
      if (!userId) {
        setErrorMessage(
          "認証されていないため削除できません。Googleまたはゲストでログインしてください。",
        );
        return;
      }

      setSyncing(true);
      setErrorMessage(null);
      try {
        await withTimeout(deleteJournalEntry(userId, entry.monthKey, entry.id));
        await refreshMonthEntries();
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? `Firestoreでの削除に失敗しました: ${error.message}`
            : "Firestoreでの削除に失敗しました。",
        );
      } finally {
        setSyncing(false);
      }
    },
    [refreshMonthEntries, userId],
  );

  const updateEntry = useCallback(
    async (previousEntry: JournalEntry, nextEntry: JournalEntry) => {
      if (!userId) {
        setErrorMessage(
          "認証されていないため更新できません。Googleまたはゲストでログインしてください。",
        );
        return;
      }

      setSyncing(true);
      setErrorMessage(null);
      try {
        await withTimeout(
          updateJournalEntryRepository(userId, previousEntry, nextEntry),
        );
        await refreshMonthEntries();
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? `Firestoreでの更新に失敗しました: ${error.message}`
            : "Firestoreでの更新に失敗しました。",
        );
      } finally {
        setSyncing(false);
      }
    },
    [refreshMonthEntries, userId],
  );

  const saveSettings = useCallback(
    async (settings: UserSettings) => {
      if (!userId) {
        setErrorMessage(
          "認証されていないため設定保存できません。Googleまたはゲストでログインしてください。",
        );
        return;
      }

      setSyncing(true);
      setErrorMessage(null);
      try {
        await withTimeout(saveUserSettingsRepository(userId, settings));
        dispatch({ type: "setSettings", payload: settings });
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? `Firestoreへの設定保存に失敗しました: ${error.message}`
            : "Firestoreへの設定保存に失敗しました。",
        );
      } finally {
        setSyncing(false);
      }
    },
    [userId],
  );

  const monthEntries = useMemo(
    () =>
      state.entries.filter(
        (entry) => entry.monthKey === state.selectedMonthKey,
      ),
    [state.entries, state.selectedMonthKey],
  );

  const value = useMemo(
    () => ({
      state,
      monthEntries,
      loading,
      syncing,
      errorMessage,
      setSelectedMonthKey,
      addEntry,
      updateEntry,
      deleteEntry,
      saveSettings,
      refreshMonthEntries,
    }),
    [
      state,
      monthEntries,
      loading,
      syncing,
      errorMessage,
      setSelectedMonthKey,
      addEntry,
      updateEntry,
      deleteEntry,
      saveSettings,
      refreshMonthEntries,
    ],
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppContextValue {
  const context = useContext(AppStateContext);

  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider");
  }

  return context;
}
