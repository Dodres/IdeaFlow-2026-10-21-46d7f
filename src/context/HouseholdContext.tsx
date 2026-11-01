import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Household,
  ShoppingItem,
  Recipe,
  ColorTheme,
  DisplayMode,
  DayKey,
  MealType,
  MealSlot,
  Dish,
  MealSlotType,
  Assignee,
  SavedHouseholdInfo,
  HouseDefinition,
  Person,
  MealGroup,
  AppUser,
} from '../types.ts';
import { createInitialHousehold, createEmptyHousehold, getCurrentWeekId, normalizeMealSlot } from '../data/initialData.ts';
import { auth, db, signInWithGoogle, logOut, onAuthStateChanged } from '../firebase.ts';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
} from 'firebase/firestore';

interface HouseholdContextValue {
  household: Household;
  householdCode: string;
  members: Person[];
  savedHouseholds: SavedHouseholdInfo[];
  isLoading: boolean;
  isSyncing: boolean;
  isConnected: boolean;
  currentRole: string; // memberId
  colorTheme: ColorTheme;
  displayMode: DisplayMode;
  activeWeekId: string;
  user: AppUser | null;
  isAuthLoading: boolean;
  isShareModalOpen: boolean;
  setIsShareModalOpen: (open: boolean) => void;
  loginWithGoogle: () => Promise<void>;
  loginDevMock: (name?: string) => Promise<void>;
  logout: () => Promise<void>;
  setActiveWeekId: (weekId: string) => void;
  setCurrentRole: (role: string) => void;
  setColorTheme: (theme: ColorTheme) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  setHouseholdCode: (code: string) => void;
  joinHousehold: (code: string) => Promise<boolean>;
  switchHousehold: (code: string) => Promise<boolean>;
  removeSavedHousehold: (code: string) => void;
  createNewHousehold: (name: string, customCode?: string) => Promise<string>;
  updateHousehold: (updater: (prev: Household) => Household) => Promise<void>;
  addMember: (name: string, avatar?: string) => Promise<void>;
  updateMember: (id: string, name: string, avatar?: string) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  addHouseLocation: (name: string, icon?: string) => Promise<void>;
  removeHouseLocation: (id: string) => Promise<void>;
  setMealLocation: (weekId: string, dayKey: DayKey, mealType: MealType, location: string) => Promise<void>;
  updateMealSlotGroups: (weekId: string, dayKey: DayKey, mealType: MealType, groups: MealGroup[], slotType?: MealSlotType) => Promise<void>;
  setMealSlotMode: (weekId: string, dayKey: DayKey, mealType: MealType, mode: 'together' | 'separate' | 'custom_groups', customGroups?: MealGroup[]) => Promise<void>;
  addDishToGroup: (weekId: string, dayKey: DayKey, mealType: MealType, groupId: string, dish: Dish, autoAddShopping?: boolean) => Promise<void>;
  removeDishFromGroup: (weekId: string, dayKey: DayKey, mealType: MealType, groupId: string, dishId: string) => Promise<void>;
  toggleShoppingItem: (itemId: string, isDone?: boolean) => Promise<void>;
  addShoppingItem: (item: {
    name: string;
    category?: any;
    assignee?: Assignee;
    dishName?: string;
    dayKey?: DayKey;
    targetHouse?: string;
  }) => Promise<void>;
  addMultipleShoppingItems: (
    items: Array<{
      name: string;
      category?: any;
      assignee?: Assignee;
      dishName?: string;
      dayKey?: DayKey;
      targetHouse?: string;
    }>
  ) => Promise<void>;
  deleteShoppingItem: (itemId: string) => Promise<void>;
  clearCompletedShopping: () => Promise<void>;
  updateMealSlot: (weekId: string, dayKey: DayKey, mealType: MealType, slot: MealSlot) => Promise<void>;
  addDishToSlot: (
    weekId: string,
    dayKey: DayKey,
    mealType: MealType,
    target: 'together' | string,
    dish: Dish,
    autoAddIngredientsToShopping?: boolean
  ) => Promise<void>;
  removeDishFromSlot: (
    weekId: string,
    dayKey: DayKey,
    mealType: MealType,
    target: 'together' | string,
    dishId: string
  ) => Promise<void>;
  toggleMealSlotType: (weekId: string, dayKey: DayKey, mealType: MealType) => Promise<void>;
  saveRecipe: (recipe: Recipe) => Promise<void>;
  recordRecipePrepared: (recipeId: string, dateStr?: string) => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

const CODE_STORAGE_KEY = 'menu_spesa_household_code';
const SAVED_HOUSES_KEY = 'menu_spesa_saved_households_list';
const ROLE_STORAGE_KEY = 'menu_spesa_user_role';
const THEME_STORAGE_KEY = 'menu_spesa_color_theme';
const MODE_STORAGE_KEY = 'menu_spesa_display_mode';

function cleanForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanForFirestore);
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = cleanForFirestore(value);
    }
  }
  return result;
}

