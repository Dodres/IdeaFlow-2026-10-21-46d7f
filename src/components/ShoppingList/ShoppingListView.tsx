import React, { useState, useMemo } from 'react';
import {
  Check,
  Plus,
  Trash2,
  Filter,
  CheckCircle2,
  Layers,
  Calendar,
  Utensils,
  Tag,
  Sparkles,
  ShoppingBag,
  RotateCcw,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext.tsx';
import { ShoppingItem, DepartmentCategory, Assignee, DayKey } from '../../types.ts';
import { DEPARTMENT_LABELS } from '../../data/initialData.ts';

type GroupMode = 'reparto' | 'ricetta' | 'giorno';
type FilterAssignee = 'all' | 'together' | 'mine' | 'partner';

const DAY_ORDER: Record<string, number> = {
  lun: 1,
  mar: 2,
  mer: 3,
  gio: 4,
  ven: 5,
  sab: 6,
  dom: 7,
};

const DAY_NAMES: Record<string, string> = {
  lun: 'Lunedì',
  mar: 'Martedì',
  mer: 'Mercoledì',
  gio: 'Giovedì',
  ven: 'Venerdì',
  sab: 'Sabato',
  dom: 'Domenica',
};

export const ShoppingListView: React.FC = () => {
  const {
    household,
    members,
    toggleShoppingItem,
    addShoppingItem,
    deleteShoppingItem,
    clearCompletedShopping,
    currentRole,
  } = useHousehold();

  // Controls state
  const [groupMode, setGroupMode] = useState<GroupMode>('reparto');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [quickInput, setQuickInput] = useState('');
  const [quickAssignee, setQuickAssignee] = useState<Assignee>('together');
  const [isAdding, setIsAdding] = useState(false);

  const memberMap = useMemo(() => {
    const map = new Map<string, (typeof members)[0]>();
    members.forEach((m) => map.set(m.id, m));
    return map;
  }, [members]);

  // Filter items by assignee
  const filteredItems = useMemo(() => {
    return household.shoppingList.filter((item) => {
      if (filterAssignee === 'all') return true;
      if (filterAssignee === 'together') return item.assignee === 'together';
      return item.assignee === filterAssignee;
    });
  }, [household.shoppingList, filterAssignee]);

  // Counts
  const totalCount = filteredItems.length;
  const doneCount = filteredItems.filter((i) => i.isDone).length;
  const pendingCount = totalCount - doneCount;

  // Quick Add submit
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim() || isAdding) return;
    try {
      setIsAdding(true);
      const assignedTarget = members.length === 1 ? members[0].id : quickAssignee;
      await addShoppingItem({
        name: quickInput.trim(),
        assignee: assignedTarget,
        dishName: 'Fuori lista',
      });
      setQuickInput('');
    } finally {
      setIsAdding(false);
    }
  };

  // Assignee badge styling
  const renderAssigneeBadge = (assignee: Assignee) => {
    if (members.length <= 1) {
      return null;
    }
    if (assignee === 'together') {
      return (
        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-md">
          Insieme
        </span>
      );
    }
    const person = memberMap.get(assignee);
    if (person) {
      return (
        <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 dark:bg-sky-950/60 dark:text-sky-300 px-2 py-0.5 rounded-md">
          {person.avatar} {person.name}
        </span>
      );
    }
    return (
      <span className="text-[10px] font-semibold text-app-muted bg-app-muted px-2 py-0.5 rounded-md">
        {assignee}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Quick Add Form Bar */}
      <div className="bg-app-card rounded-2xl border border-app-subtle p-3 sm:p-4 shadow-xs">
        <form onSubmit={handleQuickAdd} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Aggiungi prodotto (es. Pane fresco, Basilico, Pomodori)..."
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              className="flex-1 px-3.5 py-2.5 text-sm rounded-xl border border-app-subtle bg-app-card text-app-main focus:border-app-primary focus:ring-1 focus:ring-app-primary outline-hidden"
            />
            <button
              type="submit"
              disabled={!quickInput.trim() || isAdding}
              className="px-4 py-2.5 rounded-xl bg-app-primary text-white font-bold text-xs flex items-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-40 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Aggiungi</span>
            </button>
          </div>

          {/* Quick Assignee Choice: only shown if 2 or more people */}
          {members.length > 1 && (
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-app-muted text-[11px] font-medium mr-1">
                  Chi compra:
                </span>
                <button
                  type="button"
                  onClick={() => setQuickAssignee('together')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    quickAssignee === 'together'
                      ? 'bg-app-primary text-white shadow-xs'
                      : 'bg-app-muted text-app-muted hover:text-app-main'
                  }`}
                >
                  Insieme
                </button>
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setQuickAssignee(m.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      quickAssignee === m.id
                        ? 'bg-app-primary text-white shadow-xs'
                        : 'bg-app-muted text-app-muted hover:text-app-main'
                    }`}
                  >
                    {m.avatar} {m.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-app-muted hidden md:inline">
                  ✨ Reparto assegnato automaticamente da AI
                </span>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Filter & Grouping Controls */}
      <div className="bg-app-card rounded-2xl border border-app-subtle p-3 sm:p-4 shadow-xs space-y-3">
        {/* Row 1: Assignee Filters & Clean button */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {members.length > 1 ? (
            <div className="flex items-center gap-1 bg-app-muted p-1 rounded-xl flex-wrap">
              <button
                type="button"
                onClick={() => setFilterAssignee('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  filterAssignee === 'all'
                    ? 'bg-app-card text-app-main shadow-xs'
                    : 'text-app-muted hover:text-app-main'
                }`}
              >
                Tutto ({household.shoppingList.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterAssignee('together')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  filterAssignee === 'together'
                    ? 'bg-app-card text-app-main shadow-xs'
                    : 'text-app-muted hover:text-app-main'
                }`}
              >
                Solo Insieme
              </button>
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setFilterAssignee(m.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    filterAssignee === m.id
                      ? 'bg-app-card text-app-main shadow-xs'
                      : 'text-app-muted hover:text-app-main'
                  }`}
                >
                  {m.avatar} Solo {m.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-xs text-app-muted font-medium">
              Spesa per {members[0]?.avatar} {members[0]?.name}
            </div>
          )}

          {/* Clean completed button */}
          {doneCount > 0 && (
            <button
              type="button"
              onClick={clearCompletedShopping}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Rimuovi spuntati ({doneCount})</span>
            </button>
          )}
        </div>

        {/* Row 2: Grouping View Options */}
        <div className="flex items-center justify-between pt-2 border-t border-app-subtle text-xs">
          <div className="flex items-center gap-2">
            <span className="text-app-muted font-medium">Raggruppa:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setGroupMode('reparto')}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  groupMode === 'reparto'
                    ? 'bg-app-primary-light text-app-primary'
                    : 'text-app-muted hover:text-app-main'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Reparto</span>
              </button>
              <button
                onClick={() => setGroupMode('ricetta')}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  groupMode === 'ricetta'
                    ? 'bg-app-primary-light text-app-primary'
                    : 'text-app-muted hover:text-app-main'
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Piatto / Ricetta</span>
              </button>
              <button
                onClick={() => setGroupMode('giorno')}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  groupMode === 'giorno'
                    ? 'bg-app-primary-light text-app-primary'
                    : 'text-app-muted hover:text-app-main'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Giorno</span>
              </button>
            </div>
          </div>

          <div className="text-[11px] text-app-muted font-medium">
            <span className="font-bold text-app-main">{pendingCount}</span> da comprare ·{' '}
            <span className="font-bold text-emerald-600">{doneCount}</span> nel carrello
          </div>
        </div>
      </div>

      {/* Main Checklist Render */}
      {filteredItems.length === 0 ? (
        <div className="bg-app-card rounded-2xl border border-app-subtle p-12 text-center shadow-xs">
          <div className="text-4xl mb-3">🛒</div>
          <h3 className="font-bold text-base text-app-main mb-1">
            Nessun prodotto in lista
          </h3>
          <p className="text-xs text-app-muted max-w-sm mx-auto">
            Aggiungi prodotti manualmente oppure pianifica i pasti della settimana nel menu per aggregare gli ingredienti.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupMode === 'reparto' && (
            <RenderByDepartment
              items={filteredItems}
              onToggle={toggleShoppingItem}
              onDelete={deleteShoppingItem}
              renderBadge={renderAssigneeBadge}
            />
          )}

          {groupMode === 'ricetta' && (
            <RenderByRecipe
              items={filteredItems}
              onToggle={toggleShoppingItem}
              onDelete={deleteShoppingItem}
              renderBadge={renderAssigneeBadge}
            />
          )}

          {groupMode === 'giorno' && (
            <RenderByDay
              items={filteredItems}
              onToggle={toggleShoppingItem}
              onDelete={deleteShoppingItem}
              renderBadge={renderAssigneeBadge}
            />
          )}
        </div>
      )}
    </div>
  );
};

// --- SUB-GROUPINGS ---

// 1. Group by Supermarket Department
interface SubRenderProps {
  items: ShoppingItem[];
  onToggle: (id: string, isDone?: boolean) => void;
  onDelete: (id: string) => void;
  renderBadge: (assignee: Assignee) => React.ReactNode;
}

const RenderByDepartment: React.FC<SubRenderProps> = ({
  items,
  onToggle,
  onDelete,
  renderBadge,
}) => {
  const departments: DepartmentCategory[] = [
    'ortofrutta',
    'macelleria_pescheria',
    'latticini_freschi',
    'dispensa_secco',
    'surgelati',
    'cura_casa_altro',
  ];

  return (
    <div className="space-y-4">
      {departments.map((deptKey) => {
        const deptItems = items.filter((i) => i.category === deptKey);
        if (deptItems.length === 0) return null;
        const config = DEPARTMENT_LABELS[deptKey] || { label: deptKey, icon: '📦' };

        return (
          <div
            key={deptKey}
            className="bg-app-card rounded-2xl border border-app-subtle overflow-hidden shadow-xs"
          >
            <div className="px-4 py-2.5 bg-app-muted/50 border-b border-app-subtle flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">{config.icon}</span>
                <span className="font-bold text-xs uppercase tracking-tight text-app-main">
                  {config.label}
                </span>
              </div>
              <span className="text-[11px] text-app-muted font-medium">
                {deptItems.filter((i) => !i.isDone).length} rimanenti
              </span>
            </div>

            <div className="divide-y divide-app-subtle">
              {deptItems.map((item) => (
                <ShoppingRow
                  key={item.id}
                  item={item}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  renderBadge={renderBadge}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// 2. Group by Recipe / Dish
const RenderByRecipe: React.FC<SubRenderProps> = ({
  items,
  onToggle,
  onDelete,
  renderBadge,
}) => {
  const grouped = useMemo(() => {
    const map = new Map<string, ShoppingItem[]>();
    for (const item of items) {
      const key = item.dishName || 'Fuori lista';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [items]);

  return (
    <div className="space-y-4">
      {Array.from(grouped.entries()).map(([dishName, dishItems]) => (
        <div
          key={dishName}
          className="bg-app-card rounded-2xl border border-app-subtle overflow-hidden shadow-xs"
        >
          <div className="px-4 py-2.5 bg-app-muted/50 border-b border-app-subtle flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">{dishName === 'Fuori lista' ? '📝' : '🍲'}</span>
              <span className="font-bold text-xs tracking-tight text-app-main">
                {dishName}
              </span>
            </div>
            <span className="text-[11px] text-app-muted font-medium">
              {dishItems.filter((i) => !i.isDone).length} rimanenti
            </span>
          </div>

          <div className="divide-y divide-app-subtle">
            {dishItems.map((item) => (
              <ShoppingRow
                key={item.id}
                item={item}
                onToggle={onToggle}
                onDelete={onDelete}
                renderBadge={renderBadge}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// 3. Group by Day Priority
const RenderByDay: React.FC<SubRenderProps> = ({
  items,
  onToggle,
  onDelete,
  renderBadge,
}) => {
  const grouped = useMemo(() => {
    const map = new Map<string, ShoppingItem[]>();
    for (const item of items) {
      const key = item.dayKey || 'altri';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [items]);

  const sortedKeys = Array.from(grouped.keys()).sort((a, b) => {
    return (DAY_ORDER[a] || 99) - (DAY_ORDER[b] || 99);
  });

  return (
    <div className="space-y-4">
      {sortedKeys.map((dayKey) => {
        const dayItems = grouped.get(dayKey) || [];
        const label = dayKey === 'altri' ? 'Senza giorno / Dispensa generale' : DAY_NAMES[dayKey] || dayKey;

        return (
          <div
            key={dayKey}
            className="bg-app-card rounded-2xl border border-app-subtle overflow-hidden shadow-xs"
          >
            <div className="px-4 py-2.5 bg-app-muted/50 border-b border-app-subtle flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-app-primary" />
                <span className="font-bold text-xs tracking-tight text-app-main">
                  {label}
                </span>
              </div>
              <span className="text-[11px] text-app-muted font-medium">
                {dayItems.filter((i) => !i.isDone).length} rimanenti
              </span>
            </div>

            <div className="divide-y divide-app-subtle">
              {dayItems.map((item) => (
                <ShoppingRow
                  key={item.id}
                  item={item}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  renderBadge={renderBadge}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Shopping Item Single Row
interface ShoppingRowProps {
  item: ShoppingItem;
  onToggle: (id: string, isDone?: boolean) => void;
  onDelete: (id: string) => void;
  renderBadge: (assignee: Assignee) => React.ReactNode;
}

const ShoppingRow: React.FC<ShoppingRowProps> = ({
  item,
  onToggle,
  onDelete,
  renderBadge,
}) => {
  return (
    <div
      onClick={() => onToggle(item.id)}
      className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
        item.isDone ? 'bg-app-muted/30 opacity-60' : 'hover:bg-app-muted/40'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Checkbox Touch Target */}
        <div
          className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
            item.isDone
              ? 'bg-emerald-600 border-emerald-600 text-white'
              : 'border-app-subtle bg-app-card hover:border-app-primary'
          }`}
        >
          {item.isDone && <Check className="w-4 h-4 stroke-[3]" />}
        </div>

        <div className="min-w-0">
          <span
            className={`text-sm font-semibold text-app-main block truncate ${
              item.isDone ? 'line-through text-app-muted' : ''
            }`}
          >
            {item.name}
          </span>
          <div className="flex items-center gap-2 text-[11px] text-app-muted mt-0.5">
            {item.dishName && item.dishName !== 'Fuori lista' && (
              <>
                <span className="truncate max-w-[150px]">Per: {item.dishName}</span>
                <span>·</span>
              </>
            )}
            {item.isDone && item.checkedBy && (
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                Spuntato da {item.checkedBy}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {renderBadge(item.assignee)}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          className="text-app-muted hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          title="Elimina dalla lista"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
