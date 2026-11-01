import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  ShoppingCart,
  BookOpen,
  Settings,
  Users,
  Sparkles,
  RefreshCw,
  Home,
  ChevronDown,
  Plus,
  KeyRound,
  Check,
  X,
  Share2,
  LogIn,
  LogOut,
} from 'lucide-react';
import { useHousehold } from '../context/HouseholdContext.tsx';

export type TabType = 'menu' | 'shopping' | 'recipes' | 'settings';

interface NavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenAISuggest: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  onOpenAISuggest,
}) => {
  const {
    household,
    householdCode,
    savedHouseholds,
    switchHousehold,
    createNewHousehold,
    joinHousehold,
    currentRole,
    members,
    isConnected,
    isSyncing,
    user,
    loginWithGoogle,
    logout,
    setIsShareModalOpen,
  } = useHousehold();

  const [isHouseMenuOpen, setIsHouseMenuOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [newHouseName, setNewHouseName] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsHouseMenuOpen(false);
      }
    };
    if (isHouseMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isHouseMenuOpen]);

  const pendingShoppingCount = household.shoppingList.filter((i) => !i.isDone).length;
  const isGuest = !user;
  const currentPerson = members.find((m) => m.id === currentRole);
  const currentUserName = isGuest
    ? 'Guest'
    : (user?.displayName?.split(' ')[0] || currentPerson?.name || 'Utente');
  const currentUserAvatar = isGuest ? '👤' : (currentPerson?.avatar || '👨‍🍳');

  const handleSelectHouse = async (code: string) => {
    setIsHouseMenuOpen(false);
    if (code !== householdCode) {
      await switchHousehold(code);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    setJoinError(null);
    const ok = await joinHousehold(joinCodeInput);
    if (ok) {
      setIsJoinModalOpen(false);
      setIsHouseMenuOpen(false);
      setJoinCodeInput('');
    } else {
      setJoinError('Codice non valido o casa non trovata.');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHouseName.trim()) return;
    await createNewHousehold(newHouseName);
    setIsCreateModalOpen(false);
    setIsHouseMenuOpen(false);
    setNewHouseName('');
  };

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-app-card border-b border-app-subtle transition-colors shadow-xs">
        <div className="max-w-5xl mx-auto px-4 h-15 flex items-center justify-between">
          {/* Left: House Switcher Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsHouseMenuOpen(!isHouseMenuOpen)}
              className="flex items-center gap-2.5 p-1.5 -ml-1.5 rounded-xl hover:bg-app-muted transition-colors cursor-pointer group text-left"
              title="Cambia casa o aggiungi una nuova abitazione"
            >
              <div className="w-9 h-9 rounded-xl bg-app-primary text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                🏠
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="font-bold text-sm sm:text-base tracking-tight text-app-main leading-tight group-hover:text-app-primary transition-colors">
                    {household.name}
                  </h1>
                  <ChevronDown className={`w-3.5 h-3.5 text-app-muted transition-transform duration-200 ${isHouseMenuOpen ? 'rotate-180' : ''}`} />
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-app-muted">
                  <span className="font-mono">{household.code}</span>
                  <span>·</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                    }`}
                  />
                  <span>{isConnected ? 'Sincronizzato' : 'Connessione...'}</span>
                  {isSyncing && (
                    <RefreshCw className="w-2.5 h-2.5 animate-spin text-app-primary" />
                  )}
                </div>
              </div>
            </button>

            {/* Dropdown Menu for Multiple Houses */}
            {isHouseMenuOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl bg-app-card border border-app-subtle shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-app-muted border-b border-app-subtle flex items-center justify-between">
                  <span>Le tue Case & Spazi</span>
                  <span className="font-normal text-[10px]">{savedHouseholds.length} salvate</span>
                </div>

                <div className="max-h-56 overflow-y-auto py-1 space-y-1">
                  {savedHouseholds.map((h) => {
                    const isCurrent = h.code === householdCode;
                    return (
                      <button
                        key={h.code}
                        onClick={() => handleSelectHouse(h.code)}
                        className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer text-xs ${
                          isCurrent
                            ? 'bg-app-primary-light text-app-primary font-bold'
                            : 'hover:bg-app-muted text-app-main font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base">🏡</span>
                          <div className="min-w-0">
                            <span className="block truncate">{h.name}</span>
                            <span className="text-[10px] text-app-muted font-mono">{h.code}</span>
                          </div>
                        </div>
                        {isCurrent && <Check className="w-4 h-4 text-app-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Add or Join House Actions */}
                <div className="pt-2 border-t border-app-subtle space-y-1 text-xs">
                  <button
                    onClick={() => {
                      setIsHouseMenuOpen(false);
                      setIsJoinModalOpen(true);
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-app-muted text-app-main flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <KeyRound className="w-4 h-4 text-app-primary" />
                    <span>Collega un'altra Casa con codice</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsHouseMenuOpen(false);
                      setIsCreateModalOpen(true);
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-app-muted text-app-main flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <Plus className="w-4 h-4 text-app-primary" />
                    <span>Crea una nuova Casa</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Header items */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Share / Invite button */}
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg border border-app-primary/30 bg-app-primary/10 text-app-primary hover:bg-app-primary/20 transition-colors active:scale-95 cursor-pointer shadow-xs"
              title="Invita persone e condividi questa casa tramite link o codice"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Invita / Link</span>
            </button>

            {/* AI Inspiration button */}
            <button
              onClick={onOpenAISuggest}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg bg-app-primary-light text-app-primary hover:opacity-90 transition-opacity active:scale-95 cursor-pointer shadow-xs"
              title="Consigliami ricette di stagione con AI"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Ispirazione AI</span>
            </button>

            {/* Google User or Sign-in button */}
            {user ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab('settings')}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-app-subtle bg-app-card hover:bg-app-muted transition-colors text-xs font-medium text-app-main cursor-pointer"
                  title={`Connesso con Google: ${user.email}. Clicca per impostazioni.`}
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Google'}
                      className="w-4 h-4 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-app-primary">
                      {user.displayName?.charAt(0) || 'G'}
                    </span>
                  )}
                  <span className="font-semibold hidden lg:inline truncate max-w-[100px]">
                    {user.displayName?.split(' ')[0] || 'Account'}
                  </span>
                </button>
                <button
                  onClick={() => logout()}
                  className="p-1.5 rounded-lg border border-app-subtle bg-app-card hover:bg-red-50 dark:hover:bg-red-950/30 text-app-muted hover:text-red-600 transition-colors"
                  title="Disconnetti Google"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => loginWithGoogle()}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-app-subtle bg-app-card hover:bg-app-muted transition-colors text-xs font-semibold text-app-main cursor-pointer shadow-xs active:scale-95"
                title="Accedi con il tuo account Google per salvare e sincronizzare le tue case"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="hidden sm:inline">Accedi con Google</span>
                <span className="sm:hidden">Accedi</span>
              </button>
            )}

            {/* Profile indication badge */}
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors text-xs font-medium cursor-pointer ${
                isGuest
                  ? 'border-dashed border-app-subtle bg-app-card text-app-muted hover:text-app-main hover:bg-app-muted'
                  : 'border-app-subtle bg-app-card text-app-main hover:bg-app-muted'
              }`}
              title={
                isGuest
                  ? 'Accesso Ospite (Guest): accedi con Google per sincronizzare e salvare le tue case'
                  : `Profilo: ${currentUserName}. Clicca per impostazioni.`
              }
            >
              <span className="text-sm">{currentUserAvatar}</span>
              <span className="font-semibold hidden sm:inline">{currentUserName}</span>
              {isGuest && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-app-muted text-app-muted font-bold hidden md:inline">
                  Ospite
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Desktop Navigation Tabs */}
      <nav className="hidden md:block bg-app-card border-b border-app-subtle">
        <div className="max-w-5xl mx-auto px-4 flex gap-8">
          <button
            onClick={() => setActiveTab('menu')}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'menu'
                ? 'border-app-primary text-app-primary'
                : 'border-transparent text-app-muted hover:text-app-main'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Menu Settimanale</span>
          </button>

          <button
            onClick={() => setActiveTab('shopping')}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'shopping'
                ? 'border-app-primary text-app-primary'
                : 'border-transparent text-app-muted hover:text-app-main'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Lista della Spesa</span>
            {pendingShoppingCount > 0 && (
              <span className="text-xs px-2 py-0.2 rounded-full bg-app-primary text-white font-medium">
                {pendingShoppingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('recipes')}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'recipes'
                ? 'border-app-primary text-app-primary'
                : 'border-transparent text-app-muted hover:text-app-main'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Ricettario & Stagione</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'settings'
                ? 'border-app-primary text-app-primary'
                : 'border-transparent text-app-muted hover:text-app-main'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Spazio & Case</span>
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-app-card border-t border-app-subtle pb-safe shadow-lg">
        <div className="grid grid-cols-4 h-16">
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'menu' ? 'text-app-primary' : 'text-app-muted hover:text-app-main'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[11px] font-medium">Menu</span>
          </button>

          <button
            onClick={() => setActiveTab('shopping')}
            className={`relative flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'shopping' ? 'text-app-primary' : 'text-app-muted hover:text-app-main'
            }`}
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              {pendingShoppingCount > 0 && (
                <span className="absolute -top-1.5 -right-2 text-[10px] w-4 h-4 rounded-full bg-app-primary text-white flex items-center justify-center font-bold">
                  {pendingShoppingCount > 9 ? '9+' : pendingShoppingCount}
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium">Spesa</span>
          </button>

          <button
            onClick={() => setActiveTab('recipes')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'recipes' ? 'text-app-primary' : 'text-app-muted hover:text-app-main'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[11px] font-medium">Ricette</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'settings' ? 'text-app-primary' : 'text-app-muted hover:text-app-main'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[11px] font-medium">Spazio</span>
          </button>
        </div>
      </nav>

      {/* Modal: Join House by Code */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-app-card rounded-2xl border border-app-subtle shadow-xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-app-subtle pb-3">
              <h3 className="font-bold text-sm text-app-main flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-app-primary" />
                <span>Collega un'altra Casa</span>
              </h3>
              <button
                onClick={() => setIsJoinModalOpen(false)}
                className="p-1 rounded-lg text-app-muted hover:text-app-main"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleJoinSubmit} className="space-y-3 text-xs">
              <p className="text-app-muted">
                Inserisci il codice a 6 caratteri dell'altra casa (es. inviato dal partner o da un'altra abitazione):
              </p>
              <input
                type="text"
                required
                autoFocus
                placeholder="es. CASA02"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-sm font-mono tracking-wider uppercase rounded-xl border border-app-subtle bg-app-card text-app-main outline-hidden"
              />
              {joinError && <p className="text-rose-600 text-[11px]">{joinError}</p>}

              <div className="flex justify-end gap-2 pt-2 border-t border-app-subtle">
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  className="px-3 py-1.5 text-app-muted hover:bg-app-muted rounded-lg"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-app-primary text-white font-bold rounded-lg shadow-xs"
                >
                  Collega Casa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create New House */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-app-card rounded-2xl border border-app-subtle shadow-xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-app-subtle pb-3">
              <h3 className="font-bold text-sm text-app-main flex items-center gap-2">
                <Plus className="w-4 h-4 text-app-primary" />
                <span>Crea Nuova Casa / Spazio</span>
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-app-muted hover:text-app-main"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-app-main block mb-1">
                  Nome della Casa
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="es. Casa Nostra, Casa al Mare..."
                  value={newHouseName}
                  onChange={(e) => setNewHouseName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-app-subtle bg-app-card text-app-main outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-app-subtle">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 text-app-muted hover:bg-app-muted rounded-lg"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={!newHouseName.trim()}
                  className="px-4 py-1.5 bg-app-primary text-white font-bold rounded-lg shadow-xs disabled:opacity-40"
                >
                  Crea Casa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
