import React, { useEffect, useState } from "react";
import { MapPin, Sun, CloudRain, List as ListIcon, Map as MapIcon, Route } from 'lucide-react';

function NewComponent(props) {
  const [places, setPlaces] = useState([]);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('list');

  const data = Array.isArray(props.searchData) ? props.searchData[0] : props.searchData;
  const query = data?.query || "";
  const locationEntity = data?.entities?.find(e => e.entityType === "LOCATION" || e.collectionType === "HD_LOCATION") || data?.entities?.[0];
  console.log("searchdata",props.searchData)
  const rawLat = locationEntity?.entityInfo?.geo?.lat;
  const rawLon = locationEntity?.entityInfo?.geo?.long;
  const city = locationEntity?.entityInfo?.geo?.city || locationEntity?.word || "this location";
  console.log("rawLat",rawLat)
  console.log("rawLon",rawLon)
  // Parse floats to prevent string concatenation math errors (Error 1)
  const numLat = parseFloat(rawLat);
  const numLon = parseFloat(rawLon);
  console.log("numLat",numLat)
  console.log("numLon",numLon)
  console.log(isNaN(numLat) || isNaN(numLon))
  const getCategoryFromQuery = (q) => {
    const lower = q.toLowerCase();
    if (lower.includes('museum')) return 'museum';
    if (lower.includes('temple') || lower.includes('church') || lower.includes('mosque')) return 'temple';
    if (lower.includes('park') || lower.includes('garden')) return 'park';
    if (lower.includes('fort')) return 'fort';
    if (lower.includes('monument') || lower.includes('historic') || lower.includes('landmark')) return 'monument';
    if (lower.includes('viewpoint')) return 'viewpoint';
    return 'sights'; 
  };

  const API_URL = process.env.NODE_ENV === 'production' 
    ? (props.deployedBackendURL || '') 
    : import.meta.env.VITE_API_URL;
  
  useEffect(() => {
    // 1. The sandbox often sends an empty object {} on the very first frame. 
    // We must wait until it actually has a query inside it.
    const currentData = Array.isArray(props.searchData) ? props.searchData[0] : props.searchData;
    if (!currentData || !currentData.query) return;

    // 2. 🧹 CLEAR previous errors! This ensures Render 1 doesn't permanently break Render 2
    setError(null);
    setLoading(true);

    // 3. Now safely check if coordinates are broken
    if (isNaN(numLat) || isNaN(numLon)) {
      setError("Could not determine exact location coordinates.");
      setLoading(false);
      props?.messageHandlers?.componentLoaded();
      return; 
    }

    const category = getCategoryFromQuery(query);

    // 4. Fetch the real data
    fetch(`${API_URL}/api/places?lat=${numLat}&lon=${numLon}&category=${category}`)
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.details || errorData.error || "Failed to fetch data");
        }
        return res.json();
      })
      .then((resData) => {
        setPlaces(resData.places || []);
        setWeather(resData.weather || null);
        setLoading(false);
        props?.messageHandlers?.componentLoaded();
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
        props?.messageHandlers?.componentLoaded();
      });
  }, [numLat, numLon, query, API_URL]);

  if (loading) return <div className="p-4 text-center text-gray-500 animate-pulse">Finding the best spots...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Error: {error}</div>;
  if (places.length === 0) return <div className="p-4 text-center text-gray-500">No specific sights found for "{query}". Try searching more generally in {city}.</div>;

  return (
  <div className="group/card relative flex flex-col w-full max-w-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl shadow-blue-500/10 border border-slate-200/70 dark:border-slate-800 overflow-hidden font-sans">

    {/* Inline keyframes (no config changes needed) */}
    <style>{`
      @keyframes ec-fade-up { from { opacity: 0; transform: translateY(12px) scale(.98); } to { opacity: 1; transform: none; } }
      @keyframes ec-float { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-12px, 10px); } }
      @keyframes ec-shimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
      @keyframes ec-spin-slow { to { transform: rotate(360deg); } }
      .ec-fade-up { animation: ec-fade-up .5s cubic-bezier(.2,.8,.2,1) both; }
      .ec-float { animation: ec-float 8s ease-in-out infinite; }
      .ec-shimmer { background: linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent); background-size: 200% 100%; animation: ec-shimmer 2.5s linear infinite; }
      .ec-spin-slow { animation: ec-spin-slow 12s linear infinite; }
    `}</style>

    {/* HEADER: animated aurora blobs + interactive weather badge */}
    <div className="relative p-6 overflow-hidden bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-white">
      <div className="ec-float absolute -top-16 -right-10 w-48 h-48 rounded-full bg-cyan-300/40 blur-3xl pointer-events-none" />
      <div className="ec-float absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-fuchsia-400/30 blur-3xl pointer-events-none" style={{ animationDelay: '-4s' }} />
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '18px 18px' }} />

      <div className="relative z-10 flex justify-between items-start gap-4">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            </span>
            Live guide
          </span>
          <h2 className="mt-1 text-2xl font-black tracking-tight flex items-center gap-2">
            <MapPin size={24} className="shrink-0 drop-shadow-md transition-transform duration-500 group-hover/card:-translate-y-1 group-hover/card:rotate-[-8deg]" />
            <span className="truncate">Exploring {city}</span>
          </h2>
          <p className="text-sm text-white/80 capitalize font-medium mt-1 truncate">{query}</p>
        </div>

        {weather && (
          <div className="group/w relative shrink-0 cursor-default">
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-xl px-3.5 py-2 rounded-2xl border border-white/25 shadow-lg transition-all duration-300 hover:bg-white/25 hover:scale-110 hover:-rotate-2">
              {weather.precipitation_probability_max?.[0] > 50
                ? <CloudRain size={18} className="text-cyan-200 transition-transform group-hover/w:translate-y-0.5" />
                : <Sun size={18} className="ec-spin-slow text-amber-300" />}
              <span className="text-sm font-extrabold">{weather.temperature_2m_max?.[0]}°C</span>
            </div>
            {/* hover tooltip */}
            <div className="absolute right-0 top-full mt-2 w-max px-3 py-1.5 rounded-lg bg-slate-900/90 text-[11px] font-semibold opacity-0 -translate-y-1 pointer-events-none transition-all duration-200 group-hover/w:opacity-100 group-hover/w:translate-y-0 z-20">
              Rain chance: {weather.precipitation_probability_max?.[0] ?? 0}%
            </div>
          </div>
        )}
      </div>
    </div>

    {/* TABS: segmented control with sliding indicator */}
    <div className="p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div className="relative grid grid-cols-3 p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-800">
        <div
          className="absolute top-1 bottom-1 left-1 rounded-xl bg-white dark:bg-slate-700 shadow-md transition-transform duration-500 ease-[cubic-bezier(.34,1.56,.64,1)]"
          style={{
            width: 'calc((100% - 0.5rem) / 3)',
            transform: `translateX(${activeTab === 'list' ? 0 : activeTab === 'plan' ? 100 : 200}%)`,
          }}
        />
        {[
          { id: 'list', label: 'List', Icon: ListIcon },
          { id: 'plan', label: 'Day Plan', Icon: Route },
          { id: 'map', label: 'Map', Icon: MapIcon },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`relative z-10 py-2.5 flex justify-center items-center gap-2 text-sm font-bold rounded-xl transition-colors duration-300 active:scale-95 ${
              activeTab === id
                ? 'text-blue-600 dark:text-blue-300'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Icon size={18} className={`transition-transform duration-300 ${activeTab === id ? 'scale-110' : ''}`} />
            {label}
          </button>
        ))}
      </div>
    </div>

    {/* CONTENT AREA */}
    <div className="p-4 max-h-[450px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-sky-400 [&::-webkit-scrollbar-thumb]:to-indigo-500 [&::-webkit-scrollbar-thumb]:rounded-full">

      {/* VIEW 1: LIST - staggered entrance, tilt + glow on hover */}
      {activeTab === 'list' && (
        <div key="list" className="flex flex-col gap-3">
          {places.map((place, i) => (
            <div
              key={place.id}
              className="ec-fade-up group relative flex gap-4 items-center p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-200 dark:hover:border-blue-800 active:scale-[0.98]"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* gradient glow edge */}
              <div className="absolute inset-y-3 left-0 w-1 rounded-full bg-gradient-to-b from-sky-400 to-indigo-500 scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center" />

              <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 shadow-md bg-slate-100 dark:bg-slate-800 relative">
                {place.image ? (
                  <img src={place.image} alt={place.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-125 group-hover:rotate-2" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-slate-800 dark:to-slate-700">
                    <MapPin size={22} className="text-blue-400" />
                  </div>
                )}
                <div className="ec-shimmer absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/50 backdrop-blur text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base leading-tight text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">{place.name}</h3>
                {place.distance != null && (
                  <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded-full tracking-wide">
                    <MapPin size={10} /> {place.distance}m from center
                  </span>
                )}
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 group-hover:line-clamp-none leading-relaxed">
                  {place.description}
                </p>
              </div>

              <span className="self-center text-slate-300 dark:text-slate-600 text-xl font-light transition-all duration-300 group-hover:text-blue-500 group-hover:translate-x-1">›</span>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 2: DAY PLAN - animated gradient timeline */}
      {activeTab === 'plan' && (
        <div key="plan" className="flex flex-col gap-4 px-2">
          <h3 className="ec-fade-up text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Suggested Itinerary</h3>
          <div className="relative ml-4 pl-8 py-2 flex flex-col gap-5">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full bg-gradient-to-b from-sky-400 via-blue-500 to-indigo-600" />
            {places.slice(0, Math.min(places.length, 4)).map((place, idx) => (
              <div
                key={'plan-' + place.id}
                className="ec-fade-up group relative p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 transition-all duration-300 hover:translate-x-1.5 hover:shadow-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-white dark:hover:from-blue-950/40 dark:hover:to-slate-900 hover:border-blue-200 dark:hover:border-blue-800 cursor-default"
                style={{ animationDelay: `${idx * 90}ms` }}
              >
                <div className="absolute -left-[43px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white dark:bg-slate-950 border-2 border-blue-500 flex items-center justify-center text-[10px] font-black text-blue-600 dark:text-blue-300 shadow-md z-10 transition-all duration-300 group-hover:scale-125 group-hover:bg-blue-500 group-hover:text-white">
                  {idx + 1}
                </div>
                <div className="absolute -left-[43px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-blue-400 opacity-0 group-hover:opacity-60 group-hover:animate-ping z-0" />

                <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-500 dark:text-blue-400 block">Stop {idx + 1}</span>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">{place.name}</h4>
                {place.distance != null && (
                  <p className="text-xs text-slate-400 mt-1 max-h-0 opacity-0 overflow-hidden transition-all duration-300 group-hover:max-h-6 group-hover:opacity-100">
                    {place.distance}m from center
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: MAP - framed, zoom-on-hover, dark-mode filter */}
      {activeTab === 'map' && (
        <div key="map" className="ec-fade-up group relative h-[350px] rounded-2xl overflow-hidden p-[2px] bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 shadow-lg transition-shadow duration-300 hover:shadow-2xl hover:shadow-blue-500/30">
          <div className="relative w-full h-full rounded-[14px] overflow-hidden bg-slate-200 dark:bg-slate-800">
            <iframe
              title="Map View"
              className="w-full h-full border-0 grayscale-[20%] contrast-125 dark:invert-[90%] dark:hue-rotate-180 transition-all duration-700 group-hover:grayscale-0"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${numLon - 0.05}%2C${numLat - 0.05}%2C${numLon + 0.05}%2C${numLat + 0.05}&layer=mapnik&marker=${numLat}%2C${numLon}`}
            ></iframe>
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur text-xs font-bold shadow-md pointer-events-none">
              <MapPin size={14} className="text-blue-600" /> {city}
            </div>
          </div>
        </div>
      )}

    </div>
  </div>
);
}

export default NewComponent;