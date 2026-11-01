import React, { useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Check,
  Sparkles,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext.tsx';
import { getCurrentWeekId, getMondayOfIsoWeek, getWeekRangeDisplay } from '../../data/initialData.ts';

interface CalendarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWeekId: string;
  onSelectWeek: (weekId: string) => void;
}

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const WEEKDAY_NAMES = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export const CalendarPickerModal: React.FC<CalendarPickerModalProps> = ({
  isOpen,
  onClose,
  selectedWeekId,
  onSelectWeek,
}) => {
  const { household } = useHousehold();

  // Initialize calendar view to the month of the selected week
  const initialMonday = getMondayOfIsoWeek(selectedWeekId);
  const [viewDate, setViewDate] = useState<Date>(() => new Date(initialMonday.getFullYear(), initialMonday.getMonth(), 1));

  if (!isOpen) return null;

  const currentRealWeek = getCurrentWeekId();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const handleGoToToday = () => {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    onSelectWeek(currentRealWeek);
    onClose();
  };

  // Generate calendar grid for viewMonth
  // Find first day of month (1-indexed day of week, where 0=Mon, 6=Sun)
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // 0 for Monday

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Selected week's Monday
  const selectedMonday = getMondayOfIsoWeek(selectedWeekId);
  const selectedSunday = new Date(selectedMonday.getTime() + 6 * 86400000);

  // Build grid weeks
  interface DayCell {
    date: Date;
    dayNum: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    weekId: string;
    isSelectedWeek: boolean;
  }

  const weeks: DayCell[][] = [];
  let currentDayOffset = -startDayOfWeek + 1;

  for (let w = 0; w < 6; w++) {
    const weekDays: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(viewYear, viewMonth, currentDayOffset);
      cellDate.setHours(0, 0, 0, 0);

      const isCurrentMonth = cellDate.getMonth() === viewMonth;
      const isToday = cellDate.getTime() === today.getTime();
      const cellWeekId = getCurrentWeekId(cellDate);
      const isSelectedWeek = cellDate.getTime() >= selectedMonday.getTime() && cellDate.getTime() <= selectedSunday.getTime();

      weekDays.push({
        date: cellDate,
        dayNum: cellDate.getDate(),
        isCurrentMonth,
        isToday,
        weekId: cellWeekId,
        isSelectedWeek,
      });

      currentDayOffset++;
    }

    // Only add 6th week if it has days in current month
    if (w < 5 || weekDays.some((d) => d.isCurrentMonth)) {
      weeks.push(weekDays);
    }
  }

  const handleDayClick = (day: DayCell) => {
    onSelectWeek(day.weekId);
    onClose();
  };

  // Count meals planned in this household for a week
  const getPlannedMealsCount = (weekId: string) => {
    const wm = household.menus[weekId];
    if (!wm || !wm.days) return 0;
    let count = 0;
    for (const day of Object.values(wm.days)) {
      if (day.pranzo?.groups) {
        count += day.pranzo.groups.reduce((acc, g) => acc + (g.dishes?.length || 0), 0);
      } else {
        count += (day.pranzo?.togetherDishes?.length || 0);
      }
      if (day.cena?.groups) {
        count += day.cena.groups.reduce((acc, g) => acc + (g.dishes?.length || 0), 0);
      } else {
        count += (day.cena?.togetherDishes?.length || 0);
      }
    }
    return count;
  };

  const selectedWeekInfo = getWeekRangeDisplay(selectedWeekId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-app-card rounded-2xl border border-app-subtle shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-app-subtle flex items-center justify-between bg-app-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-app-primary-light text-app-primary flex items-center justify-center font-bold">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-app-main leading-tight">
                Seleziona Settimana
              </h3>
              <p className="text-[11px] text-app-muted">
                {selectedWeekInfo.label}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-app-muted hover:text-app-main hover:bg-app-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Month Navigation */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-app-subtle">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-app-subtle hover:bg-app-muted transition-colors text-app-main cursor-pointer"
            title="Mese precedente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-bold text-sm text-app-main">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>

          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-app-subtle hover:bg-app-muted transition-colors text-app-main cursor-pointer"
            title="Mese successivo"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="p-4 space-y-1">
          {/* Weekday labels */}
          <div className="grid grid-cols-7 text-center pb-2 border-b border-app-subtle/60">
            {WEEKDAY_NAMES.map((name) => (
              <span key={name} className="text-[11px] font-bold text-app-muted uppercase tracking-wider">
                {name}
              </span>
            ))}
          </div>

          {/* Weeks Rows */}
          <div className="space-y-1 pt-1">
            {weeks.map((week, wIndex) => {
              const weekId = week[0].weekId;
              const isSelectedWeek = week[0].isSelectedWeek;
              const plannedCount = getPlannedMealsCount(weekId);

              return (
                <div
                  key={wIndex}
                  onClick={() => {
                    onSelectWeek(weekId);
                    onClose();
                  }}
                  className={`group relative grid grid-cols-7 rounded-xl transition-all cursor-pointer p-0.5 ${
                    isSelectedWeek
                      ? 'bg-app-primary-light border border-app-primary-border shadow-xs'
                      : 'hover:bg-app-muted/60 border border-transparent'
                  }`}
                  title={`Clicca per visualizzare il menu della settimana (${plannedCount} piatti pianificati)`}
                >
                  {week.map((day, dIndex) => {
                    return (
                      <div
                        key={dIndex}
                        className={`h-9 flex flex-col items-center justify-center rounded-lg transition-colors relative ${
                          day.isSelectedWeek
                            ? 'font-bold text-app-primary'
                            : day.isCurrentMonth
                            ? 'text-app-main font-medium'
                            : 'text-app-muted/40 font-normal'
                        }`}
                      >
                        <span
                          className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${
                            day.isToday
                              ? 'bg-app-primary text-white font-bold ring-2 ring-app-primary/30'
                              : ''
                          }`}
                        >
                          {day.dayNum}
                        </span>

                        {/* Dot indicator for meals in week */}
                        {dIndex === 3 && plannedCount > 0 && (
                          <span
                            className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
                              isSelectedWeek ? 'bg-app-primary' : 'bg-app-muted text-app-primary'
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Shortcuts Footer */}
        <div className="p-3 bg-app-muted/30 border-t border-app-subtle flex items-center justify-between gap-2 text-xs">
          <button
            onClick={handleGoToToday}
            className="px-3 py-1.5 font-semibold rounded-lg bg-app-card border border-app-subtle text-app-main hover:bg-app-muted transition-colors cursor-pointer"
          >
            Questa settimana (Oggi)
          </button>

          <button
            onClick={() => {
              // Next week from today
              const nextWeekMonday = new Date(today.getTime() + 7 * 86400000);
              onSelectWeek(getCurrentWeekId(nextWeekMonday));
              onClose();
            }}
            className="px-3 py-1.5 font-semibold rounded-lg text-app-primary hover:bg-app-primary-light transition-colors cursor-pointer"
          >
            Prossima settimana →
          </button>
        </div>
      </div>
    </div>
  );
};
