"use client";

import React from "react";
import dynamic from "next/dynamic";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false
});

import { 
  Search, Bell, ArrowRight, Map as MapIcon, Layers, Crosshair, Maximize, 
  Droplets, AlertTriangle, Info, ClipboardList, Package, 
  TrendingUp, Activity, Thermometer, AlertCircle,
  DollarSign, BookOpen, CloudSun, Eye, FileText, Grid, Sprout, Calendar
} from "lucide-react";


// --- HELPER COMPONENTS ---

// 1. Action Card (For Action Center)
const ActionCard = ({ 
  type, title, subtitle, badge 
}: { 
  type: 'urgent' | 'warning' | 'info'; 
  title: string; 
  subtitle: string; 
  badge?: string 
}) => {
  const styles = {
    urgent: { 
      border: 'border-l-[#EF4444]', // Red
      iconBg: 'bg-[#FEF2F2]', 
      iconColor: 'text-[#EF4444]', 
      icon: AlertTriangle, 
      badgeBg: 'bg-[#FEE2E2] text-[#EF4444]' 
    },
    warning: { 
      border: 'border-l-[#FACC15]', // Yellow
      iconBg: 'bg-[#FEFCE8]', 
      iconColor: 'text-[#CA8A04]', 
      icon: Info, 
      badgeBg: '' 
    },
    info: { 
      border: 'border-l-[#FACC15]', // Yellow
      iconBg: 'bg-[#FEFCE8]', 
      iconColor: 'text-[#CA8A04]', 
      icon: Info, 
      badgeBg: '' 
    },
  };
  
  const style = styles[type];
  const Icon = style.icon;

  return (
    <div className={`bg-white p-5 rounded-2xl shadow-sm border-l-[6px] ${style.border} flex items-start gap-5 mb-4`}>
      <div className={`w-12 h-12 rounded-xl ${style.iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={style.iconColor} size={24} strokeWidth={2} />
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <h4 className="font-bold text-slate-900 text-[16px] leading-tight">{title}</h4>
          {badge && <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md ${style.badgeBg}`}>{badge}</span>}
        </div>
        <p className="text-slate-500 text-[13px] leading-relaxed">{subtitle}</p>
      </div>
    </div>
  );
};

// 2. Quick Control Button
const QuickControlButton = ({ 
  icon, label, subLabel, colorClass, iconColor 
}: { 
  icon: React.ReactNode; 
  label: string; 
  subLabel: string; 
  colorClass: string;
  iconColor: string;
}) => (
  <button className="bg-[#F8FAFC] p-4 rounded-2xl hover:bg-white hover:shadow-md transition flex flex-col items-start w-full text-left group border border-transparent hover:border-slate-100">
    <div className={`w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center mb-3 group-hover:scale-105 transition`}>
      {React.cloneElement(icon as React.ReactElement, { className: iconColor, size: 20 } as any)}
    </div>
    <span className="font-bold text-slate-800 block text-[15px] mb-0.5">{label}</span>
    <span className="text-xs text-slate-400 font-medium">{subLabel}</span>
  </button>
);

// 3. Metric Card
const MetricCard = ({ 
  icon, title, value, status, statusType, iconBg, iconColor, percent 
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  status?: string;
  statusType: 'low' | 'high' | 'good' | 'critical';
  iconBg: string;
  iconColor: string;
  percent?: string;
}) => {
  const statusStyles = {
    low: 'bg-[#FEE2E2] text-[#EF4444]', // Red pill
    high: 'bg-[#FFEDD5] text-[#F97316]', // Orange pill
    good: 'bg-[#D1FAE5] text-[#10B981]', // Green pill
    critical: 'bg-[#FEE2E2] text-[#EF4444]', // Red pill
  };

  return (
    <div className="bg-white p-6 rounded-[1.5rem] shadow-sm flex flex-col justify-between h-full min-h-[180px]">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center`}>
          {React.cloneElement(icon as React.ReactElement, { className: iconColor, size: 22 } as any)}
        </div>
        {percent && <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{percent}</span>}
      </div>
      
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <h4 className="text-[2rem] font-extrabold text-slate-900 leading-none mb-4">{value}</h4>
      </div>
      
      <div>
         {title === 'CROP HEALTH' ? (
           // Progress Bar for Crop Health specific layout
           <div className="w-full h-3 bg-[#E2E8F0] rounded-full overflow-hidden">
             <div className="h-full bg-[#10B981] w-[92%] rounded-full"></div>
           </div>
         ) : (
           // Status Pill for others
           <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-md ${statusStyles[statusType]}`}>
             {(statusType === 'critical' || statusType === 'low') && <AlertCircle size={12} strokeWidth={3}/>} 
             {statusType === 'high' && <Activity size={12} strokeWidth={3}/>} 
             {status}
           </span>
         )}
      </div>
    </div>
  );
};

