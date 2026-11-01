import React, { useState } from 'react';
import {
  Users,
  Copy,
  Check,
  Palette,
  Sun,
  Moon,
  Laptop,
  Share2,
  UserCheck,
  Home,
  PlusCircle,
  KeyRound,
  Sparkles,
  Trash2,
  MapPin,
  Building,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext.tsx';
import { ColorTheme, DisplayMode } from '../../types.ts';

export const SettingsView: React.FC = () => {
  const {
    household,
    householdCode,
    members,
    savedHouseholds,
    switchHousehold,
    removeSavedHousehold,
    joinHousehold,
    createNewHousehold,
    updateHousehold,
    addMember,
    updateMember,
    removeMember,
    addHouseLocation,
    removeHouseLocation,
    currentRole,
    setCurrentRole,
    colorTheme,
    setColorTheme,
    displayMode,
    setDisplayMode,
    isConnected,
    user,
    loginWithGoogle,
    logout,
    setIsShareModalOpen,
    updateUserProfileName,
  } = useHousehold();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isEditingMemberId, setIsEditingMemberId] = useState<string | null>(null);
  const [editingMemberName, setEditingMemberName] = useState('');

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Join form state
  const [inputCode, setInputCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  // New space form state
  const [isCreatingSpace, setIsCreatingSpace] = useState(false);
  const [spaceName, setSpaceName] = useState('');
  const [customCode, setCustomCode] = useState('');

  // Add House Location state
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationIcon, setNewLocationIcon] = useState('🏠');

  const handleSetPresetMembers = async (count: 1 | 2 | 3 | 4) => {
    const primary = members[0] || {
      id: user?.uid || 'me',
      name: user?.displayName || 'Io',
      avatar: '👑',
    };
    let newMembers: any[] = [primary];
    if (count === 2) {
      newMembers.push({ id: `part_${Date.now()}`, name: 'Partner', avatar: '👩‍🌾' });
    } else if (count === 3) {
      newMembers.push(
        { id: `part_${Date.now()}`, name: 'Partner', avatar: '👩‍🌾' },
        { id: `kid_${Date.now()}`, name: 'Figlio', avatar: '👦' }
      );
    } else if (count === 4) {
      newMembers.push(
        { id: `part_${Date.now()}`, name: 'Partner', avatar: '👩‍🌾' },
        { id: `kid1_${Date.now()}`, name: 'Figlio 1', avatar: '👦' },
        { id: `kid2_${Date.now()}`, name: 'Figlia 2', avatar: '👧' }
      );
    }
    await updateHousehold((prev) => ({
      ...prev,
      members: newMembers,
    }));
  };

  const houseLocations = household.houses && household.houses.length > 0
    ? household.houses
    : [{ id: 'casa_principale', name: 'Casa', icon: '🏠' }];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(household.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/?code=${household.code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    setIsJoining(true);
    setJoinError(null);
    const success = await joinHousehold(inputCode);
    if (!success) {
      setJoinError('Codice non valido o casa non trovata. Controlla il codice.');
    } else {
      setInputCode('');
    }
    setIsJoining(false);
  };

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceName.trim()) return;
    await createNewHousehold(spaceName, customCode || undefined);
    setIsCreatingSpace(false);
    setSpaceName('');
    setCustomCode('');
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName.trim()) return;
    await addHouseLocation(newLocationName, newLocationIcon);
    setNewLocationName('');
  };

  return (
    <div className="space-y-6 pb-28 max-w-3xl mx-auto">
      {/* 0. Account Google & Cloud Sync */}
      <section className="bg-app-card rounded-2xl border border-app-subtle p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-app-subtle pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-app-primary/10 text-app-primary flex items-center justify-center font-bold">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-base text-app-main tracking-tight">
                Account Google & Accesso Multi-Utente
              </h2>
              <p className="text-xs text-app-muted">
                Sincronizza le tue case sul cloud e gestisci i membri
              </p>
            </div>
          </div>
        </div>

        {user ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-app-primary/5 border border-app-primary/20">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Google'}
                  className="w-12 h-12 rounded-full object-cover border-2 border-app-primary"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-app-primary text-white flex items-center justify-center font-bold text-lg">
                  {user.displayName?.charAt(0) || 'G'}
                </div>
              )}
              <div>
                <div className="font-bold text-sm text-app-main flex items-center gap-2">
                  {isEditingName ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        placeholder="Il tuo nome..."
                        className="px-2 py-0.5 rounded-lg border border-app-primary bg-app-card text-xs font-bold text-app-main outline-hidden"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (editedName.trim()) {
                            await updateUserProfileName(editedName);
                            setIsEditingName(false);
                          }
                        }}
                        className="p-1 rounded-md bg-app-primary text-white hover:opacity-90 cursor-pointer"
                        title="Salva nome"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingName(false)}
                        className="p-1 rounded-md bg-app-muted text-app-muted hover:text-app-main cursor-pointer"
                        title="Annulla"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span>{user.displayName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditedName(user.displayName || '');
                          setIsEditingName(true);
                        }}
                        className="p-1 rounded-md text-app-muted hover:text-app-primary hover:bg-app-primary-light transition-colors cursor-pointer"
                        title="Modifica il tuo nome visualizzato"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
                    Connesso
                  </span>
                </div>
                <div className="text-xs text-app-muted mt-0.5">{user.email}</div>
                <div className="text-[11px] text-app-muted mt-1">
                  Le tue case sono collegate e sincronizzate in tempo reale con questo account.
                </div>
              </div>
            </div>

            <button
              onClick={() => logout()}
              className="px-3.5 py-2 rounded-xl border border-app-subtle bg-app-card hover:bg-red-50 dark:hover:bg-red-950/30 text-app-muted hover:text-red-600 font-semibold text-xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              Disconnetti Account
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-app-muted/30 border border-app-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-app-muted border border-app-subtle flex items-center justify-center text-2xl shrink-0">
                👤
              </div>
              <div className="space-y-1">
                <div className="font-bold text-xs text-app-main flex items-center gap-2">
                  <span>Profilo Guest (Ospite)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-semibold">
                    Non connesso
                  </span>
                </div>
                <p className="text-xs text-app-muted max-w-lg leading-relaxed">
                  Senza effettuare l&apos;accesso il tuo avatar è <strong>Guest (👤)</strong>. Accedi con Google per salvare le case nel tuo account, ritrovarle su qualsiasi dispositivo e invitare familiari o coinquilini con un link.
                </p>
              </div>
            </div>
            <button
              onClick={() => loginWithGoogle()}
              className="px-4 py-2.5 rounded-xl bg-app-primary text-white font-bold text-xs hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer shrink-0"
            >
              <svg className="w-4 h-4 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Accedi con Google</span>
            </button>
          </div>
        )}
      </section>

      {/* 1. Spazi Condivisi & Gestione Multi-Casa */}
      <section className="bg-app-card rounded-2xl border border-app-subtle p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-app-subtle pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-app-primary-light text-app-primary flex items-center justify-center font-bold">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-app-main tracking-tight">
                Le tue Case & Spazi Condivisi
              </h2>
              <p className="text-xs text-app-muted">
                Gestisci più case o passa istantaneamente da un'abitazione all'altra
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-app-muted">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`}
            />
            <span>{isConnected ? 'Sincronizzato' : 'Connessione...'}</span>
          </div>
        </div>

        {/* Saved Houses List */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-app-muted block">
            Spazi salvati su questo telefono:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {savedHouseholds.map((h) => {
              const isCurrent = h.code === householdCode;
              return (
                <div
                  key={h.code}
                  onClick={() => !isCurrent && switchHousehold(h.code)}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    isCurrent
                      ? 'border-app-primary bg-app-primary-light shadow-xs'
                      : 'border-app-subtle bg-app-card hover:bg-app-muted'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl">🏡</span>
                    <div className="min-w-0">
                      <span className={`font-bold text-xs block truncate ${isCurrent ? 'text-app-primary' : 'text-app-main'}`}>
                        {h.name}
                      </span>
                      <span className="text-[10px] text-app-muted font-mono">{h.code}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isCurrent ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-app-primary text-white">
                        Attiva
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            switchHousehold(h.code);
                          }}
                          className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-app-muted hover:bg-app-card text-app-main border border-app-subtle"
                        >
                          Passa qui
                        </button>
                        {savedHouseholds.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSavedHousehold(h.code);
                            }}
                            className="p-1 text-app-muted hover:text-rose-600 rounded-md"
                            title="Rimuovi da questo telefono"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Active House Share Info */}
        <div className="p-4 rounded-xl bg-app-muted/50 border border-app-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-app-muted block mb-0.5">
              Codice per invitare il partner in "{household.name}":
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-2xl font-black tracking-widest text-app-primary">
                {household.code}
              </span>
              <button
                onClick={handleCopyCode}
                className="p-1.5 rounded-lg border border-app-subtle bg-app-card hover:bg-app-muted transition-colors text-app-muted hover:text-app-main cursor-pointer"
                title="Copia codice"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-app-muted mt-1">
              Condividi questo codice o link per sincronizzare questo spazio in tempo reale.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-app-primary/30 bg-app-primary/10 text-app-primary hover:bg-app-primary/20 transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Invita via Link & WhatsApp</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-app-primary text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copiato!' : 'Copia Link Diretto'}</span>
            </button>
          </div>
        </div>

        {/* Join / Create Forms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Join form */}
          <form onSubmit={handleJoin} className="p-4 rounded-xl border border-app-subtle bg-app-card space-y-2.5">
            <h3 className="font-bold text-xs text-app-main flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-app-primary" />
              <span>Collega un'altra Casa con Codice</span>
            </h3>
            <p className="text-[11px] text-app-muted">
              Inserisci il codice per aggiungere un'altra casa ai tuoi spazi:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="es. CASA02"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                maxLength={10}
                className="flex-1 px-3 py-1.5 text-xs font-mono tracking-wider rounded-lg border border-app-subtle bg-app-card text-app-main outline-hidden uppercase"
              />
              <button
                type="submit"
                disabled={!inputCode.trim() || isJoining}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-app-primary text-white hover:opacity-90 disabled:opacity-40 cursor-pointer"
              >
                Collega
              </button>
            </div>
            {joinError && (
              <span className="text-[11px] text-rose-600 block mt-1">{joinError}</span>
            )}
          </form>

          {/* Create new space */}
          <div className="p-4 rounded-xl border border-app-subtle bg-app-card flex flex-col justify-between space-y-2">
            <div>
              <h3 className="font-bold text-xs text-app-main flex items-center gap-1.5">
                <PlusCircle className="w-3.5 h-3.5 text-app-primary" />
                <span>Crea una nuova Casa / Spazio</span>
              </h3>
              <p className="text-[11px] text-app-muted mt-1">
                Aggiungi una nuova abitazione con un codice dedicato.
              </p>
            </div>
            <button
              onClick={() => setIsCreatingSpace(!isCreatingSpace)}
              className="py-1.5 px-3 text-xs font-semibold rounded-lg border border-app-subtle hover:bg-app-muted transition-colors text-app-main cursor-pointer"
            >
              {isCreatingSpace ? 'Chiudi' : 'Nuova Casa'}
            </button>
          </div>
        </div>

        {isCreatingSpace && (
          <form onSubmit={handleCreateSpace} className="p-4 rounded-xl bg-app-muted/40 border border-app-subtle space-y-3 text-xs">
            <h4 className="font-bold text-app-main">Crea Nuova Casa</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-app-muted block mb-1">Nome Casa (es. Casa Montagna)</label>
                <input
                  type="text"
                  required
                  value={spaceName}
                  onChange={(e) => setSpaceName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-app-subtle bg-app-card text-app-main outline-hidden"
                />
              </div>
              <div>
                <label className="text-[11px] text-app-muted block mb-1">Codice personalizzato (opzionale)</label>
                <input
                  type="text"
                  placeholder="Generato automaticamente se vuoto"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 rounded-lg border border-app-subtle bg-app-card text-app-main outline-hidden uppercase"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreatingSpace(false)}
                className="px-3 py-1 text-app-muted"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-app-primary text-white font-bold rounded-lg shadow-xs"
              >
                Crea Casa
              </button>
            </div>
          </form>
        )}
      </section>

      {/* 2. Abitazioni della coppia (Luoghi Pasti & Spesa) */}
      <section className="bg-app-card rounded-2xl border border-app-subtle p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-app-subtle pb-3">
          <div className="w-8 h-8 rounded-xl bg-app-primary-light text-app-primary flex items-center justify-center font-bold">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-base text-app-main tracking-tight">
              Abitazioni & Luoghi Pasti
            </h2>
            <p className="text-xs text-app-muted">
              I luoghi fisici dove si consumano i pasti (Casa principale, Casa al mare, Fuori, ecc.)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {houseLocations.map((loc) => (
            <div
              key={loc.id}
              className="p-3 rounded-xl border border-app-subtle bg-app-card flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{loc.icon}</span>
                <span className="font-bold text-xs text-app-main">{loc.name}</span>
              </div>
              {houseLocations.length > 2 && (
                <button
                  onClick={() => removeHouseLocation(loc.id)}
                  className="text-app-muted hover:text-rose-500 p-1 rounded-md"
                  title="Elimina abitazione"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add custom house location */}
        <form onSubmit={handleAddLocation} className="pt-2 border-t border-app-subtle flex gap-2 text-xs">
          <select
            value={newLocationIcon}
            onChange={(e) => setNewLocationIcon(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-app-subtle bg-app-card text-app-main outline-hidden"
          >
            <option value="🏠">🏠 Casa</option>
            <option value="🏡">🏡 Villa</option>
            <option value="🏔️">🏔️ Montagna</option>
            <option value="🏖️">🏖️ Mare</option>
            <option value="🏕️">🏕️ Rustico</option>
          </select>
          <input
            type="text"
            placeholder="Aggiungi altra casa (es. Casa Vacanze)..."
            value={newLocationName}
            onChange={(e) => setNewLocationName(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-lg border border-app-subtle bg-app-card text-app-main outline-hidden"
          />
          <button
            type="submit"
            disabled={!newLocationName.trim()}
            className="px-3 py-1.5 bg-app-primary text-white font-bold rounded-lg shadow-xs disabled:opacity-40 cursor-pointer"
          >
            Aggiungi
          </button>
        </form>
      </section>

      {/* 3. Persone Associate a questa Casa (1, 2, o più persone) */}
      <section className="bg-app-card rounded-2xl border border-app-subtle p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-app-subtle pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-app-primary-light text-app-primary flex items-center justify-center font-bold">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-app-main tracking-tight">
                Persone Associate a questa Casa ({members.length})
              </h2>
              <p className="text-xs text-app-muted">
                Gestisci chi vive o mangia in questa casa (1 persona, coppia o gruppo)
              </p>
            </div>
          </div>
        </div>

        {/* Preset Member Templates */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-app-muted block">
            Imposta velocemente le persone di questa casa:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleSetPresetMembers(1)}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                members.length === 1
                  ? 'border-app-primary bg-app-primary-light text-app-primary font-bold shadow-xs'
                  : 'border-app-subtle bg-app-card hover:bg-app-muted text-app-main'
              }`}
            >
              <div className="text-lg">👤</div>
              <div className="text-xs font-bold mt-1">1 Persona</div>
              <div className="text-[10px] text-app-muted font-normal">Nessun "insieme/separati"</div>
            </button>

            <button
              type="button"
              onClick={() => handleSetPresetMembers(2)}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                members.length === 2
                  ? 'border-app-primary bg-app-primary-light text-app-primary font-bold shadow-xs'
                  : 'border-app-subtle bg-app-card hover:bg-app-muted text-app-main'
              }`}
            >
              <div className="text-lg">👫</div>
              <div className="text-xs font-bold mt-1">2 Persone</div>
              <div className="text-[10px] text-app-muted font-normal">Insieme o Separati</div>
            </button>

            <button
              type="button"
              onClick={() => handleSetPresetMembers(3)}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                members.length === 3
                  ? 'border-app-primary bg-app-primary-light text-app-primary font-bold shadow-xs'
                  : 'border-app-subtle bg-app-card hover:bg-app-muted text-app-main'
              }`}
            >
              <div className="text-lg">👨‍👩‍👧</div>
              <div className="text-xs font-bold mt-1">3 Persone</div>
              <div className="text-[10px] text-app-muted font-normal">1 solo + 2 insieme, ecc.</div>
            </button>

            <button
              type="button"
              onClick={() => handleSetPresetMembers(4)}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                members.length === 4
                  ? 'border-app-primary bg-app-primary-light text-app-primary font-bold shadow-xs'
                  : 'border-app-subtle bg-app-card hover:bg-app-muted text-app-main'
              }`}
            >
              <div className="text-lg">👨‍👩‍👧‍👦</div>
              <div className="text-xs font-bold mt-1">4 Persone</div>
              <div className="text-[10px] text-app-muted font-normal">A due a due, 3+1, tutti soli</div>
            </button>
          </div>
        </div>

        {/* Dynamic explanation banner */}
        <div className="p-3.5 rounded-xl bg-app-muted/50 border border-app-subtle text-xs text-app-muted space-y-1.5">
          <span className="font-bold text-app-main block">
            💡 Come funziona il Menu in base alle persone associate:
          </span>
          {members.length === 1 && (
            <p className="text-app-main font-medium">
              👉 <strong>1 persona associata ({members[0]?.name}):</strong> Nel menu <strong>non compare alcuna opzione "insieme/separata"</strong>. Pianifichi direttamente i tuoi piatti personali in modo pulito e immediato.
            </p>
          )}
          {members.length === 2 && (
            <p className="text-app-main font-medium">
              👉 <strong>2 persone associate ({members.map((m) => m.name).join(' e ')}):</strong> Per ciascun pasto puoi decidere con un tap tra <strong>👫 Insieme</strong> (un unico piatto condiviso) oppure <strong>🔀 Pasti Separati</strong> (colonne distinte per ciascuno).
            </p>
          )}
          {members.length >= 3 && (
            <p className="text-app-main font-medium">
              👉 <strong>{members.length} persone associate:</strong> Puoi creare liberamente gli insiemi che vuoi per ogni pasto! Ad esempio se sono 3: <strong>1 mangia sola e 2 mangiano insieme</strong>, oppure tutti soli o tutti insieme. Se sono 4: <strong>a due a due (2+2)</strong>, <strong>3 insieme e 1 sola</strong>, <strong>tutti soli (1+1+1+1)</strong> o <strong>tutti insieme (4)</strong>!
            </p>
          )}
        </div>

        {/* Current Members Cards */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-app-main block">
            Chi usa questo smartphone adesso:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {!user && (
              <div
                onClick={() => setCurrentRole('guest')}
                className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  currentRole === 'guest'
                    ? 'border-app-primary bg-app-primary-light shadow-xs'
                    : 'border-app-subtle bg-app-card hover:bg-app-muted'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl">👤</span>
                  <div className="min-w-0">
                    <span className={`font-bold text-xs block truncate ${currentRole === 'guest' ? 'text-app-primary' : 'text-app-main'}`}>
                      Guest (Ospite)
                    </span>
                    <span className="text-[10px] text-app-muted">
                      {currentRole === 'guest' ? 'Avatar attivo senza login' : 'Tocca per usare come Guest'}
                    </span>
                  </div>
                </div>
                {currentRole === 'guest' && (
                  <span className="w-5 h-5 rounded-full bg-app-primary text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            )}
            {members.map((person) => {
              const isActive = currentRole === person.id;
              return (
                <div
                  key={person.id}
                  onClick={() => setCurrentRole(person.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    isActive
                      ? 'border-app-primary bg-app-primary-light shadow-xs'
                      : 'border-app-subtle bg-app-card hover:bg-app-muted'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-2xl">{person.avatar}</span>
                    <div className="min-w-0 flex-1">
                      {isEditingMemberId === person.id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingMemberName}
                            onChange={(e) => setEditingMemberName(e.target.value)}
                            className="px-2 py-0.5 rounded border border-app-primary bg-app-card text-xs font-bold text-app-main outline-hidden w-28"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              if (editingMemberName.trim()) {
                                await updateMember(person.id, editingMemberName);
                                if (person.id === user?.uid) {
                                  await updateUserProfileName(editingMemberName);
                                }
                                setIsEditingMemberId(null);
                              }
                            }}
                            className="p-1 rounded bg-app-primary text-white cursor-pointer"
                            title="Salva"
                          >
                            <Save className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingMemberId(null)}
                            className="p-1 rounded bg-app-muted text-app-muted cursor-pointer"
                            title="Annulla"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold text-xs truncate ${isActive ? 'text-app-primary' : 'text-app-main'}`}>
                            {person.name}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsEditingMemberId(person.id);
                              setEditingMemberName(person.name);
                            }}
                            className="p-1 text-app-muted hover:text-app-primary rounded cursor-pointer transition-colors"
                            title="Modifica nome persona"
                          >
                            <Edit2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                      <span className="text-[10px] text-app-muted block">
                        {isActive ? 'Attivo su questo telefono' : 'Tocca per attivare'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isActive ? (
                      <span className="w-5 h-5 rounded-full bg-app-primary text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      members.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeMember(person.id);
                          }}
                          className="p-1.5 text-app-muted hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          title="Rimuovi persona da questa casa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Person Form */}
        <div className="pt-3 border-t border-app-subtle space-y-2">
          <span className="text-xs font-bold text-app-main block">
            Aggiungi un'altra persona a questa casa:
          </span>
          <AddMemberForm onAdd={addMember} />
        </div>
      </section>

      {/* 4. Personalizzazione del Tema & Colori (Look & Feel) */}
      <section className="bg-app-card rounded-2xl border border-app-subtle p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-app-subtle pb-3">
          <div className="w-8 h-8 rounded-xl bg-app-primary-light text-app-primary flex items-center justify-center font-bold">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-base text-app-main tracking-tight">
              Personalizzazione Tema & Colori
            </h2>
            <p className="text-xs text-app-muted">
              Preferenza salvata sul dispositivo (ognuno può avere la propria!)
            </p>
          </div>
        </div>

        {/* Display Mode (Light / Dark / Auto) */}
        <div>
          <label className="text-xs font-bold text-app-main block mb-2">
            Modalità Display:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setDisplayMode('light')}
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                displayMode === 'light'
                  ? 'border-app-primary bg-app-primary-light text-app-primary shadow-xs'
                  : 'border-app-subtle bg-app-card text-app-muted hover:text-app-main'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>Chiaro</span>
            </button>

            <button
              type="button"
              onClick={() => setDisplayMode('dark')}
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                displayMode === 'dark'
                  ? 'border-app-primary bg-app-primary-light text-app-primary shadow-xs'
                  : 'border-app-subtle bg-app-card text-app-muted hover:text-app-main'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>Scuro</span>
            </button>

            <button
              type="button"
              onClick={() => setDisplayMode('auto')}
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                displayMode === 'auto'
                  ? 'border-app-primary bg-app-primary-light text-app-primary shadow-xs'
                  : 'border-app-subtle bg-app-card text-app-muted hover:text-app-main'
              }`}
            >
              <Laptop className="w-4 h-4" />
              <span>Sistema</span>
            </button>
          </div>
        </div>

        {/* Accent Palettes (Salvia, Terracotta, Mirtillo, Avocado, Slate) */}
        <div>
          <label className="text-xs font-bold text-app-main block mb-2">
            Tavolozze di Colore (Accent Palette):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Salvia */}
            <button
              type="button"
              onClick={() => setColorTheme('salvia')}
              className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                colorTheme === 'salvia'
                  ? 'border-[#446850] bg-[#EBF2EC] dark:bg-[#1D2A22] shadow-xs'
                  : 'border-app-subtle bg-app-card hover:bg-app-muted/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#446850] flex items-center justify-center text-white text-xs">
                  🌿
                </div>
                <div>
                  <span className="font-bold text-xs text-app-main block">
                    Verde Salvia / Fresh
                  </span>
                  <span className="text-[10px] text-app-muted">
                    Rilassante, ideale per cibo & ortofrutta
                  </span>
                </div>
              </div>
              {colorTheme === 'salvia' && <Check className="w-4 h-4 text-[#446850]" />}
            </button>

            {/* Terracotta */}
            <button
              type="button"
              onClick={() => setColorTheme('terracotta')}
              className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                colorTheme === 'terracotta'
                  ? 'border-[#BC5434] bg-[#FBEFEA] dark:bg-[#2E1B15] shadow-xs'
                  : 'border-app-subtle bg-app-card hover:bg-app-muted/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#BC5434] flex items-center justify-center text-white text-xs">
                  🏺
                </div>
                <div>
                  <span className="font-bold text-xs text-app-main block">
                    Terracotta / Warm
                  </span>
                  <span className="text-[10px] text-app-muted">
                    Caldo, accogliente e vivace
                  </span>
                </div>
              </div>
              {colorTheme === 'terracotta' && <Check className="w-4 h-4 text-[#BC5434]" />}
            </button>

            {/* Mirtillo */}
            <button
              type="button"
              onClick={() => setColorTheme('mirtillo')}
              className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                colorTheme === 'mirtillo'
                  ? 'border-[#295384] bg-[#EDF3FA] dark:bg-[#152233] shadow-xs'
                  : 'border-app-subtle bg-app-card hover:bg-app-muted/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#295384] flex items-center justify-center text-white text-xs">
                  🫐
                </div>
                <div>
                  <span className="font-bold text-xs text-app-main block">
                    Mirtillo / Deep Blue
                  </span>
                  <span className="text-[10px] text-app-muted">
                    Moderno, pulito e minimale
                  </span>
                </div>
              </div>
              {colorTheme === 'mirtillo' && <Check className="w-4 h-4 text-[#295384]" />}
            </button>

            {/* Avocado */}
            <button
              type="button"
              onClick={() => setColorTheme('avocado')}
              className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                colorTheme === 'avocado'
                  ? 'border-[#596B36] bg-[#F0F4E8] dark:bg-[#232B16] shadow-xs'
                  : 'border-app-subtle bg-app-card hover:bg-app-muted/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#596B36] flex items-center justify-center text-white text-xs">
                  🥑
                </div>
                <div>
                  <span className="font-bold text-xs text-app-main block">
                    Avocado / Olive
                  </span>
                  <span className="text-[10px] text-app-muted">
                    Toni naturali ed eleganti
                  </span>
                </div>
              </div>
              {colorTheme === 'avocado' && <Check className="w-4 h-4 text-[#596B36]" />}
            </button>

            {/* Slate */}
            <button
              type="button"
              onClick={() => setColorTheme('slate')}
              className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer sm:col-span-2 ${
                colorTheme === 'slate'
                  ? 'border-[#334155] bg-[#F1F5F9] dark:bg-[#1E293B] shadow-xs'
                  : 'border-app-subtle bg-app-card hover:bg-app-muted/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#334155] flex items-center justify-center text-white text-xs">
                  🪨
                </div>
                <div>
                  <span className="font-bold text-xs text-app-main block">
                    Monocromatico / Slate
                  </span>
                  <span className="text-[10px] text-app-muted">
                    Essenziale, neutro ad alto contrasto
                  </span>
                </div>
              </div>
              {colorTheme === 'slate' && <Check className="w-4 h-4 text-[#334155]" />}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

interface AddMemberFormProps {
  onAdd: (name: string, avatar?: string) => Promise<void>;
}

const AddMemberForm: React.FC<AddMemberFormProps> = ({ onAdd }) => {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🧑');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const AVATAR_OPTIONS = ['👨‍🍳', '👩‍🌾', '🧑', '👧', '👦', '👵', '👴', '👤', '🐱'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAdd(name.trim(), avatar);
      setName('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 text-xs">
      <div className="flex gap-1.5 items-center">
        <select
          value={avatar}
          onChange={(e) => setAvatar(e.target.value)}
          className="px-2 py-2 rounded-xl border border-app-subtle bg-app-card text-base outline-hidden cursor-pointer"
        >
          {AVATAR_OPTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Nome (es. Marco, Sofia...)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 sm:w-48 px-3 py-2 rounded-xl border border-app-subtle bg-app-card text-app-main outline-hidden"
        />
      </div>
      <button
        type="submit"
        disabled={!name.trim() || isSubmitting}
        className="px-4 py-2 bg-app-primary text-white font-bold rounded-xl shadow-xs disabled:opacity-40 hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-1.5"
      >
        <span>+ Aggiungi Persona</span>
      </button>
    </form>
  );
};

