import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Users,
  User,
  Sparkles,
  ShoppingBag,
  RotateCcw,
  CalendarDays,
  Calendar as CalendarIcon,
  SlidersHorizontal,
  Filter,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext.tsx';
import { DayKey, MealType, MealSlot, Dish, Recipe, MealGroup, Person } from '../../types.ts';
import {
  getCurrentWeekId,
  getWeekRangeDisplay,
  getWeekDayDetails,
  normalizeMealSlot,
  MONTH_SHORT_IT,
} from '../../data/initialData.ts';
import { AddDishModal, GroupOption } from './AddDishModal.tsx';
import { CalendarPickerModal } from './CalendarPickerModal.tsx';
import { MealGroupingModal } from './MealGroupingModal.tsx';

interface WeeklyMenuViewProps {
  onOpenAISuggest: () => void;
}

const ALL_DAY_KEYS: DayKey[] = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];

const DAY_NAMES: Record<DayKey, string> = {
  lun: 'Lunedì',
  mar: 'Martedì',
  mer: 'Mercoledì',
  gio: 'Giovedì',
  ven: 'Venerdì',
  sab: 'Sabato',
  dom: 'Domenica',
};

const DAY_SHORT: Record<DayKey, string> = {
  lun: 'Lun',
  mar: 'Mar',
  mer: 'Mer',
  gio: 'Gio',
  ven: 'Ven',
  sab: 'Sab',
  dom: 'Dom',
};

