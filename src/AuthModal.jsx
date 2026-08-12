import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [departmentCode, setDepartmentCode] = useState('');
  
  const [isMfaStep, setIsMfaStep] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState('');

  const [acceptCharter, setAcceptCharter] = useState(false);

  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Récupérer l'e-mail sauvegardé au chargement si "Se souvenir de moi" était actif
  useEffect(() => {
    const savedEmail = localStorage.getItem('saved_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (isMfaStep) {
      setLoading(true);
      try {
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ 
          factorId: mfaFactorId 
        });
        if (challengeError) throw challengeError;

        const { error: verifyError } = await supabase.auth.mfa.verify({
          factorId: mfaFactorId,
          challengeId: challengeData.id,
          code: mfaCode,
        });
        if (verifyError) throw verifyError;

        if (typeof onSuccess === 'function') onSuccess();
        if (typeof onClose === 'function') onClose();
      } catch (err) {
        console.error("Erreur Auth:", err);
        
        let message = '';
        if (typeof err === 'string') {
          message = err;
        } else if (err?.message) {
          message = err.message;
        } else if (err?.error_description) {
          message = err.error_description;
        } else {
          message = "Une erreur est survenue lors de la communication avec le serveur.";
        }

        if (
          message.includes('already registered') || 
          message.includes('User already registered') ||
          message.includes('already exists')
        ) {
          setErrorMsg("Cette adresse mail est déjà utilisée.");
        } else {
          setErrorMsg(message);
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    if (isSignUp && !acceptCharter) {
      setErrorMsg("Tu dois accepter la charte de sécurité anti-arnaque pour t'inscrire.");
      return;
    }

    setLoading(true);

    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setSuccessMsg('Si un compte est associé à cet e-mail, un lien de réinitialisation a été envoyé.');
      } else if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
              department_code: departmentCode,
            }
          }
        });

        if (error) throw error;

        if (data?.user && data.user.identities && data.user.identities.length === 0) {
          throw new Error("Cette adresse mail est déjà utilisée.");
        }

        setSuccessMsg('Compte créé avec succès ! Vérifie tes e-mails pour valider ton compte, puis connecte-toi.');
        setIsSignUp(false);
        setAcceptCharter(false);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Gestion de la case "Se souvenir de moi"
        if (rememberMe) {
          localStorage.setItem('saved_email', email);
        } else {
          localStorage.removeItem('saved_email');
        }

        const { data: assurLevel, error: assurError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (!assurError && assurLevel && assurLevel.nextLevel === 'aal2' && assurLevel.currentLevel !== 'aal2') {
          const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
          if (factorsError) throw factorsError;

          const totpFactor = factors?.totp.find(f => f.status === 'verified');
          if (totpFactor) {
            setMfaFactorId(totpFactor.id);
            setIsMfaStep(true);
            setLoading(false);
            return;
          }
        }

        if (typeof onSuccess === 'function') {
          onSuccess(data);
        }

        if (typeof onClose === 'function') {
          onClose();
        }
      }
    } catch (err) {
      console.error("Erreur Auth:", err);
      
      let message = '';
      if (typeof err === 'string') {
        message = err;
      } else if (err?.message) {
        message = err.message;
      } else if (err?.error_description) {
        message = err.error_description;
      }

      if (!message || message.trim() === '') {
        message = "Erreur serveur (500). Vérifie ton trigger de création d'utilisateur ou ta table profiles dans Supabase.";
      }

      if (
        message.includes('already registered') || 
        message.includes('User already registered') ||
        message.includes('already exists')
      ) {
        setErrorMsg("Cette adresse mail est déjà utilisée.");
      } else {
        setErrorMsg(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
        
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          ✕
        </button>

        <h2 className="text-2xl font-black text-slate-800 mb-2">
          {isMfaStep 
            ? 'Double Authentification' 
            : isForgotPassword 
            ? 'Récupération' 
            : isSignUp 
            ? 'Créer un compte' 
            : 'Se connecter'}
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          {isMfaStep
            ? "Entre le code à 6 chiffres généré par ton application d'authentification."
            : isForgotPassword
            ? 'Entre ton adresse e-mail pour recevoir les instructions de réinitialisation.'
            : isSignUp
            ? 'Rejoins la communauté sécurisée pour vendre et acheter tes cartes.'
            : 'Accède à ton espace vendeur et gère tes annonces.'}
        </p>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs p-3 rounded-xl mb-4 font-medium">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs p-3 rounded-xl mb-4 font-medium">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isMfaStep ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Code de sécurité (MFA)
              </label>
              <input
                type="text"
                maxLength="6"
                required
                placeholder="123456"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-center tracking-widest text-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ) : (
            <>
              {isSignUp && (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Pseudo Vendeur
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Sacha_Pallet"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Département (ex: 18, 45, 89, 58)
                    </label>
                    <input
                      type="text"
                      maxLength="3"
                      placeholder="Ex: 18"
                      value={departmentCode}
                      onChange={(e) => setDepartmentCode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Adresse Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="vendeur@pokemon.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {!isForgotPassword && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Mot de passe
                    </label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setErrorMsg('');
                          setSuccessMsg('');
                        }}
                        className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                      >
                        Mot de passe oublié ?
                      </button>
                    )}
                  </div>
                  
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength="6"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-4 pr-12 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                      title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.07 10.07 0 014.136-5.403m3.056-1.555A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m-3.21-3.21a3 3 0 11-4.243-4.243M3 3l18 18" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {isSignUp && (
                <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={acceptCharter}
                      onChange={(e) => setAcceptCharter(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                    />
                    <span className="text-[11px] text-amber-900 leading-relaxed font-medium">
                      <strong>Charte Anti-Arnaque :</strong> Je m'engage à respecter les règles de sécurité (interdiction des paiements non sécurisés hors plateforme, honnêteté sur l'état des cartes).
                    </span>
                  </label>
                </div>
              )}

              {!isForgotPassword && !isSignUp && (
                <div className="flex items-center pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-600">Se souvenir de moi</span>
                  </label>
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold py-3 rounded-xl transition-colors text-sm shadow-md cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading
              ? 'Traitement...'
              : isMfaStep
              ? 'Vérifier le code'
              : isForgotPassword
              ? 'Envoyer le lien de réinitialisation'
              : isSignUp
              ? "Créer mon compte sécurisé"
              : 'Se connecter'}
          </button>
        </form>

        <div className="mt-6 text-center pt-4 border-t border-slate-100">
          {isMfaStep ? (
            <button
              type="button"
              onClick={() => {
                setIsMfaStep(false);
                setMfaCode('');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              ← Retour à la connexion
            </button>
          ) : isForgotPassword ? (
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              ← Retour à la connexion
            </button>
          ) : (
            <p className="text-xs text-slate-500">
              {isSignUp ? 'Tu as déjà un compte ?' : "Tu n'as pas encore de compte ?"}
              {' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setAcceptCharter(false);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="font-bold text-indigo-600 hover:underline cursor-pointer ml-1"
              >
                {isSignUp ? 'Se connecter' : "S'inscrire"}
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}