// 4. App Icon Component (Added for Apps & Tools)
/*const AppIcon = ({ icon, label, colorClass, iconColor }: { icon: React.ReactNode, label: string, colorClass: string, iconColor: string }) => (
  <div className="flex flex-col items-center gap-4 min-w-[90px] cursor-pointer group">
    <div className={`w-[4.5rem] h-[4.5rem] rounded-[1.8rem] ${colorClass} flex items-center justify-center group-hover:scale-105 transition shadow-sm`}>
      {React.cloneElement(icon as React.ReactElement, { className: iconColor, size: 28, strokeWidth: 2 })}
    </div>
    <span className="text-[13px] font-bold text-slate-600 group-hover:text-slate-900 transition">{label}</span>
  </div>
);*/

const AppIcon = ({ 
  icon, 
  label, 
  colorClass, 
  iconColor 
}: { 
  icon: React.ReactNode; 
  label: string; 
  colorClass: string; 
  iconColor: string; 
}) => (
  <div className="flex flex-col items-center gap-5 min-w-[110px] cursor-pointer group">
    
    {/* Bigger Icon Container */}
    <div
      className={`w-[5.5rem] h-[5.5rem] rounded-[2rem] ${colorClass} flex items-center justify-center 
      group-hover:scale-110 transition shadow-md`}
    >
      {React.cloneElement(icon as React.ReactElement, {
        className: iconColor,
        size: 36,
        strokeWidth: 2.2
      } as any)}
    </div>

    {/* Label */}
    <span className="text-[14px] font-bold text-slate-700 group-hover:text-slate-900 transition">
      {label}
    </span>
  </div>
);



// 5. Crop Row Component (Added for Crop Overview)
const CropRow = ({ 
  crop, field, stage, stageColor, date, yieldVal 
}: {
  crop: string;
  field: string;
  stage: string;
  stageColor: 'blue' | 'green' | 'orange';
  date: string;
  yieldVal: string;
}) => {
    const badgeStyles = {
        blue: 'bg-[#EFF6FF] text-[#3B82F6] border border-[#DBEAFE]', // Blue-50
        green: 'bg-[#ECFDF5] text-[#10B981] border border-[#D1FAE5]', // Emerald-50
        orange: 'bg-[#FFF7ED] text-[#F97316] border border-[#FFEDD5]', // Orange-50
    };

    return (
        <div className="flex flex-col sm:flex-row sm:items-center py-6 border-b border-gray-100 last:border-0 hover:bg-slate-50/50 transition px-6 -mx-6 gap-4 sm:gap-0">
            <div className="w-full sm:w-1/4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#ECFDF5] flex items-center justify-center text-[#10B981]">
                    <Sprout size={22} strokeWidth={2} />
                </div>
                <div>
                    <h4 className="font-bold text-slate-900 text-[15px]">{crop}</h4>
                    <p className="text-[12px] text-slate-500 font-medium">{field}</p>
                </div>
            </div>
            <div className="w-full sm:w-1/4">
                <span className={`inline-block px-4 py-1.5 rounded-full text-[11px] font-bold ${badgeStyles[stageColor]}`}>
                    {stage}
                </span>
            </div>
            <div className="w-full sm:w-1/4 flex items-center gap-2 text-slate-500 text-[13px] font-bold">
                <Calendar size={16} className="text-slate-400" strokeWidth={2}/>
                {date}
            </div>
            <div className="w-full sm:w-1/4 text-left sm:text-right">
                <h4 className="font-bold text-slate-900 text-[16px]">{yieldVal}</h4>
                <p className="text-[11px] text-slate-400 font-bold uppercase">Bu/Acre</p>
            </div>
        </div>
    );
}


