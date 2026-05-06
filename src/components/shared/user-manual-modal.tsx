"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";
import { manualContent, ManualKey } from "@/lib/manual-data";

interface UserManualModalProps {
  sectionKey: ManualKey;
}

export default function UserManualModal({ sectionKey }: UserManualModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const data = manualContent[sectionKey];

  if (!data) return null;

  return (
    <>
      {/* Botón (i) que se colocará al lado de tus títulos */}
      <button
        onClick={() => setIsOpen(true)}
        className="text-blue-500 hover:text-blue-700 transition-colors flex items-center justify-center p-1 rounded-full hover:bg-blue-50"
        title="Ver ayuda de este módulo"
      >
        <Info size={20} />
      </button>

      {/* Modal / Pop-up */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-[95vw] max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header del Modal */}
            <div className="flex justify-between items-center p-4 border-b bg-slate-50">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Info size={20} className="text-blue-500"/>
                {data.title}
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-red-500">
                <X size={20} />
              </button>
            </div>
            
            {/* Contenido (Los textos que armamos) */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {data.content}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button 
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}