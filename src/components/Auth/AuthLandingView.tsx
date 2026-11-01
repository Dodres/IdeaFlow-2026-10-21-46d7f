import React, { useState } from 'react';
import { Calendar, ShoppingCart, Users, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

interface AuthLandingViewProps {
  onLogin: () => Promise<void>;
  onDevLogin?: (name?: string) => Promise<void>;
  inviteCode?: string | null;
}

export const AuthLandingView: React.FC<AuthLandingViewProps> = ({ onLogin, onDevLogin, inviteCode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      setLoginError(null);
      await onLogin();
    } catch (err: any) {
      console.error('Login error full object:', err);
      const code = err?.code || '';
      const msg = err?.message || '';
      if (code === 'auth/popup-closed-by-user') {
        setLoginError('Finestra di accesso chiusa prima del completamento.');
      } else if (code === 'auth/unauthorized-domain') {
        setLoginError(`Dominio non autorizzato su Firebase Auth (${window.location.hostname}).`);
      } else if (code === 'auth/popup-blocked') {
        setLoginError('Il browser ha bloccato il popup di accesso. Abilita i popup e riprova.');
      } else {
        setLoginError(`Errore di accesso [${code || 'sconosciuto'}]: ${msg || 'Controlla la console del browser'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-main flex flex-col justify-between text-app-main selection:bg-app-primary selection:text-white">
      {/* Top Brand Bar */}
      <header className="border-b border-app-subtle bg-app-card/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-app-primary text-white flex items-center justify-center font-bold text-lg shadow-sm">
              🍽️
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-app-main block leading-tight">
                Menu Settimanale
              </span>
              <span className="text-[11px] text-app-muted font-medium">
                Organizzazione & Spesa di Casa
              </span>
            </div>
          </div>

          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-app-subtle bg-app-card hover:bg-app-muted text-xs font-semibold text-app-main transition-colors shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Accedi</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-16 flex-1 flex flex-col justify-center">
        {/* If user arrived with an invite code link */}
        {inviteCode && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-3.5 shadow-sm">
            <span className="text-2xl">💌</span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
                Sei stato invitato a unirti a una casa!
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                Codice invito: <strong className="font-mono tracking-wider">{inviteCode}</strong>. Accedi con Google per entrare direttamente nel menu condiviso.
              </div>
            </div>
          </div>
        )}

        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-app-primary-light text-app-primary text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pianificazione pasti intelligente & collaborativa</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-app-main tracking-tight leading-tight">
            La gestione del menu di casa, finalmente semplice.
          </h1>

          <p className="text-sm sm:text-base text-app-muted leading-relaxed">
            Pianifica i pranzi e le cene della settimana, gestisci chi mangia insieme o separato (coppia, figli o coinquilini) e genera la lista della spesa automaticamente.
          </p>

          {/* Call to action box */}
          <div className="pt-4 flex flex-col items-center gap-3">
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-app-primary text-white font-bold text-sm sm:text-base hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center justify-center gap-3 cursor-pointer group"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 shrink-0 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              )}
              <span>Inizia subito con Google</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            {loginError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{loginError}</p>
            )}

            {onDevLogin && (
              <div className="pt-2 border-t border-app-subtle/60 w-full flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onDevLogin()}
                  className="text-xs text-app-muted hover:text-app-main underline underline-offset-2 transition-colors cursor-pointer"
                >
                  ⚡ Oppure prova subito come nuovo utente (Test rapido)
                </button>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-app-muted">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Gratuito, nessun dato venduto, sincronizzato nel tuo cloud personale.</span>
            </div>
          </div>
        </div>

        {/* 3 Pillars Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-12">
          <div className="p-5 rounded-2xl bg-app-card border border-app-subtle shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-app-primary-light text-app-primary flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-sm text-app-main">Menu Personale o Condiviso</h2>
            <p className="text-xs text-app-muted leading-relaxed">
              Hai il tuo menu indipendente per la settimana. Scegli se mangiare insieme o preparare piatti diversi quando qualcuno è a dieta, al lavoro o ha gusti differenti.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-app-card border border-app-subtle shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-sm text-app-main">Aggiungi Famiglia & Ospiti</h2>
            <p className="text-xs text-app-muted leading-relaxed">
              Invita il tuo partner con un link WhatsApp, oppure inserisci manualmente i figli o altri conviventi per tracciare chi siede a tavola ogni giorno.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-app-card border border-app-subtle shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-sm text-app-main">Spesa Sincronizzata</h2>
            <p className="text-xs text-app-muted leading-relaxed">
              Gli ingredienti dei piatti pianificati finiscono direttamente nella lista della spesa, organizzati per reparto (ortofrutta, macelleria, latticini).
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-app-subtle py-4 text-center text-xs text-app-muted">
        Menu Settimanale © {new Date().getFullYear()} — La tua cucina organizzata
      </footer>
    </div>
  );
};
