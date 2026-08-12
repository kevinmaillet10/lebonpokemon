import React, { useState } from 'react';
import { supabase } from './supabase';

export default function MfaSetupModal({ user, onClose, onCertified }) {
  const [step, stepSet] = useState('choice'); // 'choice', 'enroll', 'success'
  const [qrCode, qrCodeSet] = useState('');
  const [factorId, factorIdSet] = useState('');
  const [verifyCode, verifyCodeSet] = useState('');
  const [errorMsg, errorMsgSet] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStartEnrollment = async () => {
    errorMsgSet('');
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });
      if (error) throw error;

      factorIdSet(data.id);
      qrCodeSet(data.totp.qr_code);
      stepSet('enroll');
    } catch (err) {
      errorMsgSet(err.message || "Erreur lors de l'initialisation du MFA.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEnrollment = async (e) => {
    e.preventDefault();
    errorMsgSet('');
    setLoading(true);

    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factorId,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      });
      if (verifyError) throw verifyError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          is_certified: true,
          mfa_enabled: true 
        })
        .eq('id', user.id);

      if (profileError) {
        console.error("Erreur mise à jour certification profil:", profileError);
        return;
      }

      stepSet('success');
      setTimeout(() => {
        if (typeof onCertified === 'function') onCertified();
        onClose();
      }, 2000);
    } catch (err) {
      errorMsgSet("Code invalide ou erreur de synchronisation. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative text-center">
        
        {step === 'choice' && (
          <div>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              🛡️
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Sécurise ton compte vendeur</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Ton e-mail est validé et tu as obtenu le badge <strong>Vendeur vérifié</strong>. Veux-tu activer la double authentification (Google Authenticator) pour passer au statut supérieur et obtenir le badge exclusif <strong>Profil Vérifié & Certifié</strong> ?
            </p>

            {errorMsg && <div className="bg-rose-50 text-rose-600 text-xs p-3 rounded-xl mb-4 font-medium">{errorMsg}</div>}

            <div className="space-y-2.5">
              <button
                type="button"
                disabled={loading}
                onClick={handleStartEnrollment}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors text-xs cursor-pointer shadow-md disabled:opacity-50"
              >
                {loading ? 'Chargement...' : 'Oui, configurer la certification (MFA)'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-colors text-xs cursor-pointer"
              >
                Non merci, garder le badge "Vendeur vérifié"
              </button>
            </div>
          </div>
        )}

        {step === 'enroll' && (
          <form onSubmit={handleVerifyEnrollment} className="space-y-4 text-left">
            <h3 className="text-lg font-bold text-slate-800 text-center">Associer Google Authenticator</h3>
            <p className="text-xs text-slate-500 text-center">
              1. Scanne ce QR code avec ton application (Google Authenticator, Authy...) :
            </p>

            <div className="bg-slate-50 p-4 flex justify-center rounded-2xl border border-slate-200" dangerouslySetInnerHTML={{ __html: qrCode }} />

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 text-center">
                2. Entre le code à 6 chiffres
              </label>
              <input
                type="text"
                maxLength="6"
                required
                placeholder="123456"
                value={verifyCode}
                onChange={(e) => verifyCodeSet(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-center tracking-widest text-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {errorMsg && <div className="bg-rose-50 text-rose-600 text-xs p-3 rounded-xl text-center font-medium">{errorMsg}</div>}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold py-3 rounded-xl transition-colors text-xs cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Vérification...' : 'Valider et obtenir le badge Certifié'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-3 rounded-xl transition-colors text-xs cursor-pointer"
              >
                Ignorer
              </button>
            </div>
          </form>
        )}

        {step === 'success' && (
          <div className="py-6">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              🎉
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Félicitations !</h3>
            <p className="text-xs text-emerald-700 font-semibold leading-relaxed">
              Ton compte est sécurisé et ton profil arbore désormais le badge <strong>Profil Vérifié & Certifié</strong>.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}