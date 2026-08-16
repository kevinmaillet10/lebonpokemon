import React, { useState } from 'react';

export default function Footer() {
  const [activeModal, setActiveModal] = useState(null);

  return (
    <>
      <footer className="bg-[#121418] border-t border-slate-800 text-slate-400 text-xs py-8 px-6 mt-auto">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <span className="font-extrabold text-white text-sm">Le Bon Pokémon</span>
            <p>© {new Date().getFullYear()} — Tous droits réservés.</p>
          </div>
          
          {/* Liens fonctionnels */}
          <div className="flex flex-wrap items-center gap-6 font-medium">
            <button 
              onClick={() => setActiveModal('legal')} 
              className="hover:text-white transition-colors bg-transparent border-none cursor-pointer"
            >
              Mentions légales
            </button>
            <button 
              onClick={() => setActiveModal('cgu')} 
              className="hover:text-white transition-colors bg-transparent border-none cursor-pointer"
            >
              CGU / CGV
            </button>
            <button 
              onClick={() => setActiveModal('help')} 
              className="hover:text-white transition-colors bg-transparent border-none cursor-pointer"
            >
              Aide
            </button>
            <button 
              onClick={() => setActiveModal('contact')} 
              className="hover:text-white transition-colors bg-slate-800 text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-700 cursor-pointer"
            >
              Contact
            </button>
          </div>
        </div>
      </footer>

      {/* Modale d'affichage dynamique */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-100 p-4">
          <div className="bg-[#1e232a] text-white p-6 rounded-xl max-w-md w-full border border-slate-700 shadow-2xl relative max-h-[90vh] flex flex-col">
            
            <h3 className="text-lg font-bold mb-3 shrink-0">
              {activeModal === 'legal' && 'Mentions Légales'}
              {activeModal === 'cgu' && 'Conditions Générales (CGU / CGV)'}
              {activeModal === 'help' && 'Centre d\'Aide'}
              {activeModal === 'contact' && 'Contactez-nous'}
            </h3>

            <div className="text-sm text-slate-300 mb-6 space-y-2 overflow-y-auto pr-1">
              {activeModal === 'legal' && (
                <div className="space-y-3 text-xs leading-relaxed">
                  <p><strong>1. Édition du site :</strong><br />
                  Le site « Le Bon Pokémon » est un projet non commercial, édité à titre personnel par un passionné de cartes à collectionner.</p>

                  <p><strong>2. Hébergement :</strong><br />
                  Le site est hébergé par la plateforme cloud <strong>Supabase</strong> (gestion de la base de données et de l'authentification).</p>

                  <p><strong>3. Propriété intellectuelle :</strong><br />
                  Les images et les noms des cartes Pokémon sont la propriété de The Pokémon Company International, Nintendo, Creatures Inc. et Game Freak Inc. Ce site est une plateforme communautaire non officielle et gratuite, sans aucun but lucratif.</p>

                  <p><strong>4. Données personnelles :</strong><br />
                  Les données collectées (comptes, collection, annonces) servent uniquement au bon fonctionnement du site. Aucune donnée n'est revendue à des tiers.</p>
                </div>
              )}

              {activeModal === 'cgu' && (
                <div className="space-y-3 text-xs leading-relaxed">
                  <p><strong>Article 1 : Objet</strong><br />
                  « Le Bon Pokémon » est une plateforme en ligne de mise en relation entre collectionneurs particuliers permettant de publier des annonces de cartes Pokémon et de gérer sa collection.</p>

                  <p><strong>Article 2 : Inscription et Compte</strong><br />
                  L'accès à certaines fonctionnalités (création d'annonces, favoris, panier) nécessite la création d'un compte. L'utilisateur s'engage à fournir des informations exactes et à sécuriser ses identifiants.</p>

                  <p><strong>Article 3 : Règles de publication (Annonces)</strong><br />
                  Les vendeurs s'engagent à proposer des cartes authentiques, à décrire fidèlement leur état (ex: Normal/Reverse) et à utiliser des photos réelles. Les annonces frauduleuses ou trompeuses seront supprimées.</p>

                  <p><strong>Article 4 : Transactions et Paiements</strong><br />
                  Le site agit en tant que simple intermédiaire technique. Les transactions financières et les modalités de paiement s'organisent directement entre l'acheteur et le vendeur. Le site décline toute responsabilité en cas de litige financier entre particuliers.</p>

                  <p><strong>Article 5 : Livraison</strong><br />
                  Les modes d'expédition (comme Mondial Relay ou envoi postal) et les frais associés sont choisis et validés lors de l'achat. Le vendeur est responsable de l'emballage soigné de la commande.</p>
                </div>
              )}

              {activeModal === 'help' && (
                <p>Besoin d'aide ? Vous pouvez gérer votre collection, trier vos cartes par variantes (Normal/Reverse) et publier vos annonces directement depuis le menu principal.</p>
              )}

              {activeModal === 'contact' && (
                <div>
                  <p className="mb-2">Une question ou un bug à remonter ? Écrivez-nous directement à l'adresse suivante :</p>
                  <a 
                    href="mailto:le.bon.pokemon.contact@gmail.com" 
                    className="text-indigo-400 font-bold underline hover:text-indigo-300 block text-center bg-slate-900/50 p-3 rounded-lg border border-slate-800"
                  >
                    le.bon.pokemon.contact@gmail.com
                  </a>
                </div>
              )}
            </div>

            <button 
              onClick={() => setActiveModal(null)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}