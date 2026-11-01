export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'all_year';

export type DepartmentCategory =
  | 'ortofrutta'
  | 'macelleria_pescheria'
  | 'latticini_freschi'
  | 'dispensa_secco'
  | 'surgelati'
  | 'cura_casa_altro';

export type Assignee = string; // 'together' | memberId | group

export type MealSlotType = 'together' | 'separate' | 'custom_groups';

export type MealType = 'pranzo' | 'cena';

export type DayKey = 'lun' | 'mar' | 'mer' | 'gio' | 'ven' | 'sab' | 'dom';

export interface Person {
  id: string;
  name: string;
  avatar: string;
}

export interface Dish {
  id: string;
  name: string;
  recipeId?: string;
  ingredients?: string[];
  notes?: string;
}

export interface MealGroup {
  id: string;
  memberIds: string[]; // List of member IDs in this eating group
  dishes: Dish[];
  notes?: string;
}

export interface MealSlot {
  type?: MealSlotType;
  // Dynamic groups (handles 1 person, 2 people, 3+ people in sub-groups)
  groups?: MealGroup[];
  // Legacy fields for backward compatibility
  togetherDishes?: Dish[];
  danieleDishes?: Dish[];
  partnerDishes?: Dish[];
  location?: 'casa_daniele' | 'casa_partner' | 'fuori' | string;
  notes?: string;
}

export interface DayMeals {
  dayKey: DayKey;
  dayLabel: string;
  pranzo: MealSlot;
  cena: MealSlot;
}

export interface WeekMenu {
  weekId: string; // e.g. '2026-W42'
  days: Record<DayKey, DayMeals>;
}

export interface ShoppingItem {
  id: string;
  name: string;
  category: DepartmentCategory;
  assignee: Assignee; // 'together' or member id
  dishName?: string;
  dayKey?: DayKey;
  targetHouse?: string;
  isDone: boolean;
  checkedBy?: string;
  checkedAt?: string;
  createdAt: string;
}

export interface Recipe {
  id: string;
  name: string;
  season: Season;
  category: 'Primo' | 'Secondo' | 'Piatto Unico' | 'Contorno' | 'Lievitato';
  prepTime: string;
  ingredients: string[];
  notes?: string;
  lastPreparedDate?: string; // YYYY-MM-DD
}

export type ColorTheme = 'salvia' | 'terracotta' | 'mirtillo' | 'avocado' | 'slate';
export type DisplayMode = 'light' | 'dark' | 'auto';

export interface UserPreferences {
  currentRole: string; // memberId
  colorTheme: ColorTheme;
  mode: DisplayMode;
}

export interface HouseholdUsers {
  daniele: { name: string; avatar: string };
  partner: { name: string; avatar: string };
}

export interface HouseDefinition {
  id: string;
  name: string;
  icon: string;
}

export interface SavedHouseholdInfo {
  code: string;
  name: string;
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface Household {
  code: string;
  name: string;
  ownerUid?: string;
  memberUids?: string[];
  members: Person[]; // Dynamic list of 1, 2, or multiple people
  users?: HouseholdUsers; // Legacy fallback
  houses?: HouseDefinition[];
  activeWeekId: string;
  menus: Record<string, WeekMenu>;
  shoppingList: ShoppingItem[];
  recipes: Recipe[];
  updatedAt: string;
}

export interface SeasonalAISuggestion {
  name: string;
  description: string;
  season: Season;
  prepTime: string;
  category: 'Primo' | 'Secondo' | 'Piatto Unico' | 'Contorno' | 'Lievitato';
  ingredients: string[];
  whySeasonal: string;
}