// Preset di sequenze giorni
const PRESET_INTERVALS: { id: string; label: string; days: DayKey[] }[] = [
  { id: 'sab_ven', label: 'Sabato ➔ Venerdì (7 gg)', days: ['sab', 'dom', 'lun', 'mar', 'mer', 'gio', 'ven'] },
  { id: 'lun_dom', label: 'Lunedì ➔ Domenica (7 gg)', days: ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'] },
  { id: 'sab_mar', label: 'Sabato ➔ Martedì (4 gg)', days: ['sab', 'dom', 'lun', 'mar'] },
  { id: 'lun_ven', label: 'Lunedì ➔ Venerdì (5 gg)', days: ['lun', 'mar', 'mer', 'gio', 'ven'] },
  { id: 'weekend', label: 'Weekend (Ven-Dom)', days: ['ven', 'sab', 'dom'] },
];

const STORAGE_INTERVAL_KEY = 'menu_interval_days_preset';

export const WeeklyMenuView: React.FC<WeeklyMenuViewProps> = ({ onOpenAISuggest }) => {
  const {
    household,
    members,
    activeWeekId,
    setActiveWeekId,
    setMealSlotMode,
    updateMealSlotGroups,
    addDishToGroup,
    removeDishFromGroup,
    currentRole,
  } = useHousehold();

  const currentRealWeek = getCurrentWeekId();
  const weekRange = getWeekRangeDisplay(activeWeekId);
  const dayDetails = getWeekDayDetails(activeWeekId);

  // Selected visible days and order (default: Sabato -> Venerdì)
  const [selectedDays, setSelectedDays] = useState<DayKey[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_INTERVAL_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return ['sab', 'dom', 'lun', 'mar', 'mer', 'gio', 'ven']; // Default sabato -> venerdì
  });

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const handleSelectPreset = (days: DayKey[]) => {
    setSelectedDays(days);
    localStorage.setItem(STORAGE_INTERVAL_KEY, JSON.stringify(days));
  };

  const handleToggleDay = (day: DayKey) => {
    let next: DayKey[];
    if (selectedDays.includes(day)) {
      if (selectedDays.length <= 1) return; // mantieni almeno 1 giorno
      next = selectedDays.filter((d) => d !== day);
    } else {
      next = [...selectedDays, day];
    }
    setSelectedDays(next);
    localStorage.setItem(STORAGE_INTERVAL_KEY, JSON.stringify(next));
  };

  // Calendar picker modal state
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Grouping modal state (for 3+ people or custom sub-groups)
  const [groupingModalState, setGroupingModalState] = useState<{
    isOpen: boolean;
    dayKey: DayKey;
    dayLabel: string;
    mealType: MealType;
    groups: MealGroup[];
  } | null>(null);

  // Add dish modal state
  const [addModalState, setAddModalState] = useState<{
    isOpen: boolean;
    dayKey: DayKey;
    dayLabel: string;
    mealType: MealType;
    availableGroups: GroupOption[];
    defaultGroupId: string;
  } | null>(null);

  // Navigate weeks
  const changeWeek = (offset: number) => {
    const parts = activeWeekId.split('-W');
    const year = parseInt(parts[0], 10);
    let week = parseInt(parts[1], 10) + offset;
    let nextYear = year;
    if (week > 52) {
      week = 1;
      nextYear += 1;
    } else if (week < 1) {
      week = 52;
      nextYear -= 1;
    }
    setActiveWeekId(`${nextYear}-W${String(week).padStart(2, '0')}`);
  };

  const weekMenu = household.menus[activeWeekId] || {
    weekId: activeWeekId,
    days: {} as any,
  };

  const handleOpenAddModal = (
    dayKey: DayKey,
    mealType: MealType,
    groups: MealGroup[],
    defaultGroupId?: string
  ) => {
    const detail = dayDetails[dayKey];
    const fullDayLabel = detail
      ? `${DAY_NAMES[dayKey]} ${detail.formattedDate}`
      : DAY_NAMES[dayKey];

    const memberMap = new Map<string, Person>();
    members.forEach((m) => memberMap.set(m.id, m));

    const groupOptions: GroupOption[] = groups.map((g, idx) => {
      const gMembers = g.memberIds.map((id) => memberMap.get(id)).filter(Boolean) as Person[];
      if (gMembers.length === members.length && members.length > 1) {
        return { id: g.id, label: 'Tutti Insieme', icon: '👫' };
      }
      if (gMembers.length === 1) {
        return { id: g.id, label: gMembers[0].name, icon: gMembers[0].avatar };
      }
      return {
        id: g.id,
        label: gMembers.map((m) => m.name).join(' & '),
        icon: '👥',
      };
    });

    setAddModalState({
      isOpen: true,
      dayKey,
      dayLabel: fullDayLabel,
      mealType,
      availableGroups: groupOptions,
      defaultGroupId: defaultGroupId || groupOptions[0]?.id || 'grp_default',
    });
  };

  const handleAddDish = (
    dishName: string,
    groupId: string,
    recipe?: Recipe,
    addIngredients?: boolean
  ) => {
    if (!addModalState) return;
    const newDish: Dish = {
      id: `dish_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: dishName,
      recipeId: recipe?.id,
      ingredients: recipe?.ingredients || [],
    };

    addDishToGroup(
      activeWeekId,
      addModalState.dayKey,
      addModalState.mealType,
      groupId,
      newDish,
      addIngredients ?? true
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Week Selector Bar */}
      <div className="bg-app-card rounded-2xl border border-app-subtle p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeWeek(-1)}
            className="p-2 rounded-xl border border-app-subtle hover:bg-app-muted transition-colors cursor-pointer text-app-main active:scale-95"
            title="Settimana precedente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsCalendarOpen(true)}
            className="flex items-center gap-2.5 px-3.5 py-1.5 bg-app-muted hover:bg-app-primary-light/70 hover:border-app-primary-border border border-transparent rounded-xl transition-all cursor-pointer group text-left"
            title="Apri il calendario mensile"
          >
            <CalendarIcon className="w-4 h-4 text-app-primary group-hover:scale-110 transition-transform" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-app-main group-hover:text-app-primary transition-colors">
                  {weekRange.label}
                </span>
                {weekRange.isCurrent && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Oggi
                  </span>
                )}
              </div>
              <span className="text-[10px] text-app-muted block leading-none mt-0.5">
                Tocca per aprire il calendario
              </span>
            </div>
          </button>

          <button
            onClick={() => changeWeek(1)}
            className="p-2 rounded-xl border border-app-subtle hover:bg-app-muted transition-colors cursor-pointer text-app-main active:scale-95"
            title="Settimana successiva"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {!weekRange.isCurrent && (
            <button
              onClick={() => setActiveWeekId(currentRealWeek)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl text-app-primary hover:bg-app-primary-light transition-colors cursor-pointer"
            >
              Torna a oggi
            </button>
          )}
        </div>

        {/* Right Action buttons: Filter interval & AI */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              isFilterPanelOpen || selectedDays.length < 7
                ? 'bg-app-primary-light border-app-primary text-app-primary'
                : 'bg-app-card border-app-subtle hover:bg-app-muted text-app-main'
            }`}
            title="Scegli i giorni o l'intervallo da mostrare"
          >
            <Filter className="w-3.5 h-3.5 text-app-primary" />
            <span>
              {selectedDays.length === 7 ? '7 giorni' : `${selectedDays.length} giorni`}
            </span>
          </button>

          {/* Suggestion AI button */}
          <button
            onClick={onOpenAISuggest}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-app-primary text-white hover:opacity-90 transition-opacity active:scale-95 shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Consigliami piatti</span>
          </button>
        </div>
      </div>

      {/* Interval Days Selector Drawer / Panel */}
      {isFilterPanelOpen && (
        <div className="bg-app-card rounded-2xl border border-app-subtle p-3.5 sm:p-4 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-app-subtle pb-2.5">
            <div>
              <span className="font-bold text-xs text-app-main block">
                Intervallo & Giorni da mostrare ({selectedDays.length} selezionati)
              </span>
              <span className="text-[11px] text-app-muted">
                Pianifica la settimana da Sabato a Venerdì, solo pochi giorni o personalizza a piacere
              </span>
            </div>
            {/* Quick preset chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {PRESET_INTERVALS.map((preset) => {
                const isActive =
                  selectedDays.length === preset.days.length &&
                  selectedDays.every((d, i) => d === preset.days[i]);
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset.days)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-app-primary text-white border-app-primary shadow-2xs'
                        : 'bg-app-muted/60 text-app-muted hover:text-app-main border-app-subtle'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toggle specific days pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] text-app-muted font-medium mr-1">Attiva/disattiva giorni:</span>
            {ALL_DAY_KEYS.map((key) => {
              const isSelected = selectedDays.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => handleToggleDay(key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-app-primary-light border-app-primary text-app-primary font-bold shadow-2xs'
                      : 'bg-app-muted/30 border-app-subtle text-app-muted hover:text-app-main'
                  }`}
                >
                  {DAY_SHORT[key]} {isSelected && '✓'}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Week Schedule Grid */}
      <div className="space-y-4">
        {selectedDays.map((dayKey) => {
          const detail = dayDetails[dayKey];
          const isToday = detail?.isToday;

          const dayMeals = weekMenu.days?.[dayKey] || {
            dayKey,
            dayLabel: DAY_NAMES[dayKey],
            pranzo: { groups: [] },
            cena: { groups: [] },
          };

          return (
            <div
              key={dayKey}
              className={`bg-app-card rounded-2xl border shadow-xs overflow-hidden transition-all ${
                isToday
                  ? 'border-app-primary ring-2 ring-app-primary/20 shadow-sm'
                  : 'border-app-subtle hover:border-app-primary-border/60'
              }`}
            >
              {/* Day Header */}
              <div
                className={`px-4 py-2.5 border-b border-app-subtle flex items-center justify-between ${
                  isToday
                    ? 'bg-app-primary-light/60 dark:bg-app-primary-light/30'
                    : 'bg-app-muted/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm tracking-tight text-app-main">
                    {DAY_NAMES[dayKey]} {detail?.formattedDate}
                  </span>
                  {isToday && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-app-primary text-white">
                      Oggi
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-app-muted font-medium">
                  Pranzo & Cena
                </span>
              </div>

              {/* Day Meals Container */}
              <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* PRANZO */}
                <DynamicMealSlotCard
                  title="Pranzo"
                  mealType="pranzo"
                  slot={dayMeals.pranzo}
                  dayKey={dayKey}
                  activeWeekId={activeWeekId}
                  members={members}
                  onOpenGroupingModal={(groups) =>
                    setGroupingModalState({
                      isOpen: true,
                      dayKey,
                      dayLabel: `${DAY_NAMES[dayKey]} ${detail?.formattedDate || ''}`,
                      mealType: 'pranzo',
                      groups,
                    })
                  }
                  onOpenAdd={(groups, defaultGroupId) =>
                    handleOpenAddModal(dayKey, 'pranzo', groups, defaultGroupId)
                  }
                  onRemoveDish={(groupId, dishId) =>
                    removeDishFromGroup(activeWeekId, dayKey, 'pranzo', groupId, dishId)
                  }
                />

                {/* CENA */}
                <DynamicMealSlotCard
                  title="Cena"
                  mealType="cena"
                  slot={dayMeals.cena}
                  dayKey={dayKey}
                  activeWeekId={activeWeekId}
                  members={members}
                  onOpenGroupingModal={(groups) =>
                    setGroupingModalState({
                      isOpen: true,
                      dayKey,
                      dayLabel: `${DAY_NAMES[dayKey]} ${detail?.formattedDate || ''}`,
                      mealType: 'cena',
                      groups,
                    })
                  }
                  onOpenAdd={(groups, defaultGroupId) =>
                    handleOpenAddModal(dayKey, 'cena', groups, defaultGroupId)
                  }
                  onRemoveDish={(groupId, dishId) =>
                    removeDishFromGroup(activeWeekId, dayKey, 'cena', groupId, dishId)
                  }
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Calendar Picker Modal */}
      <CalendarPickerModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        selectedWeekId={activeWeekId}
        onSelectWeek={(newWeekId) => setActiveWeekId(newWeekId)}
      />

      {/* Meal Grouping Modal (for sub-groups) */}
      {groupingModalState && (
        <MealGroupingModal
          isOpen={groupingModalState.isOpen}
          onClose={() => setGroupingModalState(null)}
          dayLabel={groupingModalState.dayLabel}
          mealType={groupingModalState.mealType}
          members={members}
          currentGroups={groupingModalState.groups}
          onSaveGroups={(newGroups) => {
            updateMealSlotGroups(
              activeWeekId,
              groupingModalState.dayKey,
              groupingModalState.mealType,
              newGroups,
              newGroups.length === 1 ? 'together' : 'separate'
            );
          }}
        />
      )}

      {/* Add Dish Modal */}
      {addModalState && (
        <AddDishModal
          isOpen={addModalState.isOpen}
          onClose={() => setAddModalState(null)}
          dayKey={addModalState.dayKey}
          dayLabel={addModalState.dayLabel}
          mealType={addModalState.mealType}
          availableGroups={addModalState.availableGroups}
          defaultGroupId={addModalState.defaultGroupId}
          onAdd={handleAddDish}
        />
      )}
    </div>
  );
};

// Dynamic Meal Slot Card that behaves based on the number of members (1, 2, or 3+)
interface DynamicMealSlotCardProps {
  title: string;
  mealType: MealType;
  slot: MealSlot;
  dayKey: DayKey;
  activeWeekId: string;
  members: Person[];
  onOpenGroupingModal: (groups: MealGroup[]) => void;
  onOpenAdd: (groups: MealGroup[], defaultGroupId?: string) => void;
  onRemoveDish: (groupId: string, dishId: string) => void;
}

const DynamicMealSlotCard: React.FC<DynamicMealSlotCardProps> = ({
  title,
  mealType,
  slot,
  dayKey,
  activeWeekId,
  members,
  onOpenGroupingModal,
  onOpenAdd,
  onRemoveDish,
}) => {
  const { household, setMealLocation, setMealSlotMode } = useHousehold();
  const groups = normalizeMealSlot(slot, members);

  const memberMap = new Map<string, Person>();
  members.forEach((m) => memberMap.set(m.id, m));

  const houses = household.houses && household.houses.length > 0
    ? household.houses
    : [{ id: 'casa_principale', name: 'Casa', icon: '🏠' }];

  // Number of people associated with this house
  const numPeople = members.length;

  // Determine current grouping mode
  const isAllTogether = groups.length === 1 && groups[0].memberIds.length === numPeople;
  const isAllSeparate = groups.length === numPeople && groups.every((g) => g.memberIds.length === 1);

  const getGroupButtonLabel = () => {
    if (isAllTogether) return `👫 Tutti Insieme (${numPeople})`;
    if (isAllSeparate) return `🔀 Tutti Soli (${numPeople})`;
    const sizes = groups.map((g) => g.memberIds.length).sort((a, b) => b - a);
    if (numPeople === 3 && sizes.length === 2 && sizes[0] === 2 && sizes[1] === 1) {
      return '🧩 1 Solo + 2 Insieme';
    }
    if (numPeople === 4 && sizes.length === 2 && sizes[0] === 2 && sizes[1] === 2) {
      return '🧩 A due a due (2+2)';
    }
    if (numPeople === 4 && sizes.length === 2 && sizes[0] === 3 && sizes[1] === 1) {
      return '🧩 3 Insieme + 1 Solo';
    }
    return `🧩 A Gruppi (${sizes.join('+')})`;
  };

  const handleToggle2People = () => {
    if (isAllTogether) {
      setMealSlotMode(activeWeekId, dayKey, mealType, 'separate');
    } else {
      setMealSlotMode(activeWeekId, dayKey, mealType, 'together');
    }
  };

  return (
    <div className="rounded-xl border border-app-subtle bg-app-card p-3 flex flex-col justify-between">
      {/* Slot Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-app-main tracking-tight uppercase">
            {title}
          </span>
          <span className="text-[10px] text-app-muted">·</span>

          {/* Location selector (shown if more than 1 location defined) */}
          {houses.length > 1 && (
            <select
              value={slot.location || houses[0]?.id || 'casa_principale'}
              onChange={(e) => setMealLocation(activeWeekId, dayKey, mealType, e.target.value)}
              className="text-[11px] font-semibold text-app-primary bg-app-muted/60 px-1.5 py-0.5 rounded-md border-0 cursor-pointer outline-hidden hover:bg-app-primary-light"
              title="In quale casa si mangia?"
            >
              {houses.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.icon} {h.name}
                </option>
              ))}
              <option value="fuori">🍽️ Fuori</option>
            </select>
          )}
        </div>

        {/* CONTROLS STRICTLY DEPENDING ON NUMBER OF ASSOCIATED PEOPLE: */}

        {/* 1. SE 1 SOLA PERSONA: NON compare alcun 'Insieme / Separati' */}
        {numPeople <= 1 && (
          <span className="text-[11px] font-medium text-app-muted">
            {members[0]?.avatar || '👤'} {members[0]?.name || 'Personale'}
          </span>
        )}

        {/* 2. SE 2 PERSONE: puoi decidere se Insieme o Separati */}
        {numPeople === 2 && (
          <button
            onClick={handleToggle2People}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs ${
              isAllTogether
                ? 'bg-app-primary-light text-app-primary border-app-primary-border hover:opacity-90'
                : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50'
            }`}
            title="Clicca per passare da Insieme a Pasti Separati"
          >
            {isAllTogether ? '👫 Insieme' : '🔀 Separati'}
          </button>
        )}

        {/* 3. SE PIÙ DI 2 PERSONE: puoi creare insiemi (es. 1 sola e 2 insieme, tutti soli, a due a due, ecc.) */}
        {numPeople >= 3 && (
          <button
            onClick={() => onOpenGroupingModal(groups)}
            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-app-primary-border bg-app-primary-light text-app-primary hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Clicca per scegliere o personalizzare la disposizione a tavola"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>{getGroupButtonLabel()}</span>
          </button>
        )}
      </div>

      {/* DISHES DISPLAY PER GROUP */}
      <div className="flex-1 space-y-2">
        {/* If only 1 group (e.g. single person or all together) */}
        {groups.length === 1 ? (
          <div className="space-y-2">
            {numPeople > 1 && (
              <div className="flex items-center gap-1 text-[11px] text-app-muted font-medium pb-1 border-b border-app-subtle">
                <span>👫 Mangiano insieme:</span>
                <span className="font-semibold text-app-main">
                  {groups[0].memberIds.map((id) => memberMap.get(id)?.name).filter(Boolean).join(', ')}
                </span>
              </div>
            )}

            {groups[0].dishes.length === 0 ? (
              <div className="py-4 text-center border border-dashed border-app-subtle rounded-xl text-app-muted text-xs">
                Nessun piatto pianificato
              </div>
            ) : (
              <div className="space-y-1.5">
                {groups[0].dishes.map((dish) => (
                  <div
                    key={dish.id}
                    className="group flex items-center justify-between p-2 rounded-lg bg-app-muted/60 border border-app-subtle hover:border-app-primary-border transition-colors text-xs"
                  >
                    <div className="flex-1 mr-2">
                      <span className="font-semibold text-app-main block">
                        {dish.name}
                      </span>
                      {dish.ingredients && dish.ingredients.length > 0 && (
                        <span className="text-[10px] text-app-muted line-clamp-1">
                          {dish.ingredients.join(', ')}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onRemoveDish(groups[0].id, dish.id)}
                      className="opacity-60 hover:opacity-100 text-rose-500 p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                      title="Rimuovi piatto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => onOpenAdd(groups, groups[0].id)}
              className="w-full mt-2 py-1.5 px-3 rounded-lg border border-dashed border-app-primary/40 text-app-primary hover:bg-app-primary-light transition-colors text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Aggiungi piatto</span>
            </button>
          </div>
        ) : (
          /* Multiple groups (e.g. 2 separated people, or 3-4 people in sub-groups) */
          <div className={`grid gap-2 ${groups.length === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {groups.map((group, idx) => {
              const groupMembers = group.memberIds
                .map((id) => memberMap.get(id))
                .filter(Boolean) as Person[];

              const groupTitle =
                groupMembers.length === 1
                  ? `${groupMembers[0].avatar} ${groupMembers[0].name}`
                  : groupMembers.map((m) => `${m.avatar} ${m.name}`).join(' + ');

              return (
                <div
                  key={group.id}
                  className="p-2.5 rounded-xl bg-app-muted/40 border border-app-subtle flex flex-col justify-between"
                >
                  <div>
                    {/* Group Header */}
                    <div className="flex items-center justify-between text-[11px] font-bold text-app-main mb-1.5 pb-1 border-b border-app-subtle">
                      <span className="truncate" title={groupTitle}>
                        {groupTitle}
                      </span>
                      {groupMembers.length > 1 && (
                        <span className="text-[10px] font-normal text-app-muted shrink-0 ml-1">
                          ({groupMembers.length} persone)
                        </span>
                      )}
                    </div>

                    {group.dishes.length === 0 ? (
                      <div className="py-2.5 text-center text-[11px] text-app-muted italic">
                        Non pianificato
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {group.dishes.map((dish) => (
                          <div
                            key={dish.id}
                            className="flex items-start justify-between p-1.5 rounded-lg bg-app-card border border-app-subtle text-[11px]"
                          >
                            <span className="font-medium text-app-main leading-tight mr-1">
                              {dish.name}
                            </span>
                            <button
                              onClick={() => onRemoveDish(group.id, dish.id)}
                              className="text-rose-500 hover:text-rose-700 p-0.5 shrink-0 cursor-pointer"
                              title="Rimuovi"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => onOpenAdd(groups, group.id)}
                    className="mt-2 py-1 text-[10px] font-semibold text-app-primary hover:bg-app-primary-light rounded-md border border-dashed border-app-primary/30 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Piatto
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