// --- MAIN DASHBOARD COMPONENT ---
export default function Dashboard() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] max-w-[1400px] mx-auto px-6 py-6 space-y-8 font-sans pb-20">
      
      {/* --- HEADER --- */}
      <header className="flex justify-between items-center py-2">
        <div>
          <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-1">WELCOME BACK</p>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Kisaan Saathi</h1>
        </div>
        <div className="flex items-center gap-6">
          <button className="text-slate-400 hover:text-slate-600">
            <Search size={24} />
          </button>
          <button className="relative text-slate-400 hover:text-slate-600">
            <Bell size={24} />
            <span className="absolute top-0 right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#F8FAFC]"></span>
          </button>
          <div className="flex items-center gap-3 pl-4">
            <div className="text-right hidden sm:block leading-tight">
              <p className="text-sm font-bold text-slate-900">John Doe</p>
              <p className="text-xs text-slate-500 font-medium">Lead Agronomist</p>
            </div>
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
               <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=Felix" alt="John Doe" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </header>

      {/* --- 1. FARM HEALTH INDEX CARD --- */}
      <section className="bg-[#2EBD85] rounded-[2rem] p-8 md:p-10 text-white shadow-lg shadow-[#2EBD85]/20 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          
          <div className="flex items-center gap-8">
            {/* Circular Progress */}
            <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
              {/* Background Circle */}
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="50" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="transparent" />
                {/* Progress Circle (78%) */}
                <circle cx="56" cy="56" r="50" stroke="white" strokeWidth="6" fill="transparent" strokeDasharray="314" strokeDashoffset="69" strokeLinecap="round" />
              </svg>
              <div className="absolute flex flex-col items-center leading-none">
                <span className="text-[2.5rem] font-bold">7.8</span>
                <span className="text-[10px] opacity-80 font-medium mt-1">/10</span>
              </div>
            </div>

            {/* Text Content */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Farm Health Index</h2>
                <span className="bg-white/20 px-3 py-1 rounded-full text-[11px] font-bold backdrop-blur-sm tracking-wide">Good Vigor</span>
              </div>
              <p className="text-white/90 text-[15px] font-medium max-w-lg leading-relaxed">
                Monitor soil moisture in Field 3. Pest pressure increasing in south sector.
              </p>
            </div>
          </div>

          {/* Button */}
          <button className="bg-white text-[#2EBD85] px-8 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-50 transition shadow-sm whitespace-nowrap">
            Analysis <ArrowRight size={18} strokeWidth={2.5} />
          </button>
        </div>
      </section>

      {/* --- 2. INTERACTIVE NDVI MAP CARD --- */}
<section className="bg-[#2D7A58] rounded-[2rem] h-[500px] relative w-full overflow-hidden shadow-lg group">

  {/* MAP LAYER (REAL LEAFLET MAP) */}
  <div className="absolute inset-0 z-0">
    <LeafletMap />
  </div>

  {/* Top Left: Live Field Map Button */}
  <div className="absolute top-8 left-8 z-20">
    <button className="bg-white text-slate-800 px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-2.5 shadow-md hover:bg-gray-50 transition">
      <MapIcon size={18} className="text-[#2D7A58]" strokeWidth={2.5}/> Live Field Map
    </button>
  </div>

  {/* Top Right: Map Controls */}
  <div className="absolute top-8 right-8 flex flex-col gap-3 z-20">
    <button className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-md text-slate-600 hover:text-[#2D7A58] transition">
      <Layers size={22} strokeWidth={2}/>
    </button>
    <button className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-md text-slate-600 hover:text-[#2D7A58] transition">
      <Crosshair size={22} strokeWidth={2}/>
    </button>
  </div>



 






  {/* Bottom Left: Field Status Pills */}
  <div className="absolute bottom-8 left-8 flex gap-4 z-20">
    
    {/* Field 1 Pill */}
    <div className="flex items-center gap-3 bg-white px-2 py-2 pr-6 rounded-full shadow-lg min-w-[140px]">
      <span className="w-8 h-8 rounded-full bg-[#EAFBF5] flex items-center justify-center ml-1">
        <div className="w-2.5 h-2.5 rounded-full bg-[#2EBD85]"></div>
      </span>
      <div className="flex flex-col leading-none">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">STATUS</span>
        <span className="text-xs font-bold text-slate-800">Field 1</span>
      </div>
    </div>

    {/* Field 2 Pill */}
    <div className="flex items-center gap-3 bg-white px-2 py-2 pr-6 rounded-full shadow-lg min-w-[140px]">
      <span className="w-8 h-8 rounded-full bg-[#FEF9E7] flex items-center justify-center ml-1">
        <div className="w-2.5 h-2.5 rounded-full bg-[#EAB308]"></div>
      </span>
      <div className="flex flex-col leading-none">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">STATUS</span>
        <span className="text-xs font-bold text-slate-800">Field 2</span>
      </div>
    </div>

    {/* Field 3 Pill */}
    <div className="flex items-center gap-3 bg-white px-2 py-2 pr-6 rounded-full shadow-lg min-w-[140px]">
      <span className="w-8 h-8 rounded-full bg-[#FEF2F2] flex items-center justify-center ml-1">
        <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></div>
      </span>
      <div className="flex flex-col leading-none">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">STATUS</span>
        <span className="text-xs font-bold text-slate-800">Field 3</span>
      </div>
    </div>

  </div>

  {/* Bottom Right: Maximize Button */}
  <div className="absolute bottom-8 right-8 z-20">
    <button className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition border border-white/20">
      <Maximize size={20} strokeWidth={2.5}/>
    </button>
  </div>

</section>

      {/* --- 3. ACTION CENTER & QUICK CONTROL --- */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left: Action Center (Takes up 2 columns) */}
        <div className="xl:col-span-2">
          <div className="flex justify-between items-end mb-6">
            <h3 className="text-xl font-bold text-slate-900">Action Center</h3>
            <button className="text-sm font-bold text-[#2EBD85] hover:text-[#259b6c] transition">View History</button>
          </div>
          
          <ActionCard 
            type="urgent" 
            title="Urgent: Irrigation Required" 
            subtitle="Soil moisture in Field 3 dropped to 35%." 
            badge="Urgent"
          />
          <ActionCard 
            type="warning" 
            title="Pest Warning: Soybean Field" 
            subtitle="Increased insect count detected." 
          />
          <ActionCard 
            type="info" 
            title="Service Due: Tractor A-40" 
            subtitle="Scheduled maintenance required." 
          />
        </div>

        {/* Right: Quick Control (Takes up 1 column) */}
        <div className="flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">QUICK CONTROL</h3>
          <div className="bg-white p-6 rounded-[2rem] shadow-sm flex-grow">
            <div className="grid grid-cols-2 gap-4 h-full">
              <QuickControlButton 
                icon={<Droplets />} 
                label="Irrigate" 
                subLabel="Field 3" 
                colorClass="bg-blue-50"
                iconColor="text-blue-500"
              />
              <QuickControlButton 
                icon={<ClipboardList />} 
                label="Scouting" 
                subLabel="Log Entry" 
                colorClass="bg-emerald-50"
                iconColor="text-emerald-500"
              />
              <QuickControlButton 
                icon={<Package />} 
                label="Inventory" 
                subLabel="Check Stock" 
                colorClass="bg-orange-50"
                iconColor="text-orange-500"
              />
              <QuickControlButton 
                icon={<TrendingUp />} 
                label="Yield" 
                subLabel="Prediction" 
                colorClass="bg-purple-50"
                iconColor="text-purple-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* --- 4. REAL-TIME METRICS --- */}
      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-6">Real-time Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <MetricCard 
            icon={<Droplets />} 
            title="SOIL MOISTURE" 
            value="35%" 
            status="Low" 
            statusType="low" 
            iconBg="bg-blue-50" 
            iconColor="text-blue-500"
            percent="35%" 
          />
          <MetricCard 
            icon={<Thermometer />} 
            title="TEMPERATURE" 
            value="25.3°C" 
            status="High" 
            statusType="high" 
            iconBg="bg-orange-50" 
            iconColor="text-orange-500" 
          />
          <MetricCard 
            icon={<Activity />} 
            title="CROP HEALTH" 
            value="0.92" 
            status="" 
            statusType="good" 
            iconBg="bg-emerald-50" 
            iconColor="text-emerald-500" 
            percent="92%"
          />
          <MetricCard 
            icon={<AlertCircle />} 
            title="CRITICAL TASKS" 
            value="3" 
            status="Action Needed" 
            statusType="critical" 
            iconBg="bg-red-50" 
            iconColor="text-red-500" 
          />
        </div>
      </section>

      {/* --- 5. APPS & TOOLS (ADDED) --- */}
     {/* --- 5. APPS & TOOLS (ADDED) --- */}
<section>
  <h3 className="text-xl font-bold text-slate-900 mb-6">Apps & Tools</h3>
  <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-transparent overflow-x-auto [&::-webkit-scrollbar]:hidden">
    <div className="flex justify-between items-center min-w-[800px] gap-4">
      <AppIcon icon={<DollarSign />} label="Market" colorClass="bg-[#EFF6FF]" iconColor="text-[#3B82F6]" />
      <AppIcon icon={<Info />} label="Advisory" colorClass="bg-[#ECFDF5]" iconColor="text-[#10B981]" />
      <AppIcon icon={<Layers />} label="Soil Lab" colorClass="bg-[#FFF7ED]" iconColor="text-[#D97706]" />
      <AppIcon icon={<BookOpen />} label="Guide" colorClass="bg-[#FEFCE8]" iconColor="text-[#EAB308]" />
      <AppIcon icon={<CloudSun />} label="Weather" colorClass="bg-[#EFF6FF]" iconColor="text-[#60A5FA]" />
      <AppIcon icon={<Eye />} label="Scout" colorClass="bg-[#FFF7ED]" iconColor="text-[#F97316]" />
      <AppIcon icon={<FileText />} label="Reports" colorClass="bg-[#FAF5FF]" iconColor="text-[#A855F7]" />
      <AppIcon icon={<Grid />} label="Services" colorClass="bg-[#FEF2F2]" iconColor="text-[#EF4444]" />
    </div>
  </div>
</section>



      {/* --- 6. CROP OVERVIEW (ADDED) --- */}
      <section className="bg-white rounded-[2rem] p-8 shadow-sm">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-900">Crop Overview</h3>
            <button className="text-sm font-bold text-[#2EBD85] hover:text-[#259b6c] hover:underline">View All</button>
        </div>
        
        {/* Table Header */}
        <div className="hidden sm:flex items-center text-[11px] font-bold text-slate-400 uppercase tracking-widest pb-4 border-b border-gray-100 px-6 -mx-6">
            <div className="w-1/4">Crop & Field</div>
            <div className="w-1/4">Growth Stage</div>
            <div className="w-1/4">Timeline</div>
            <div className="w-1/4 text-right">Est. Yield</div>
        </div>

        <div className="flex flex-col">
            <CropRow 
                crop="Corn" field="Field 1 & 2" 
                stage="Tasseling" stageColor="blue" 
                date="Apr 15, 2025" yieldVal="180" 
            />
            <CropRow 
                crop="Soybeans" field="Field 3" 
                stage="Vegetative V4" stageColor="green" 
                date="May 1, 2025" yieldVal="65" 
            />
            <CropRow 
                crop="Wheat" field="Field 4" 
                stage="Harvest Ready" stageColor="orange" 
                date="Oct 1, 2024" yieldVal="45" 
            />
        </div>
      </section>
      
    </main>
  );
}