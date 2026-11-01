import React, { useState } from 'react';
import { X, Copy, Check, Share2, MessageCircle, Users, ExternalLink, ShieldCheck } from 'lucide-react';
import { useHousehold } from '../context/HouseholdContext.tsx';

interface ShareHouseholdModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareHouseholdModal: React.FC<ShareHouseholdModalProps> = ({ isOpen, onClose }) => {
  const { household, members, user } = useHousehold();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  // Build the direct invitation link
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${origin}/?code=${encodeURIComponent(household.code)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
      prompt('Copia questo link:', shareUrl);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(household.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      prompt('Copia questo codice:', household.code);
    }
  };

  const handleShareWhatsApp = () => {
    const text = `Ciao! Entra nel nostro menù e lista della spesa "${household.name}" cliccando su questo link:\n${shareUrl}\n\nOppure inserisci il codice: ${household.code}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Menù e Spesa: ${household.name}`,
          text: `Unisciti al nostro menù e spesa condivisa per ${household.name}!`,
          url: shareUrl,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl bg-app-card border border-app-subtle shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-app-subtle bg-app-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-app-primary/15 text-app-primary flex items-center justify-center text-xl">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-app-main flex items-center gap-1.5">
                Invita Persone in Casa
              </h3>
              <p className="text-xs text-app-muted">
                Condividi per collaborare al menù e alla spesa in tempo reale
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-app-muted hover:text-app-main rounded-lg hover:bg-app-muted/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Target Household Box */}
          <div className="p-4 rounded-xl bg-app-primary/5 border border-app-primary/20 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-app-primary">
                Spazio Condiviso Attivo
              </div>
              <div className="text-lg font-bold text-app-main mt-0.5">
                {household.name}
              </div>
              <div className="text-xs text-app-muted flex items-center gap-2 mt-1">
                <span>Codice: <strong className="font-mono text-app-main tracking-wider">{household.code}</strong></span>
                <span>•</span>
                <span>{members.length} {members.length === 1 ? 'persona' : 'persone'} associate</span>
              </div>
            </div>

            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-lg border border-app-subtle bg-app-card hover:bg-app-muted text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Copia codice a 6 caratteri"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Copiato!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-app-muted" />
                  <span>Copia Codice</span>
                </>
              )}
            </button>
          </div>

          {/* Direct Link Section */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-app-muted block">
              1. Link d&apos;invito Diretto (Consigliato)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 text-xs font-mono bg-app-muted/40 border border-app-subtle rounded-xl text-app-main select-all focus:outline-hidden"
              />
              <button
                onClick={handleCopyLink}
                className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs shrink-0 ${
                  copiedLink
                    ? 'bg-emerald-600 text-white'
                    : 'bg-app-primary text-white hover:opacity-90 active:scale-95'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copiato!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copia Link</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-app-muted">
              Chiunque clicca su questo link entra automaticamente in questa casa senza dover inserire il codice manualmente.
            </p>
          </div>

          {/* Quick Sharing Channels */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-app-muted block">
              2. Condivisione Rapida
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={handleShareWhatsApp}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 text-xs font-bold transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Invia su WhatsApp</span>
              </button>

              <button
                onClick={handleNativeShare}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-app-subtle bg-app-muted/50 hover:bg-app-muted text-app-main text-xs font-bold transition-colors"
              >
                <Share2 className="w-4 h-4 text-app-primary" />
                <span>Condividi con app...</span>
              </button>
            </div>
          </div>

          {/* Cloud Sync info */}
          <div className="p-3.5 rounded-xl bg-app-muted/30 border border-app-subtle flex items-start gap-3 text-xs text-app-muted">
            <ShieldCheck className="w-4 h-4 text-app-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-app-main">
                Accesso con Google e Sincronizzazione Cloud
              </div>
              <p className="text-[11px] leading-relaxed">
                Gli utenti invitati potranno accedere con il loro account Google. La casa comparirà automaticamente nel loro elenco e ogni modifica a pasti, spesa e ricette sarà istantanea per tutti.
              </p>
            </div>
          </div>

          {/* Current Housemates list */}
          <div className="space-y-2 pt-1 border-t border-app-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-app-main flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-app-primary" />
                Persone attualmente in questa casa ({members.length}):
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {members.map((person) => (
                <div
                  key={person.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-app-subtle bg-app-card text-xs font-medium text-app-main"
                >
                  <span>{person.avatar || '👤'}</span>
                  <span>{person.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-app-subtle bg-app-muted/20 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-app-muted hover:text-app-main hover:bg-app-muted/50 transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
