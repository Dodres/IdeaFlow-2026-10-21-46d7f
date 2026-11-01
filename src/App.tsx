/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { HouseholdProvider, useHousehold } from './context/HouseholdContext.tsx';
import { Navigation, TabType } from './components/Navigation.tsx';
import { WeeklyMenuView } from './components/WeeklyMenu/WeeklyMenuView.tsx';
import { ShoppingListView } from './components/ShoppingList/ShoppingListView.tsx';
import { RecipesView } from './components/Recipes/RecipesView.tsx';
import { SettingsView } from './components/Settings/SettingsView.tsx';
import { AISuggestModal } from './components/Recipes/AISuggestModal.tsx';
import { ShareHouseholdModal } from './components/ShareHouseholdModal.tsx';
import { AuthLandingView } from './components/Auth/AuthLandingView.tsx';
import { CheckCircle2, Sparkles, X } from 'lucide-react';

function MainApp() {
  const [activeTab, setActiveTab] = useState<TabType>('menu');
  const [isAISuggestOpen, setIsAISuggestOpen] = useState(false);
  const [joinedToast, setJoinedToast] = useState<string | null>(null);
  const {
    household,
    joinHousehold,
    user,
    isAuthLoading,
    loginWithGoogle,
    loginDevMock,
    isShareModalOpen,
    setIsShareModalOpen,
  } = useHousehold();

  // Check URL query parameters for ?code=ABCDEF or ?join=ABCDEF to auto-join shared space
  const params = new URLSearchParams(window.location.search);
  const inviteCode = params.get('code') || params.get('join');

  useEffect(() => {
    if (inviteCode && user) {
      joinHousehold(inviteCode).then((ok) => {
        if (ok) {
          setJoinedToast(`Sei entrato nella casa condivisa con successo!`);
          setTimeout(() => setJoinedToast(null), 5000);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      });
    }
  }, [inviteCode, user, joinHousehold]);

  // Register service worker if available
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration skipped:', err);
      });
    }
  }, []);

  // 1. Loading Screen while checking Firebase Auth status
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-app-main flex items-center justify-center text-app-main">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-app-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-app-muted font-medium">Caricamento del tuo spazio...</span>
        </div>
      </div>
    );
  }

  // 2. Auth Landing Page if not logged in with Google
  if (!user) {
    return <AuthLandingView onLogin={loginWithGoogle} onDevLogin={loginDevMock} inviteCode={inviteCode} />;
  }

  // 3. Main Authenticated App
  return (
    <div className="min-h-screen flex flex-col bg-app-main text-app-main transition-colors selection:bg-app-primary selection:text-white">
      {/* Top Navigation */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAISuggest={() => setIsAISuggestOpen(true)}
      />

      {/* Non-intrusive joined banner toast */}
      {joinedToast && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 max-w-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <div className="text-xs font-medium">{joinedToast}</div>
          <button
            onClick={() => setJoinedToast(null)}
            className="p-1 hover:bg-emerald-700 rounded-lg text-emerald-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-4 pt-4 sm:pt-6">
        {activeTab === 'menu' && (
          <WeeklyMenuView onOpenAISuggest={() => setIsAISuggestOpen(true)} />
        )}
        {activeTab === 'shopping' && <ShoppingListView />}
        {activeTab === 'recipes' && (
          <RecipesView onOpenAISuggest={() => setIsAISuggestOpen(true)} />
        )}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Global AI Suggestion Modal */}
      <AISuggestModal
        isOpen={isAISuggestOpen}
        onClose={() => setIsAISuggestOpen(false)}
      />

      {/* Global Share & Invite Modal */}
      <ShareHouseholdModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <HouseholdProvider>
      <MainApp />
    </HouseholdProvider>
  );
}
