import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Clock,
  Check,
  ShoppingBag,
  Plus,
  BookOpen,
  Calendar,
  Flame,
  Loader2,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext.tsx';
import { SeasonalAISuggestion, Season, DayKey, MealType, Recipe } from '../../types.ts';
import { getCurrentSeason, SEASON_LABELS, getWeekDayDetails } from '../../data/initialData.ts';

interface AISuggestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_HINTS = [
  'Qualcosa di veloce (sotto i 25 min)',
  'Comfort food caldo e cremoso',
  'Opzione vegetariana leggera',
  'Piatto unico proteico e gustoso',
  'Pesce fresco di stagione',
];

const DAY_OPTIONS: { key: DayKey; label: string }[] = [
  { key: 'lun', label: 'Lunedì' },
  { key: 'mar', label: 'Martedì' },
  { key: 'mer', label: 'Mercoledì' },
  { key: 'gio', label: 'Giovedì' },
  { key: 'ven', label: 'Venerdì' },
  { key: 'sab', label: 'Sabato' },
  { key: 'dom', label: 'Domenica' },
];

export const AISuggestModal: React.FC<AISuggestModalProps> = ({ isOpen, onClose }) => {
  const {
    household,
    members,
    activeWeekId,
    addDishToSlot,
    saveRecipe,
    recordRecipePrepared,
  } = useHousehold();

  const currentSeason = getCurrentSeason();
  const [selectedSeason, setSelectedSeason] = useState<Season>(currentSeason);
  const [hint, setHint] = useState<string>('');
  const [targetDay, setTargetDay] = useState<DayKey>('mar');
  const [targetMeal, setTargetMeal] = useState<MealType>('cena');
  const [targetAssignee, setTargetAssignee] = useState<string>('together');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<SeasonalAISuggestion[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Compute recently cooked dishes to avoid repeats (within 14 days)
  const recentDishes: string[] = [];
  const now = new Date().getTime();
  for (const r of household.recipes) {
    if (r.lastPreparedDate) {
      const diffDays = Math.floor((now - new Date(r.lastPreparedDate).getTime()) / (1000 * 3600 * 24));
      if (diffDays <= 14) {
        recentDishes.push(r.name);
      }
    }
  }

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/ai/suggest-seasonal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season: selectedSeason,
          recentDishes,
          preferences: hint,
          mealType: targetMeal === 'pranzo' ? 'Pranzo' : 'Cena',
        }),
      });

      const data = await res.json();
      if (data.recipes && Array.isArray(data.recipes)) {
        setSuggestions(data.recipes);
      } else {
        throw new Error('Nessuna ricetta generata');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Impossibile generare le ricette in questo momento. Riprova tra poco.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToMenuAndShopping = async (recipe: SeasonalAISuggestion, index: number) => {
    const dishId = `ai_dish_${Date.now()}_${index}`;
    const recipeId = `rec_ai_${Date.now()}_${index}`;

    // 1. Add dish to selected slot and auto add ingredients to shopping list
    await addDishToSlot(
      activeWeekId,
      targetDay,
      targetMeal,
      targetAssignee,
      {
        id: dishId,
        name: recipe.name,
        recipeId,
        ingredients: recipe.ingredients,
      },
      true // auto add ingredients to shopping list
    );

    // 2. Also save to recipe book with today's date for freshness tracking
    const newRecipe: Recipe = {
      id: recipeId,
      name: recipe.name,
      season: recipe.season,
      category: recipe.category,
      prepTime: recipe.prepTime,
      ingredients: recipe.ingredients,
      notes: `${recipe.description} (${recipe.whySeasonal})`,
      lastPreparedDate: new Date().toISOString().split('T')[0],
    };
    await saveRecipe(newRecipe);

    setAddedIds((prev) => new Set(prev).add(recipe.name));
  };

  const handleSaveOnlyToRecipes = async (recipe: SeasonalAISuggestion) => {
    const recipeId = `rec_ai_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    const newRecipe: Recipe = {
      id: recipeId,
      name: recipe.name,
      season: recipe.season,
      category: recipe.category,
      prepTime: recipe.prepTime,
      ingredients: recipe.ingredients,
      notes: `${recipe.description} · ${recipe.whySeasonal}`,
    };
    await saveRecipe(newRecipe);
    setSavedIds((prev) => new Set(prev).add(recipe.name));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-app-card rounded-2xl border border-app-subtle shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-app-subtle flex items-center justify-between bg-gradient-to-r from-app-card to-app-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-app-primary-light text-app-primary flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-app-main tracking-tight flex items-center gap-2">
                Ispirazione & Ricette di Stagione
              </h2>
              <p className="text-xs text-app-muted">
                Motore intelligente Gemini Flash · Rispetta la stagionalità ed evita ripetizioni recenti
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-app-muted hover:text-app-main hover:bg-app-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {/* Season & Anti-Repetition Notice */}
          <div className="p-3.5 rounded-xl bg-app-muted/50 border border-app-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-app-main block">
                {SEASON_LABELS[selectedSeason].icon} Stagione selezionata: {SEASON_LABELS[selectedSeason].label}
              </span>
              <span className="text-app-muted text-[11px]">
                {recentDishes.length > 0
                  ? `Anti-ripetizione attiva: esclude ${recentDishes.length} piatti cucinati negli ultimi 14 gg.`
                  : 'Nessun piatto recente: massima varietà proposta.'}
              </span>
            </div>

            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value as Season)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-app-subtle bg-app-card text-app-main outline-hidden"
            >
              <option value="autumn">🍂 Autunno</option>
              <option value="winter">❄️ Inverno</option>
              <option value="spring">🌸 Primavera</option>
              <option value="summer">☀️ Estate</option>
              <option value="all_year">✨ Tutto l'anno</option>
            </select>
          </div>

          {/* Target destination when adding */}
          <div className="p-3.5 rounded-xl border border-app-subtle bg-app-card space-y-2.5">
            <label className="text-xs font-bold text-app-main block">
              Destinazione rapida (per "Aggiungi al Menu"):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              {/* Day */}
              <div>
                <span className="text-[11px] text-app-muted block mb-1">Giorno:</span>
                <select
                  value={targetDay}
                  onChange={(e) => setTargetDay(e.target.value as DayKey)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-app-subtle bg-app-card text-app-main font-semibold outline-hidden"
                >
                  {DAY_OPTIONS.map((d) => {
                    const detail = getWeekDayDetails(activeWeekId)[d.key];
                    return (
                      <option key={d.key} value={d.key}>
                        {d.label} {detail ? `(${detail.formattedDate})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Meal */}
              <div>
                <span className="text-[11px] text-app-muted block mb-1">Pasto:</span>
                <select
                  value={targetMeal}
                  onChange={(e) => setTargetMeal(e.target.value as MealType)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-app-subtle bg-app-card text-app-main font-semibold outline-hidden"
                >
                  <option value="pranzo">Pranzo</option>
                  <option value="cena">Cena</option>
                </select>
              </div>

              {/* Assignee */}
              {members.length > 1 && (
                <div>
                  <span className="text-[11px] text-app-muted block mb-1">Pasto per:</span>
                  <select
                    value={targetAssignee}
                    onChange={(e) => setTargetAssignee(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-app-subtle bg-app-card text-app-main font-semibold outline-hidden"
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
            </div>
          </div>

          {/* Preferences or Mood */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-app-main block">
              Preferenze o desideri (opzionale):
            </label>
            <input
              type="text"
              placeholder="es. Veloce, a base di pesce, zuppe calde, pasta sfiziosa..."
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-app-subtle bg-app-card text-app-main outline-hidden"
            />
            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PRESET_HINTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setHint(p)}
                  className="text-[11px] px-2.5 py-1 rounded-lg border border-app-subtle bg-app-muted hover:border-app-primary-border transition-colors text-app-muted hover:text-app-main cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-app-primary text-white font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-[0.99] disabled:opacity-50 shadow-sm cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Interrogo lo chef AI per questa stagione...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>
                  {suggestions.length > 0 ? 'Genera altre proposte stagionali' : 'Consigliami piatti per questa stagione'}
                </span>
              </>
            )}
          </button>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Results list */}
          {suggestions.length > 0 && (
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-app-muted">
                Proposte selezionate per te:
              </h3>

              <div className="space-y-3">
                {suggestions.map((rec, index) => {
                  const isAdded = addedIds.has(rec.name);
                  const isSaved = savedIds.has(rec.name);

                  return (
                    <div
                      key={index}
                      className="p-4 rounded-2xl border border-app-subtle bg-app-card hover:border-app-primary-border transition-all shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-app-main">
                              {rec.name}
                            </h4>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-app-primary-light text-app-primary">
                              {rec.category}
                            </span>
                          </div>
                          <p className="text-xs text-app-muted mt-1 leading-relaxed">
                            {rec.description}
                          </p>
                        </div>

                        <span className="text-xs font-semibold text-app-muted flex items-center gap-1 shrink-0 bg-app-muted px-2 py-1 rounded-lg">
                          <Clock className="w-3.5 h-3.5 text-app-primary" /> {rec.prepTime}
                        </span>
                      </div>

                      {/* Why seasonal */}
                      <div className="text-[11px] p-2 rounded-lg bg-app-muted/40 text-app-muted border border-app-subtle/50">
                        🌱 <strong className="text-app-main">Perché di stagione:</strong> {rec.whySeasonal}
                      </div>

                      {/* Conceptual ingredients */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted block mb-1">
                          Ingredienti concettuali (andranno nella spesa):
                        </span>
                        <div className="flex flex-wrap gap-1 text-[11px]">
                          {rec.ingredients.map((ing, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-app-muted text-app-main font-medium border border-app-subtle/40"
                            >
                              {ing}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-app-subtle">
                        <button
                          onClick={() => handleSaveOnlyToRecipes(rec)}
                          disabled={isSaved}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-app-subtle hover:bg-app-muted transition-colors flex items-center gap-1.5 cursor-pointer text-app-main disabled:opacity-50"
                        >
                          {isSaved ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <BookOpen className="w-3.5 h-3.5" />}
                          <span>{isSaved ? 'Salvato' : 'Salva nel Ricettario'}</span>
                        </button>

                        <button
                          onClick={() => handleAddToMenuAndShopping(rec, index)}
                          disabled={isAdded}
                          className="px-4 py-1.5 text-xs font-bold rounded-lg bg-app-primary text-white hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Aggiunto al Menu & Spesa!</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Aggiungi al Menu & Crea Spesa</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
