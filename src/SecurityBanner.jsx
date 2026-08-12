import React from 'react';

export default function SecurityBanner({ type = 'default' }) {
  const content = {
    default: {
      title: "Conseils de sécurité TCG",
      description: "Pour éviter les arnaques, ne réalisez jamais de transactions ou de paiements en dehors de la plateforme.",
      icon: "🛡️",
      bg: "bg-sky-50 border-sky-200 text-sky-900",
      iconBg: "bg-sky-100 text-sky-600"
    },
    transaction: {
      title: "Transaction sécurisée",
      description: "Vos fonds sont protégés jusqu'à la validation de la réception de vos cartes Pokémon.",
      icon: "🔒",
      bg: "bg-emerald-50 border-emerald-200 text-emerald-900",
      iconBg: "bg-emerald-100 text-emerald-600"
    }
  };

  const current = content[type] || content.default;

  return (
    <div className={`border rounded-2xl p-4 flex items-start gap-3.5 ${current.bg}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 font-bold ${current.iconBg}`}>
        {current.icon}
      </div>
      <div className="space-y-1">
        <h4 className="font-black text-xs uppercase tracking-wider">{current.title}</h4>
        <p className="text-xs font-medium opacity-90 leading-relaxed">
          {current.description}
        </p>
      </div>
    </div>
  );
}