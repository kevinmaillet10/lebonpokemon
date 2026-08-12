import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import OrderTrackingModal from './OrderTrackingModal'; // Import de ta modale de suivi
import ReportModal from './ReportModal'; // <-- 1. Importe ton composant ReportModal

export default function MyPurchasesView({ userId, onBack }) {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  
  // États pour gérer l'ouverture de la modale de suivi et du signalement
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false); // <-- 2. Ajout de l'état pour ouvrir/fermer le signalement

  useEffect(() => {
    if (userId) {
      fetchPurchases();
    } else {
      setLoading(false);
      setErrorMessage("Utilisateur non connecté ou ID manquant.");
    }
  }, [userId]);

  async function fetchPurchases() {
    try {
      setLoading(true);
      setErrorMessage('');

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('buyer_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPurchases(data || []);
    } catch (err) {
      console.error("Erreur lors de la récupération des achats :", err);
      setErrorMessage("Impossible de charger vos achats pour le moment.");
    } finally {
      setLoading(false);
    }
  }

  const handleOpenTracking = (order) => {
    setSelectedOrder(order);
    setIsTrackingOpen(true);
  };

  return (
    <div className="space-y-6 text-white min-h-screen bg-[#111A29] p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer border border-slate-700"
        >
          ← Retour
        </button>
        <div className="text-right">
          <h2 className="text-xl font-bold text-white">Mes Achats</h2>
          <p className="text-xs text-slate-400">Historique et suivi de vos commandes</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Chargement de vos achats...</div>
      ) : errorMessage ? (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl text-center">
          {errorMessage}
        </div>
      ) : purchases.length === 0 ? (
        <div className="text-center py-16 bg-[#1A2331] rounded-2xl border border-slate-800 p-6 text-slate-400 space-y-2">
          <p className="text-sm font-medium text-slate-300">Vous n'avez pas encore effectué d'achats.</p>
          <p className="text-xs text-slate-500">Explorez les annonces pour trouver de nouvelles cartes !</p>
        </div>
      ) : (
        <div className="bg-[#1A2331] rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#151c28] border-b border-slate-800 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Commande</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {purchases.map((order) => (
                  <tr 
                    key={order.id} 
                    onClick={() => handleOpenTracking(order)}
                    className="hover:bg-[#202a3c] transition-colors cursor-pointer"
                    title="Cliquez pour voir le suivi de la commande"
                  >
                    <td className="py-3 px-4 font-semibold text-slate-200 text-xs">
                      #{order.id.slice(0, 8)}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">
                      {new Date(order.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className="px-2.5 py-1 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {order.status || 'Confirmée'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-xs text-emerald-400">
                      {Number(order.total_amount || order.price || 0).toFixed(2)} €
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modale de suivi de commande interactive */}
      {isTrackingOpen && (
        <OrderTrackingModal 
          isOpen={isTrackingOpen}
          onClose={() => setIsTrackingOpen(false)}
          currentStep={selectedOrder?.status} // <--- Utilise le statut réel de Supabase !
          sellerName="Vendeur"
          sellerId={selectedOrder?.seller_id}
          orderId={selectedOrder?.id}
          onUpdate={fetchPurchases} // <--- Recharge le tableau automatiquement après une action
        />
      )}
    </div>
  );
}