export const HouseholdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [householdCode, setHouseholdCodeState] = useState<string>(() => {
    return localStorage.getItem(CODE_STORAGE_KEY) || '';
  });

  const [savedHouseholds, setSavedHouseholds] = useState<SavedHouseholdInfo[]>(() => {
    try {
      const stored = localStorage.getItem(SAVED_HOUSES_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  const [currentRole, setCurrentRoleState] = useState<string>(() => {
    return localStorage.getItem(ROLE_STORAGE_KEY) || 'guest';
  });

  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    return (localStorage.getItem(THEME_STORAGE_KEY) as ColorTheme) || 'salvia';
  });

  const [displayMode, setDisplayModeState] = useState<DisplayMode>(() => {
    return (localStorage.getItem(MODE_STORAGE_KEY) as DisplayMode) || 'auto';
  });

  const [activeWeekId, setActiveWeekId] = useState<string>(getCurrentWeekId());
  const [household, setHousehold] = useState<Household>(() => createEmptyHousehold(householdCode || 'TEMP', 'La Mia Casa'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const s = sessionStorage.getItem('app_user_session') || localStorage.getItem('app_user_session');
      if (s) return JSON.parse(s);
    } catch {}
    return null;
  });
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // Dynamic members list (with fallback to logged user or generic 'Io')
  const members = useMemo<Person[]>(() => {
    if (household.members && household.members.length > 0) {
      return household.members;
    }
    if (user) {
      return [{ id: user.uid, name: user.displayName || 'Io', avatar: '👑' }];
    }
    return [{ id: 'me', name: 'Io', avatar: '👤' }];
  }, [household.members, user]);

  // Apply theme to HTML tag
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', colorTheme);

    const isDark =
      displayMode === 'dark' ||
      (displayMode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [colorTheme, displayMode]);

  // Handle system dark mode changes if mode === 'auto'
  useEffect(() => {
    if (displayMode !== 'auto') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [displayMode]);

  // Listen to Firebase Auth state & Onboarding / Auto-provision personal house
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setIsAuthLoading(false);
      if (fbUser) {
        const appUser: AppUser = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Utente',
          photoURL: fbUser.photoURL,
        };
        setUser(appUser);
        try {
          sessionStorage.setItem('app_user_session', JSON.stringify(appUser));
        } catch {}

        // Check if there's a pending invite code from URL or sessionStorage
        const params = new URLSearchParams(window.location.search);
        const inviteCode = params.get('code') || params.get('join') || sessionStorage.getItem('pending_invite_code');

        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userSnap = await getDoc(userDocRef);
          let userHouses: string[] = [];

          if (userSnap.exists()) {
            userHouses = userSnap.data()?.households || [];
          }

          if (inviteCode) {
            sessionStorage.removeItem('pending_invite_code');
            await joinHousehold(inviteCode);
          } else if (userHouses.length > 0) {
            // User already has households, load the active or first one
            const targetCode = (householdCode && userHouses.includes(householdCode)) ? householdCode : userHouses[0];
            await switchHousehold(targetCode);
            for (const c of userHouses) {
              registerSavedHousehold(c, c);
            }
          } else {
            // First time user! Automatically provision their personal household
            const firstName = (appUser.displayName || 'Famiglia').split(' ')[0];
            const houseName = `Casa di ${firstName}`;
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let newCode = 'CASA-';
            for (let i = 0; i < 4; i++) {
              newCode += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            const personalHh = createEmptyHousehold(
              newCode,
              houseName,
              appUser.displayName || 'Io',
              '👑',
              fbUser.uid
            );

            await setDoc(doc(db, 'households', newCode), cleanForFirestore(personalHh));
            await setDoc(userDocRef, {
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: appUser.displayName,
              photoURL: fbUser.photoURL,
              households: [newCode],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }, { merge: true });

            setHousehold(personalHh);
            setHouseholdCode(newCode);
            registerSavedHousehold(newCode, houseName);
          }
        } catch (err) {
          console.warn('Firebase user sync / onboarding note:', err);
        }
      } else {
        setUser(null);
        try {
          sessionStorage.removeItem('app_user_session');
          localStorage.removeItem('app_user_session');
        } catch {}
      }
    });

    return () => unsub();
  }, [householdCode]);

  const loginWithGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Google Sign-In error:', err);
      throw err;
    }
  };

  const loginDevMock = async (customName?: string) => {
    const mockUid = `user_${Date.now().toString(36)}`;
    const name = customName?.trim() || `Utente ${Math.floor(100 + Math.random() * 900)}`;
    const mockUser: AppUser = {
      uid: mockUid,
      email: `${mockUid}@example.local`,
      displayName: name,
      photoURL: undefined,
    };
    setUser(mockUser);
    try {
      sessionStorage.setItem('app_user_session', JSON.stringify(mockUser));
    } catch {}

    // Check pending invite code
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('code') || params.get('join') || sessionStorage.getItem('pending_invite_code');

    if (inviteCode) {
      sessionStorage.removeItem('pending_invite_code');
      await joinHousehold(inviteCode);
    } else {
      // Provision personal household
      const firstName = name.split(' ')[0];
      const houseName = `Casa di ${firstName}`;
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let newCode = 'CASA-';
      for (let i = 0; i < 4; i++) {
        newCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const personalHh = createEmptyHousehold(newCode, houseName, name, '👑', mockUid);
      try {
        await setDoc(doc(db, 'households', newCode), cleanForFirestore(personalHh));
      } catch {}
      setHousehold(personalHh);
      setHouseholdCode(newCode);
      registerSavedHousehold(newCode, houseName);
    }
  };

  const logout = async () => {
    try {
      await logOut();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const setCurrentRole = (role: string) => {
    setCurrentRoleState(role);
    localStorage.setItem(ROLE_STORAGE_KEY, role);
  };

  const setColorTheme = (theme: ColorTheme) => {
    setColorThemeState(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  };

  const setDisplayMode = (mode: DisplayMode) => {
    setDisplayModeState(mode);
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  };

  const setHouseholdCode = (code: string) => {
    const upper = code.trim().toUpperCase();
    setHouseholdCodeState(upper);
    localStorage.setItem(CODE_STORAGE_KEY, upper);
  };

  const registerSavedHousehold = (code: string, name: string) => {
    setSavedHouseholds((prev) => {
      const filtered = prev.filter((h) => h.code !== code);
      const updated = [{ code, name }, ...filtered];
      localStorage.setItem(SAVED_HOUSES_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const removeSavedHousehold = (code: string) => {
    setSavedHouseholds((prev) => {
      const updated = prev.filter((h) => h.code !== code);
      localStorage.setItem(SAVED_HOUSES_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Fetch initial household data from Firestore / API
  const fetchHousehold = useCallback(async (code: string) => {
    try {
      setIsLoading(true);
      let loadedData: Household | null = null;

      // Try Firestore first
      try {
        const snap = await getDoc(doc(db, 'households', code));
        if (snap.exists()) {
          loadedData = snap.data() as Household;
        }
      } catch (e) {
        console.warn('Firestore fetch note:', e);
      }

      // Fallback to local server API
      if (!loadedData) {
        const res = await fetch(`/api/households/${code}`);
        if (res.ok) {
          loadedData = await res.json();
        }
      }

      if (loadedData) {
        if (!loadedData.houses || loadedData.houses.length === 0) {
          loadedData.houses = [
            { id: 'casa_1', name: 'Casa', icon: '🏠' },
          ];
        }
        if (!loadedData.members || loadedData.members.length === 0) {
          loadedData.members = [{ id: user?.uid || 'me', name: user?.displayName || 'Io', avatar: '👑' }];
        }
        setHousehold(loadedData);
        registerSavedHousehold(loadedData.code, loadedData.name || loadedData.code);
      }
    } catch (err) {
      console.error('Fetch household error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHousehold(householdCode);
  }, [householdCode, fetchHousehold]);

  // Real-time Firestore sync & SSE fallback
  useEffect(() => {
    // 1. Real-time listener via Firestore
    let unsubFirestore: (() => void) | null = null;
    try {
      unsubFirestore = onSnapshot(doc(db, 'households', householdCode), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Household;
          setHousehold((prev) => ({
            ...prev,
            ...data,
          }));
          registerSavedHousehold(data.code, data.name || data.code);
          setIsConnected(true);
        }
      }, () => {
        // Fallback silently if offline or rules apply
      });
    } catch {}

    // 2. Real-time SSE connection with server
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource(`/api/households/${householdCode}/events`);
        eventSource.onopen = () => setIsConnected(true);

        eventSource.addEventListener('update', (e: MessageEvent) => {
          try {
            const payload = JSON.parse(e.data);
            if (payload && payload.household) {
              setHousehold(payload.household);
              registerSavedHousehold(payload.household.code, payload.household.name);
            }
          } catch {}
        });

        eventSource.onerror = () => {
          eventSource?.close();
          reconnectTimeout = setTimeout(connectSSE, 4000);
        };
      } catch {}
    };

    connectSSE();

    return () => {
      if (unsubFirestore) unsubFirestore();
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [householdCode]);

  const saveHouseholdState = async (updated: Household) => {
    setHousehold(updated);
    setIsSyncing(true);

    // Save to Firestore
    try {
      const clean = cleanForFirestore(updated);
      await setDoc(doc(db, 'households', householdCode), clean, { merge: true });
    } catch (err) {
      console.warn('Firestore sync note:', err);
    }

    // Save to server
    try {
      await fetch(`/api/households/${householdCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      registerSavedHousehold(updated.code, updated.name);
    } catch (err) {
      console.error('Failed to sync household:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateHousehold = async (updater: (prev: Household) => Household) => {
    const next = updater(household);
    await saveHouseholdState(next);
  };

  // Switch between saved households in 1 click
  const switchHousehold = async (code: string): Promise<boolean> => {
    const upper = code.trim().toUpperCase();
    try {
      setIsLoading(true);
      let data: Household | null = null;

      try {
        const snap = await getDoc(doc(db, 'households', upper));
        if (snap.exists()) {
          data = snap.data() as Household;
        }
      } catch {}

      if (!data) {
        const res = await fetch(`/api/households/${upper}`);
        if (res.ok) {
          data = await res.json();
        }
      }

      if (data) {
        setHousehold(data);
        setHouseholdCode(upper);
        registerSavedHousehold(data.code, data.name);
        return true;
      }
      return false;
    } catch (err) {
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const joinHousehold = async (code: string): Promise<boolean> => {
    const upper = code.trim().toUpperCase();
    try {
      setIsLoading(true);
      let loadedData: Household | null = null;

      try {
        const snap = await getDoc(doc(db, 'households', upper));
        if (snap.exists()) {
          loadedData = snap.data() as Household;
        }
      } catch {}

      if (!loadedData) {
        const res = await fetch(`/api/households/${upper}`);
        if (res.ok) {
          loadedData = await res.json();
        }
      }

      if (loadedData) {
        // If user is authenticated, attach to memberUids and user's profile
        if (user) {
          const uids = loadedData.memberUids || [];
          if (!uids.includes(user.uid)) {
            loadedData.memberUids = [...uids, user.uid];
            // If user's name is not in members array, add them
            const hasMember = (loadedData.members || []).some(
              (m) => m.id === user.uid || m.name.toLowerCase() === (user.displayName || '').toLowerCase()
            );
            if (!hasMember) {
              loadedData.members = [
                ...(loadedData.members || []),
                {
                  id: user.uid,
                  name: user.displayName || 'Nuovo Membro',
                  avatar: '👋',
                },
              ];
            }
            // Save in Firestore
            try {
              await setDoc(doc(db, 'households', upper), cleanForFirestore(loadedData), { merge: true });
            } catch {}
          }

          // Link to user document
          try {
            await updateDoc(doc(db, 'users', user.uid), {
              households: arrayUnion(upper),
            });
          } catch {}
        }

        setHousehold(loadedData);
        setHouseholdCode(upper);
        registerSavedHousehold(loadedData.code, loadedData.name || loadedData.code);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const createNewHousehold = async (
    name: string,
    customCode?: string
  ): Promise<string> => {
    try {
      setIsLoading(true);
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let autoCode = 'CASA-';
      for (let i = 0; i < 4; i++) {
        autoCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const code = (customCode ? String(customCode).trim().toUpperCase() : autoCode).slice(0, 10);
      const newHh = createEmptyHousehold(
        code,
        name,
        user?.displayName || 'Io',
        '👑',
        user?.uid
      );

      // Save to Firestore
      try {
        await setDoc(doc(db, 'households', code), cleanForFirestore(newHh));
      } catch (e) {
        console.warn('Firestore create note:', e);
      }

      // Save to server
      try {
        await fetch('/api/households', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, customCode: code }),
        });
      } catch {}

      // Add to user profile if logged in
      if (user) {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            households: arrayUnion(code),
          });
        } catch {}
      }

      setHousehold(newHh);
      setHouseholdCode(code);
      registerSavedHousehold(code, name);
      setIsShareModalOpen(true);
      return code;
    } finally {
      setIsLoading(false);
    }
  };

  // Manage dynamic members (1, 2, 3+ people)
  const addMember = async (name: string, avatar = '👤') => {
    const newPerson: Person = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: name.trim(),
      avatar,
    };
    await updateHousehold((prev) => ({
      ...prev,
      members: [...(prev.members || []), newPerson],
    }));
  };

  const updateMember = async (id: string, name: string, avatar?: string) => {
    await updateHousehold((prev) => ({
      ...prev,
      members: (prev.members || []).map((m) =>
        m.id === id ? { ...m, name: name.trim(), avatar: avatar || m.avatar } : m
      ),
    }));
  };

  const removeMember = async (id: string) => {
    await updateHousehold((prev) => ({
      ...prev,
      members: (prev.members || []).filter((m) => m.id !== id),
    }));
  };

  const addHouseLocation = async (name: string, icon = '🏠') => {
    const newHouse: HouseDefinition = {
      id: `house_${Date.now()}`,
      name: name.trim(),
      icon,
    };
    await updateHousehold((prev) => ({
      ...prev,
      houses: [...(prev.houses || []), newHouse],
    }));
  };

  const removeHouseLocation = async (id: string) => {
    await updateHousehold((prev) => ({
      ...prev,
      houses: (prev.houses || []).filter((h) => h.id !== id),
    }));
  };

  const setMealLocation = async (
    weekId: string,
    dayKey: DayKey,
    mealType: MealType,
    location: string
  ) => {
    await updateHousehold((prev) => {
      const weekMenu = prev.menus[weekId];
      if (!weekMenu || !weekMenu.days[dayKey]) return prev;
      const currentDay = weekMenu.days[dayKey];
      const slot = currentDay[mealType];

      return {
        ...prev,
        menus: {
          ...prev.menus,
          [weekId]: {
            ...weekMenu,
            days: {
              ...weekMenu.days,
              [dayKey]: {
                ...currentDay,
                [mealType]: {
                  ...slot,
                  location,
                },
              },
            },
          },
        },
      };
    });
  };

  // MealSlot Dynamic Groups methods (supporting 1, 2, or 3+ people groupings)
  const updateMealSlotGroups = async (
    weekId: string,
    dayKey: DayKey,
    mealType: MealType,
    groups: MealGroup[],
    slotType?: MealSlotType
  ) => {
    await updateHousehold((prev) => {
      const currentWeekMenu = prev.menus[weekId] || {
        weekId,
        days: {} as any,
      };

      const currentDay = currentWeekMenu.days[dayKey] || {
        dayKey,
        dayLabel: dayKey,
        pranzo: { groups: [] },
        cena: { groups: [] },
      };

      const currentSlot = currentDay[mealType] || { groups: [] };

      const updatedSlot: MealSlot = {
        ...currentSlot,
        type: slotType || currentSlot.type,
        groups,
      };

      return {
        ...prev,
        menus: {
          ...prev.menus,
          [weekId]: {
            ...currentWeekMenu,
            days: {
              ...currentWeekMenu.days,
              [dayKey]: {
                ...currentDay,
                [mealType]: updatedSlot,
              },
            },
          },
        },
      };
    });
  };

  const setMealSlotMode = async (
    weekId: string,
    dayKey: DayKey,
    mealType: MealType,
    mode: 'together' | 'separate' | 'custom_groups',
    customGroups?: MealGroup[]
  ) => {
    const currentMembers = members;
    const allIds = currentMembers.map((m) => m.id);

    // Retrieve existing dishes to preserve them
    const existingSlot = household.menus[weekId]?.days[dayKey]?.[mealType];
    const existingGroups = normalizeMealSlot(existingSlot, currentMembers);
    const existingDishes = existingGroups.flatMap((g) => g.dishes);

    let newGroups: MealGroup[] = [];

    if (mode === 'together') {
      newGroups = [
        {
          id: `grp_all_${Date.now()}`,
          memberIds: [...allIds],
          dishes: existingDishes,
        },
      ];
    } else if (mode === 'separate') {
      newGroups = currentMembers.map((m) => {
        // find dishes for this member in previous groups
        const userDishes = existingGroups
          .filter((g) => g.memberIds.includes(m.id))
          .flatMap((g) => g.dishes);
        return {
          id: `grp_${m.id}_${Date.now()}`,
          memberIds: [m.id],
          dishes: userDishes,
        };
      });
    } else if (customGroups && customGroups.length > 0) {
      newGroups = customGroups;
    }

    await updateMealSlotGroups(weekId, dayKey, mealType, newGroups, mode);
  };

  const addDishToGroup = async (
    weekId: string,
    dayKey: DayKey,
    mealType: MealType,
    groupId: string,
    dish: Dish,
    autoAddShopping = true
  ) => {
    const currentMembers = members;
    const existingSlot = household.menus[weekId]?.days[dayKey]?.[mealType];
    let groups = normalizeMealSlot(existingSlot, currentMembers);

    let targetGroup = groups.find((g) => g.id === groupId);
    if (!targetGroup && groups.length > 0) {
      targetGroup = groups[0];
    }

    if (!targetGroup) {
      // create group if empty
      targetGroup = {
        id: groupId || `grp_${Date.now()}`,
        memberIds: currentMembers.map((m) => m.id),
        dishes: [],
      };
      groups = [targetGroup];
    }

    const updatedGroups = groups.map((g) => {
      if (g.id === targetGroup!.id) {
        return {
          ...g,
          dishes: [...g.dishes, dish],
        };
      }
      return g;
    });

    await updateMealSlotGroups(weekId, dayKey, mealType, updatedGroups);

    // Auto-add ingredients to shopping list
    if (autoAddShopping && dish.ingredients && dish.ingredients.length > 0) {
      // If group has all members, assignee is 'together', else first member id or group
      const assignee = targetGroup.memberIds.length === currentMembers.length ? 'together' : targetGroup.memberIds[0];
      const itemsToAdd = dish.ingredients.map((ing) => ({
        name: ing,
        assignee,
        dishName: dish.name,
        dayKey,
      }));
      await addMultipleShoppingItems(itemsToAdd);
    }
  };

  const removeDishFromGroup = async (
    weekId: string,
    dayKey: DayKey,
    mealType: MealType,
    groupId: string,
    dishId: string
  ) => {
    const currentMembers = members;
    const existingSlot = household.menus[weekId]?.days[dayKey]?.[mealType];
    const groups = normalizeMealSlot(existingSlot, currentMembers);

    const updatedGroups = groups.map((g) => {
      if (g.id === groupId) {
        return {
          ...g,
          dishes: g.dishes.filter((d) => d.id !== dishId),
        };
      }
      return g;
    });

    await updateMealSlotGroups(weekId, dayKey, mealType, updatedGroups);
  };

  // Legacy wrappers for backward compatibility
  const addDishToSlot = async (
    weekId: string,
    dayKey: DayKey,
    mealType: MealType,
    target: 'together' | string,
    dish: Dish,
    autoAddIngredientsToShopping = true
  ) => {
    const currentMembers = members;
    const existingSlot = household.menus[weekId]?.days[dayKey]?.[mealType];
    const groups = normalizeMealSlot(existingSlot, currentMembers);

    let targetGroup: MealGroup | undefined;
    if (target === 'together') {
      targetGroup = groups.find((g) => g.memberIds.length > 1) || groups[0];
    } else {
      targetGroup = groups.find((g) => g.memberIds.includes(target)) || groups[0];
    }

    const groupId = targetGroup ? targetGroup.id : `grp_${Date.now()}`;
    await addDishToGroup(weekId, dayKey, mealType, groupId, dish, autoAddIngredientsToShopping);
  };

  const removeDishFromSlot = async (
    weekId: string,
    dayKey: DayKey,
    mealType: MealType,
    target: 'together' | string,
    dishId: string
  ) => {
    const currentMembers = members;
    const existingSlot = household.menus[weekId]?.days[dayKey]?.[mealType];
    const groups = normalizeMealSlot(existingSlot, currentMembers);
    const targetGroup = groups.find((g) => g.dishes.some((d) => d.id === dishId));
    if (targetGroup) {
      await removeDishFromGroup(weekId, dayKey, mealType, targetGroup.id, dishId);
    }
  };

  const toggleMealSlotType = async (weekId: string, dayKey: DayKey, mealType: MealType) => {
    const currentMembers = members;
    const existingSlot = household.menus[weekId]?.days[dayKey]?.[mealType];
    const groups = normalizeMealSlot(existingSlot, currentMembers);
    const isCurrentlyTogether = groups.length === 1 && groups[0].memberIds.length === currentMembers.length;

    await setMealSlotMode(weekId, dayKey, mealType, isCurrentlyTogether ? 'separate' : 'together');
  };

  const updateMealSlot = async (weekId: string, dayKey: DayKey, mealType: MealType, slot: MealSlot) => {
    await updateHousehold((prev) => {
      const currentWeekMenu = prev.menus[weekId] || { weekId, days: {} as any };
      const currentDay = currentWeekMenu.days[dayKey] || { dayKey, dayLabel: dayKey, pranzo: { groups: [] }, cena: { groups: [] } };
      return {
        ...prev,
        menus: {
          ...prev.menus,
          [weekId]: {
            ...currentWeekMenu,
            days: {
              ...currentWeekMenu.days,
              [dayKey]: {
                ...currentDay,
                [mealType]: slot,
              },
            },
          },
        },
      };
    });
  };

  // Shopping List methods
  const toggleShoppingItem = async (itemId: string, isDone?: boolean) => {
    const currentItem = household.shoppingList.find((i) => i.id === itemId);
    const newDoneState = typeof isDone === 'boolean' ? isDone : !currentItem?.isDone;
    const currentMember = members.find((m) => m.id === currentRole);
    const actorName = user
      ? (user.displayName || currentMember?.name || 'Utente')
      : (currentRole && currentRole !== 'guest' && currentMember ? currentMember.name : 'Guest');

    setHousehold((prev) => ({
      ...prev,
      shoppingList: prev.shoppingList.map((it) =>
        it.id === itemId
          ? {
              ...it,
              isDone: newDoneState,
              checkedBy: newDoneState ? actorName : undefined,
              checkedAt: newDoneState ? new Date().toISOString() : undefined,
            }
          : it
      ),
    }));

    try {
      await fetch(`/api/households/${householdCode}/shopping/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, isDone: newDoneState, checkedBy: actorName }),
      });
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const addShoppingItem = async (item: {
    name: string;
    category?: any;
    assignee?: Assignee;
    dishName?: string;
    dayKey?: DayKey;
    targetHouse?: string;
  }) => {
    let resolvedCategory = item.category;
    if (!resolvedCategory) {
      try {
        const catRes = await fetch('/api/ai/categorize-product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productName: item.name }),
        });
        const catData = await catRes.json();
        resolvedCategory = catData.category || 'ortofrutta';
      } catch {
        resolvedCategory = 'ortofrutta';
      }
    }

    const newItem: ShoppingItem = {
      id: `sp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: item.name.trim(),
      category: resolvedCategory,
      assignee: item.assignee || 'together',
      dishName: item.dishName,
      dayKey: item.dayKey,
      targetHouse: item.targetHouse,
      isDone: false,
      createdAt: new Date().toISOString(),
    };

    setHousehold((prev) => ({
      ...prev,
      shoppingList: [newItem, ...prev.shoppingList],
    }));

    try {
      await fetch(`/api/households/${householdCode}/shopping/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [newItem] }),
      });
    } catch (err) {
      console.error('Add item error:', err);
    }
  };

  const addMultipleShoppingItems = async (
    items: Array<{
      name: string;
      category?: any;
      assignee?: Assignee;
      dishName?: string;
      dayKey?: DayKey;
      targetHouse?: string;
    }>
  ) => {
    const formatted: ShoppingItem[] = items.map((it) => ({
      id: `sp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: it.name.trim(),
      category: it.category || 'ortofrutta',
      assignee: it.assignee || 'together',
      dishName: it.dishName,
      dayKey: it.dayKey,
      targetHouse: it.targetHouse,
      isDone: false,
      createdAt: new Date().toISOString(),
    }));

    setHousehold((prev) => ({
      ...prev,
      shoppingList: [...formatted, ...prev.shoppingList],
    }));

    try {
      await fetch(`/api/households/${householdCode}/shopping/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: formatted }),
      });
    } catch (err) {
      console.error('Add multiple items error:', err);
    }
  };

  const deleteShoppingItem = async (itemId: string) => {
    setHousehold((prev) => ({
      ...prev,
      shoppingList: prev.shoppingList.filter((it) => it.id !== itemId),
    }));

    try {
      await fetch(`/api/households/${householdCode}/shopping/${itemId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Delete item error:', err);
    }
  };

  const clearCompletedShopping = async () => {
    setHousehold((prev) => ({
      ...prev,
      shoppingList: prev.shoppingList.filter((it) => !it.isDone),
    }));

    try {
      await fetch(`/api/households/${householdCode}/shopping/clear-completed`, {
        method: 'POST',
      });
    } catch (err) {
      console.error('Clear completed error:', err);
    }
  };

  // Recipe methods
  const saveRecipe = async (recipe: Recipe) => {
    try {
      const res = await fetch(`/api/households/${householdCode}/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipe),
      });
      if (res.ok) {
        const data = await res.json();
        setHousehold((prev) => ({ ...prev, recipes: data.recipes }));
      }
    } catch (err) {
      console.error('Save recipe error:', err);
    }
  };

  const recordRecipePrepared = async (recipeId: string, dateStr = new Date().toISOString().split('T')[0]) => {
    await updateHousehold((prev) => ({
      ...prev,
      recipes: prev.recipes.map((r) => (r.id === recipeId ? { ...r, lastPreparedDate: dateStr } : r)),
    }));
  };

  const value = useMemo(
    () => ({
      household,
      householdCode,
      members,
      savedHouseholds,
      isLoading,
      isSyncing,
      isConnected,
      currentRole,
      colorTheme,
      displayMode,
      activeWeekId,
      setActiveWeekId,
      setCurrentRole,
      setColorTheme,
      setDisplayMode,
      setHouseholdCode,
      joinHousehold,
      switchHousehold,
      removeSavedHousehold,
      createNewHousehold,
      updateHousehold,
      addMember,
      updateMember,
      removeMember,
      addHouseLocation,
      removeHouseLocation,
      setMealLocation,
      updateMealSlotGroups,
      setMealSlotMode,
      addDishToGroup,
      removeDishFromGroup,
      toggleShoppingItem,
      addShoppingItem,
      addMultipleShoppingItems,
      deleteShoppingItem,
      clearCompletedShopping,
      updateMealSlot,
      addDishToSlot,
      removeDishFromSlot,
      toggleMealSlotType,
      saveRecipe,
      recordRecipePrepared,
      user,
      isAuthLoading,
      isShareModalOpen,
      setIsShareModalOpen,
      loginWithGoogle,
      loginDevMock,
      logout,
    }),
    [
      household,
      householdCode,
      members,
      savedHouseholds,
      isLoading,
      isSyncing,
      isConnected,
      currentRole,
      colorTheme,
      displayMode,
      activeWeekId,
      user,
      isAuthLoading,
      isShareModalOpen,
    ]
  );

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
};

export const useHousehold = () => {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
};
