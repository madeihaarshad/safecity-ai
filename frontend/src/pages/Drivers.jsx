import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SectionHeader from '../components/SectionHeader';
import { User, ShieldCheck, MapPin } from 'lucide-react';

const Drivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/drivers');
        setDrivers(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDrivers();
  }, []);

  return (
    <div className="p-8">
      <SectionHeader title="Fleet Management" subtitle="Monitor active drivers and safety scores" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {drivers.length > 0 ? drivers.map(driver => (
          <div key={driver._id} className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold">
                {driver.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold">{driver.name}</h3>
                <p className="text-xs text-slate-400">{driver.vehiclePlate}</p>
              </div>
              <div className="ml-auto flex flex-col items-end">
                <span className={`text-[10px] px-2 py-0.5 rounded ${
                  driver.status === 'Active' ? 'bg-green-500/10 text-green-400' : 'bg-slate-700 text-slate-400'
                }`}>
                  {driver.status}
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 flex items-center gap-1"><ShieldCheck size={14}/> Safety Score</span>
                <span className={`font-bold ${driver.safetyScore > 80 ? 'text-green-400' : 'text-red-400'}`}>
                  {driver.safetyScore}/100
                </span>
              </div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${driver.safetyScore > 80 ? 'bg-green-500' : 'bg-red-500'}`} 
                  style={{width: `${driver.safetyScore}%`}}
                ></div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-4 pt-4 border-t border-slate-700">
                <MapPin size={12} />
                <span>Last updated at 14:32</span>
              </div>
            </div>
          </div>
        )) : (
            <div className="col-span-full py-20 text-center text-slate-500">
                No drivers registered in the system.
            </div>
        )}
      </div>
    </div>
  );
};

export default Drivers;
