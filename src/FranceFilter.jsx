import React from 'react';

export default function FranceFilter({ selectedDept, onSelectDept }) {
  // Chaque région contient maintenant la liste complète de ses départements
  const regions = [
    { id: 'bre', name: 'Bretagne', codes: ['22', '29', '35', '56'] },
    { id: 'nor', name: 'Normandie', codes: ['14', '27', '50', '61', '76'] },
    { id: 'hdf', name: 'Hauts-de-France', codes: ['02', '59', '60', '62', '80'] },
    { id: 'idf', name: 'Île-de-F.', codes: ['75', '77', '78', '91', '92', '93', '94', '95'] },
    { id: 'ges', name: 'Grand-Est', codes: ['08', '10', '51', '52', '54', '55', '57', '67', '68', '88'] },
    { id: 'pdl', name: 'Pays de la Loire', codes: ['44', '49', '53', '72', '85'] },
    { id: 'cvl', name: 'Centre-Val de L.', codes: ['18', '28', '36', '37', '41', '45'] },
    { id: 'bfc', name: 'Bourgogne-Fr. C.', codes: ['21', '25', '39', '58', '70', '71', '89', '90'] },
    { id: 'naq', name: 'Nouvelle-Aquitaine', codes: ['16', '17', '19', '23', '24', '33', '40', '47', '64', '79', '86', '87'] },
    { id: 'ara', name: 'Auvergne-Rhône-Alpes', codes: ['01', '03', '07', '15', '26', '38', '42', '43', '63', '69', '73', '74'] },
    { id: 'occ', name: 'Occitanie', codes: ['09', '11', '12', '30', '31', '32', '34', '46', '48', '65', '66', '81', '82'] },
    { id: 'pac', name: 'P.A.C.A.', codes: ['04', '05', '06', '13', '83', '84'] },
    { id: 'cor', name: 'Corse', codes: ['2A', '2B'] },
  ];

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 mb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-slate-100">
        <div>
          <h3 className="text-xl font-black text-slate-800 tracking-tight">RÉGIONS FRANÇAISES</h3>
          <p className="text-sm text-slate-500 mt-0.5">Cliquez sur une région pour filtrer les annonces.</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            maxLength="3"
            placeholder="N° dép (ex: 75)"
            value={selectedDept}
            onChange={(e) => onSelectDept(e.target.value.trim())}
            className="bg-slate-50 border border-slate-300 rounded-2xl px-4 py-2.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
          />
          {selectedDept && (
            <button
              onClick={() => onSelectDept('')}
              className="text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 px-3.5 py-2.5 rounded-2xl transition-colors cursor-pointer border border-rose-200"
            >
              Réinitialiser ✕
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
        {regions.map((reg) => {
          // Vérifie si tous les départements de cette région sont actifs ou si le filtre correspond à l'un d'eux
          const isSelected = reg.codes.includes(selectedDept);

          return (
            <button
              key={reg.id}
              onClick={() => {
                // Si déjà sélectionné, on désactive, sinon on envoie le premier code de la région (ou on gère une liste)
                onSelectDept(isSelected ? '' : reg.codes[0]);
              }}
              className={`p-4 rounded-2xl border-2 font-bold text-sm transition-all duration-200 flex items-center justify-center text-center shadow-sm h-20 cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-md scale-105'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-900'
              }`}
            >
              {reg.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}