import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Sparkles,
  Search,
  Clock,
  Calendar,
  ShoppingBag,
  Check,
  Utensils,
  ChevronRight,
  Flame,
  X,
  Trash2,
  Pencil,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext.tsx';
import { Recipe, Season, DayKey, MealType } from '../../types.ts';
import {
  SEASON_LABELS,
  getCurrentSeason,
  getWeekRangeDisplay,
  getRecipeSeasons,
  formatRecipeSeasons,
  isRecipeInSeason,
} from '../../data/initialData.ts';

interface RecipesViewProps {
  onOpenAISuggest: () => void;
}

export const RecipesView: React.FC<RecipesViewProps> = ({ onOpenAISuggest }) => {
  const {
    household,
    members,
    saveRecipe,
    deleteRecipe,
    recordRecipePrepared,
    addDishToSlot,
    addMultipleShoppingItems,
    activeWeekId,
  } = useHousehold();

  const [search, setSearch] = useState('');
  const [seasonFilter, setSeasonFilter] = useState<Season | 'all'>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [scheduleRecipe, setScheduleRecipe] = useState<Recipe | null>(null);

  // Recipe form state (used for create and edit)
  const [formName, setFormName] = useState('');
  const [formSeasons, setFormSeasons] = useState<Season[]>([getCurrentSeason()]);
  const [formCategory, setFormCategory] = useState<Recipe['category']>('Primo');
  const [formPrepTime, setFormPrepTime] = useState('25 min');
  const [formIngredientsStr, setFormIngredientsStr] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Schedule modal state
  const [schedDay, setSchedDay] = useState<DayKey>('lun');
  const [schedMeal, setSchedMeal] = useState<MealType>('cena');
  const [schedAssignee, setSchedAssignee] = useState<string>('together');
  const [schedIngredients, setSchedIngredients] = useState(true);
  const [justScheduled, setJustScheduled] = useState(false);

  const currentSeason = getCurrentSeason();

  // Freshness calculation
  const getFreshness = (recipe: Recipe) => {
    if (!recipe.lastPreparedDate) {
      return {
        score: 100,
        text: 'Non preparato di recente',
        badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
        recommend: true,
      };
    }
    const days = Math.floor(
      (new Date().getTime() - new Date(recipe.lastPreparedDate).getTime()) / (1000 * 3600 * 24)
    );
    if (days >= 14) {
      return {
        score: 90,
        text: `Cucinato ${days} gg fa · Ottimo da riproporre!`,
        badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
        recommend: true,
      };
    }
    if (days >= 10) {
      return {
        score: 60,
        text: `Cucinato ${days} gg fa`,
        badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
        recommend: false,
      };
    }
    return {
      score: 20,
      text: `Cucinato di recente (${days} gg fa)`,
      badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
      recommend: false,
    };
  };

  const filteredRecipes = useMemo(() => {
    return household.recipes.filter((r) => {
      const matchSearch =
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.ingredients.some((i) => i.toLowerCase().includes(search.toLowerCase()));
      const matchSeason = isRecipeInSeason(r, seasonFilter);
      return matchSearch && matchSeason;
    });
  }, [household.recipes, search, seasonFilter]);

  const openCreateModal = () => {
    setEditingRecipe(null);
    setFormName('');
    setFormSeasons([getCurrentSeason()]);
    setFormCategory('Primo');
    setFormPrepTime('25 min');
    setFormIngredientsStr('');
    setFormNotes('');
    setIsCreating(true);
  };

  const openEditModal = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setFormName(recipe.name);
    setFormSeasons(getRecipeSeasons(recipe));
    setFormCategory(recipe.category);
    setFormPrepTime(recipe.prepTime || '25 min');
    setFormIngredientsStr((recipe.ingredients || []).join(', '));
    setFormNotes(recipe.notes || '');
    setIsCreating(true);
  };

  const toggleSeasonInForm = (season: Season) => {
    if (season === 'all_year') {
      // If toggling all_year, set only all_year
      setFormSeasons(['all_year']);
      return;
    }

    setFormSeasons((prev) => {
      // Remove all_year if previously selected
      const withoutAllYear = prev.filter((s) => s !== 'all_year');
      if (withoutAllYear.includes(season)) {
        const remaining = withoutAllYear.filter((s) => s !== season);
        return remaining.length === 0 ? ['all_year'] : remaining;
      } else {
        return [...withoutAllYear, season];
      }
    });
  };

  const handleSaveRecipeForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const ingArray = formIngredientsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const safeSeasons = formSeasons.length > 0 ? formSeasons : (['all_year'] as Season[]);
    const primarySeason = safeSeasons[0];

    const recipeToSave: Recipe = {
      id: editingRecipe ? editingRecipe.id : `rec_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: formName.trim(),
      season: primarySeason,
      seasons: safeSeasons,
      category: formCategory,
      prepTime: formPrepTime.trim() || '20 min',
      ingredients: ingArray,
      notes: formNotes.trim() || undefined,
      lastPreparedDate: editingRecipe ? editingRecipe.lastPreparedDate : undefined,
    };

    await saveRecipe(recipeToSave);
    setIsCreating(false);
    setEditingRecipe(null);
  };

  const handleConfirmSchedule = async () => {
    if (!scheduleRecipe) return;

    await addDishToSlot(
      activeWeekId,
      schedDay,
      schedMeal,
      schedAssignee,
      {
        id: `dish_${Date.now()}`,
        name: scheduleRecipe.name,
        recipeId: scheduleRecipe.id,
        ingredients: scheduleRecipe.ingredients,
      },
      schedIngredients
    );

    // Update freshness date
    await recordRecipePrepared(scheduleRecipe.id);

    setJustScheduled(true);
    setTimeout(() => {
      setJustScheduled(false);
      setScheduleRecipe(null);
    }, 1200);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* AI Inspiration Banner */}
      <div className="bg-gradient-to-r from-app-primary-light via-app-card to-app-muted/40 rounded-2xl border border-app-primary-border p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-app-primary text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm sm:text-base text-app-main tracking-tight">
              Ispirazione di Stagione con Gemini Flash
            </h2>
            <p className="text-xs text-app-muted mt-0.5">
              Scopri nuove ricette autunnali con ingredienti tipici (zucca, funghi, castagne) ed eviti automaticamente piatti cucinati di recente!
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAISuggest}
          className="px-4 py-2.5 rounded-xl bg-app-primary text-white font-bold text-xs flex items-center gap-2 hover:opacity-90 transition-opacity active:scale-95 shadow-xs shrink-0 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Consigliami piatti</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-app-card rounded-2xl border border-app-subtle p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-app-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cerca per nome o ingrediente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-app-subtle bg-app-card text-app-main outline-hidden focus:border-app-primary"
            />
          </div>

          <button
            onClick={openCreateModal}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-app-card border border-app-subtle text-app-main hover:bg-app-muted transition-colors text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-app-primary" />
            <span>Nuova ricetta</span>
          </button>
        </div>

        {/* Season Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 pt-1 text-xs">
          <button
            onClick={() => setSeasonFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              seasonFilter === 'all'
                ? 'bg-app-primary text-white shadow-xs'
                : 'bg-app-muted text-app-muted hover:text-app-main'
            }`}
          >
            Tutte ({household.recipes.length})
          </button>
          <button
            onClick={() => setSeasonFilter('autumn')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              seasonFilter === 'autumn'
                ? 'bg-app-primary text-white shadow-xs'
                : 'bg-app-muted text-app-muted hover:text-app-main'
            }`}
          >
            🍂 Autunno
          </button>
          <button
            onClick={() => setSeasonFilter('winter')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              seasonFilter === 'winter'
                ? 'bg-app-primary text-white shadow-xs'
                : 'bg-app-muted text-app-muted hover:text-app-main'
            }`}
          >
            ❄️ Inverno
          </button>
          <button
            onClick={() => setSeasonFilter('spring')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              seasonFilter === 'spring'
                ? 'bg-app-primary text-white shadow-xs'
                : 'bg-app-muted text-app-muted hover:text-app-main'
            }`}
          >
            🌸 Primavera
          </button>
          <button
            onClick={() => setSeasonFilter('summer')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              seasonFilter === 'summer'
                ? 'bg-app-primary text-white shadow-xs'
                : 'bg-app-muted text-app-muted hover:text-app-main'
            }`}
          >
            ☀️ Estate
          </button>
          <button
            onClick={() => setSeasonFilter('all_year')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              seasonFilter === 'all_year'
                ? 'bg-app-primary text-white shadow-xs'
                : 'bg-app-muted text-app-muted hover:text-app-main'
            }`}
          >
            ✨ Tutto l'anno
          </button>
        </div>
      </div>

      {/* Recipes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRecipes.map((recipe) => {
          const freshness = getFreshness(recipe);

          return (
            <div
              key={recipe.id}
              className="bg-app-card rounded-2xl border border-app-subtle p-4 shadow-xs hover:border-app-primary-border transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-app-main tracking-tight">
                      {recipe.name}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-app-muted mt-1">
                      <span>{formatRecipeSeasons(recipe)}</span>
                      <span>·</span>
                      <span>{recipe.category}</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3 text-app-primary" /> {recipe.prepTime}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${freshness.badgeClass}`}>
                    {freshness.text}
                  </span>
                </div>

                {recipe.notes && (
                  <p className="text-xs text-app-muted mt-2 italic">
                    "{recipe.notes}"
                  </p>
                )}

                {/* Conceptual Ingredients */}
                {recipe.ingredients.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-app-subtle/50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted block mb-1">
                      Ingredienti ({recipe.ingredients.length}):
                    </span>
                    <div className="flex flex-wrap gap-1 text-[11px]">
                      {recipe.ingredients.map((ing, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-app-muted text-app-main font-medium text-[11px]"
                        >
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-app-subtle gap-2">
                <button
                  onClick={() => recordRecipePrepared(recipe.id)}
                  className="text-[11px] text-app-muted hover:text-app-main transition-colors flex items-center gap-1 cursor-pointer"
                  title="Aggiorna la data dell'ultima volta che lo hai cucinato ad oggi"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Cucinato oggi</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(recipe)}
                    className="p-1.5 rounded-lg border border-app-subtle hover:bg-app-muted text-app-muted hover:text-app-main transition-colors cursor-pointer"
                    title="Modifica ricetta"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm(`Sei sicuro di voler eliminare "${recipe.name}" dalle ricette?`)) {
                        deleteRecipe(recipe.id);
                      }
                    }}
                    className="p-1.5 rounded-lg border border-app-subtle hover:bg-rose-50 dark:hover:bg-rose-950/40 text-app-muted hover:text-rose-600 transition-colors cursor-pointer"
                    title="Elimina ricetta"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      addMultipleShoppingItems(
                        recipe.ingredients.map((ing) => ({
                          name: ing,
                          assignee: 'together',
                          dishName: recipe.name,
                        }))
                      );
                    }}
                    className="p-1.5 rounded-lg border border-app-subtle hover:bg-app-muted transition-colors text-app-muted hover:text-app-main cursor-pointer"
                    title="Aggiungi solo gli ingredienti alla lista della spesa"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setScheduleRecipe(recipe)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-app-primary text-white hover:opacity-90 transition-opacity flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Pianifica nel Menu</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Schedule Recipe Modal */}
      {scheduleRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-app-card rounded-2xl border border-app-subtle shadow-xl w-full max-w-md overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-app-subtle pb-3">
              <div>
                <h3 className="font-bold text-sm text-app-main">
                  Pianifica {scheduleRecipe.name}
                </h3>
                <p className="text-xs text-app-muted">
                  Scegli giorno e pasto per la settimana: <strong className="text-app-main font-semibold">{getWeekRangeDisplay(activeWeekId).label}</strong>
                </p>
              </div>
              <button
                onClick={() => setScheduleRecipe(null)}
                className="p-1 rounded-lg text-app-muted hover:text-app-main hover:bg-app-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-app-main block mb-1">Giorno:</label>
                <select
                  value={schedDay}
                  onChange={(e) => setSchedDay(e.target.value as DayKey)}
                  className="w-full px-3 py-2 rounded-xl border border-app-subtle bg-app-card text-app-main outline-hidden font-semibold"
                >
                  <option value="lun">Lunedì</option>
                  <option value="mar">Martedì</option>
                  <option value="mer">Mercoledì</option>
                  <option value="gio">Giovedì</option>
                  <option value="ven">Venerdì</option>
                  <option value="sab">Sabato</option>
                  <option value="dom">Domenica</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-app-main block mb-1">Pasto:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSchedMeal('pranzo')}
                    className={`py-2 rounded-xl border font-semibold ${
                      schedMeal === 'pranzo'
                        ? 'bg-app-primary text-white border-app-primary'
                        : 'bg-app-muted text-app-muted'
                    }`}
                  >
                    Pranzo
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchedMeal('cena')}
                    className={`py-2 rounded-xl border font-semibold ${
                      schedMeal === 'cena'
                        ? 'bg-app-primary text-white border-app-primary'
                        : 'bg-app-muted text-app-muted'
                    }`}
                  >
                    Cena
                  </button>
                </div>
              </div>

              {members.length > 1 && (
                <div>
                  <label className="font-semibold text-app-main block mb-1">Assegna a:</label>
                  <select
                    value={schedAssignee}
                    onChange={(e) => setSchedAssignee(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-app-subtle bg-app-card text-app-main outline-hidden font-semibold"
                  >
                    <option value="together">👫 Tutti Insieme</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.avatar} {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <label className="flex items-center gap-2 pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={schedIngredients}
                  onChange={(e) => setSchedIngredients(e.target.checked)}
                  className="w-4 h-4 rounded-sm text-app-primary accent-[var(--primary)]"
                />
                <span className="text-app-main">
                  Aggiungi automaticamente gli ingredienti ({scheduleRecipe.ingredients.length}) alla Lista della Spesa
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-app-subtle">
              <button
                onClick={() => setScheduleRecipe(null)}
                className="px-4 py-2 text-xs font-semibold text-app-muted hover:bg-app-muted rounded-xl"
              >
                Annulla
              </button>
              <button
                onClick={handleConfirmSchedule}
                disabled={justScheduled}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-app-primary text-white hover:opacity-90 flex items-center gap-1.5 shadow-xs"
              >
                {justScheduled ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Pianificato!</span>
                  </>
                ) : (
                  <span>Conferma e Inserisci</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Recipe Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-app-card rounded-2xl border border-app-subtle shadow-xl w-full max-w-lg overflow-hidden p-5 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-app-subtle pb-3">
              <h3 className="font-bold text-sm text-app-main flex items-center gap-2">
                {editingRecipe ? <Pencil className="w-4 h-4 text-app-primary" /> : <Plus className="w-4 h-4 text-app-primary" />}
                <span>{editingRecipe ? 'Modifica Ricetta' : 'Crea Nuova Ricetta'}</span>
              </h3>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingRecipe(null);
                }}
                className="p-1 rounded-lg text-app-muted hover:text-app-main hover:bg-app-muted cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecipeForm} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              <div>
                <label className="font-semibold text-app-main block mb-1">Nome del piatto *</label>
                <input
                  type="text"
                  required
                  placeholder="es. Orecchiette alle cime di rapa"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-app-subtle bg-app-card text-app-main outline-hidden focus:border-app-primary"
                />
              </div>

              {/* Multi-season selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-app-main block">
                    Stagionalità (puoi selezionare più stagioni)
                  </label>
                  <span className="text-[10px] text-app-muted">
                    {formSeasons.includes('all_year')
                      ? 'Disponibile tutto l\'anno'
                      : `${formSeasons.length} stagion${formSeasons.length === 1 ? 'e' : 'i'} selezionat${formSeasons.length === 1 ? 'a' : 'e'}`}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {(
                    [
                      { key: 'autumn', label: 'Autunno', icon: '🍂' },
                      { key: 'winter', label: 'Inverno', icon: '❄️' },
                      { key: 'spring', label: 'Primavera', icon: '🌸' },
                      { key: 'summer', label: 'Estate', icon: '☀️' },
                      { key: 'all_year', label: 'Tutto l\'anno', icon: '✨' },
                    ] as const
                  ).map((s) => {
                    const isSelected = formSeasons.includes(s.key);
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => toggleSeasonInForm(s.key)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-app-primary text-white border-app-primary shadow-xs'
                            : 'bg-app-muted border-app-subtle text-app-muted hover:text-app-main'
                        }`}
                      >
                        <span>{s.icon}</span>
                        <span>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-app-muted mt-1">
                  💡 Seleziona 2 o più stagioni per i piatti adatti a cavallo tra periodi (es. Autunno + Inverno) senza marcarli per tutto l'anno.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-app-main block mb-1">Portata</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-app-subtle bg-app-card text-app-main outline-hidden"
                  >
                    <option value="Primo">Primo</option>
                    <option value="Secondo">Secondo</option>
                    <option value="Piatto Unico">Piatto Unico</option>
                    <option value="Contorno">Contorno</option>
                    <option value="Lievitato">Lievitato</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-app-main block mb-1">Tempo prep.</label>
                  <input
                    type="text"
                    placeholder="es. 25 min"
                    value={formPrepTime}
                    onChange={(e) => setFormPrepTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-app-subtle bg-app-card text-app-main outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-app-main block mb-1">
                  Ingredienti concettuali (separati da virgola)
                </label>
                <textarea
                  rows={2}
                  placeholder="es. Orecchiette fresche, Cime di rapa, Acciughe sott'olio, Aglio, Peperoncino, Olio EVO"
                  value={formIngredientsStr}
                  onChange={(e) => setFormIngredientsStr(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-app-subtle bg-app-card text-app-main outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-app-main block mb-1">Note o segreto dello chef (opzionale)</label>
                <input
                  type="text"
                  placeholder="es. Saltare in padella con le acciughe sciolte..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-app-subtle bg-app-card text-app-main outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-app-subtle">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingRecipe(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-app-muted hover:bg-app-muted rounded-xl cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={!formName.trim()}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-app-primary text-white hover:opacity-90 disabled:opacity-40 shadow-xs cursor-pointer"
                >
                  {editingRecipe ? 'Salva Modifiche' : 'Salva nel Ricettario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
