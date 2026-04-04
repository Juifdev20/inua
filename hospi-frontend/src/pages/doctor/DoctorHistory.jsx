import React, { useEffect, useState } from 'react';
import { getDoctorConsultationHistory } from '../services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion'; // ✅ Importation de Motion
import { Clock, ChevronRight } from 'lucide-react';

const DoctorHistory = ({ doctorId }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await getDoctorConsultationHistory(doctorId);
                setHistory(response.data.data.content); 
            } catch (error) {
                console.error("Erreur historique:", error);
            } finally {
                setLoading(false);
            }
        };
        if (doctorId) fetchHistory();
    }, [doctorId]);

    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm h-full flex flex-col border border-gray-50">
            <h3 className="text-xl font-black uppercase tracking-tighter text-gray-800 mb-6">
                Historique <span className="text-green-500">.</span>
            </h3>

            <div className="relative border-l-2 border-gray-100 ml-3 flex-grow overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence>
                    {history.map((item, index) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: 20 }} // Part de la droite
                            animate={{ opacity: 1, x: 0 }}   // Glisse vers sa place
                            transition={{ delay: index * 0.1 }} // Effet cascade
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="mb-8 ml-6 relative group"
                        >
                            {/* Point Indicateur avec pulsation au survol */}
                            <motion.div 
                                whileHover={{ scale: 1.5 }}
                                className={`absolute -left-[33px] top-1 w-4 h-4 rounded-full border-4 border-white shadow-sm ${
                                    item.status === 'CANCELLED' ? 'bg-red-400' : 'bg-green-500'
                                }`}
                            />

                            <div className="flex flex-col p-3 rounded-2xl hover:bg-green-50/50 transition-all duration-300">
                                <span className="text-[10px] font-bold text-gray-400 mb-1 flex items-center gap-1 uppercase tracking-widest">
                                    <Clock size={10} />
                                    {item.consultationDate ? format(new Date(item.consultationDate), 'dd MMM yyyy', { locale: fr }) : '---'}
                                </span>
                                
                                <span className="font-bold text-gray-800 text-sm">
                                    {item.patientName}
                                </span>

                                <div className="flex items-center justify-between mt-2">
                                    <span className={`text-[9px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider ${
                                        item.status === 'CANCELLED' 
                                        ? 'bg-red-100 text-red-600' 
                                        : 'bg-green-100 text-green-700'
                                    }`}>
                                        {item.status}
                                    </span>
                                    <ChevronRight size={14} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-4 w-full py-4 text-[10px] font-black tracking-widest text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl hover:border-green-200 hover:text-green-500 transition-all"
            >
                ARCHIVES COMPLÈTES
            </motion.button>
        </div>
    );
};

export default DoctorHistory;