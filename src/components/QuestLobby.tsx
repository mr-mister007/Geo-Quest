import { useState, FormEvent } from 'react';
import { MapPin, Compass, Sparkles, Navigation, Globe, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface QuestLobbyProps {
  onStartQuest: (configs: { prefCity?: string; useCoords?: boolean; lat?: number; lng?: number }) => void;
  loading: boolean;
  error: string | null;
}

const PRESET_CITIES = [
  { name: "Rome, Italy", desc: "Gladiatorial roots, Baroque squares, and ancient mysteries." },
  { name: "Tokyo, Japan", desc: "Megacity shrines, neon peaks, and quiet alley gardens." },
  { name: "Paris, France", desc: "Gothic monuments, romantic channels, and steel towers." },
  { name: "New York City, USA", desc: "Manhattan bento layouts, green parks, and skyscrapers." },
  { name: "Sydney, Australia", desc: "Glistening waterfront structures, bay coves, and sand bars." },
  { name: "Cairo, Egypt", desc: "Ancient Nile ports, bazaar secrets, and pyramids." },
  { name: "London, United Kingdom", desc: "Cobblestone histories, towers, and historic bridges." },
  { name: "San Francisco, USA", desc: "Foggy heights, red suspension spans, and steep hills." },
  { name: "Rio de Janeiro, Brazil", desc: "Golden beaches, mountain peaks, and carnival bays." },
];

export default function QuestLobby({ onStartQuest, loading, error }: QuestLobbyProps) {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [customCity, setCustomCity] = useState<string>('');
  const [geolocating, setGeolocating] = useState(false);

  const handleStartRandom = () => {
    onStartQuest({});
  };

  const handleStartWithCity = (cityName: string) => {
    onStartQuest({ prefCity: cityName });
  };

  const handleCustomSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (customCity.trim()) {
      onStartQuest({ prefCity: customCity.trim() });
    }
  };

  const handleStartGeo = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeolocating(false);
        onStartQuest({
          useCoords: true,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      (err) => {
        setGeolocating(false);
        console.warn("Geolocation denied or error:", err);
        // Fall back to random
        onStartQuest({});
      },
      { timeout: 8000 }
    );
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-6" id="lobby-container">
      {/* Title Callout Header with Vibrant Design */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-900/60 text-yellow-300 text-xs font-black uppercase tracking-wider mb-6 border-2 border-indigo-950/50 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)]">
          <Globe className="w-4 h-4 animate-spin-slow" />
          <span>Interactive Location Puzzle Adventure</span>
        </div>
        
        <h1 className="text-6xl md:text-7xl font-sans font-black tracking-tighter uppercase text-white mb-4 drop-shadow-[0_4px_8px_rgba(0,0,0,0.25)]">
          Geo Quest
        </h1>
        
        <p className="text-md md:text-lg text-indigo-100 max-w-xl mx-auto font-medium leading-relaxed opacity-90">
          A lightweight, clue-driven adventure pointing you to the world's most legendary locations. Decipher the riddles, pin your estimates, and uncover secrets.
        </p>
      </div>

      {error && (
        <div className="mb-8 p-5 bg-red-450 border-4 border-indigo-950 text-white rounded-[1.5rem] text-sm font-black flex gap-3 items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.25)]" id="lobby-error">
          <span className="w-3 h-3 rounded-full bg-white animate-ping"></span>
          <span>{error}</span>
        </div>
      )}

      {/* Grid of modes and choices */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {/* Play Worldwide module */}
        <div className="bg-white text-indigo-950 rounded-[2rem] p-7 border-4 border-indigo-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] flex flex-col justify-between hover:translate-y-[-4px] transition-transform">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-750 mb-5 border-2 border-indigo-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)]">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight mb-2">Worldwide Voyage</h3>
            <p className="text-indigo-900/75 text-sm leading-relaxed mb-6 font-medium">
              Venture anywhere on earth! Coordinates will start at a random historical global capital of the world.
            </p>
          </div>
          <button
            onClick={handleStartRandom}
            disabled={loading || geolocating}
            className="w-full py-3.5 px-5 bg-yellow-400 hover:bg-yellow-300 text-indigo-950 font-black rounded-2xl shadow-[4px_4px_0px_0px_#ca8a04] hover:shadow-[2px_2px_0px_0px_#ca8a04] active:translate-y-[2px] active:shadow-none transition-all uppercase tracking-tighter border-2 border-indigo-950 disabled:opacity-50 text-sm"
          >
            {loading ? "Sensing..." : "Start Random Voyage"}
          </button>
        </div>

        {/* Localized Nearby Quest module */}
        <div className="bg-indigo-900 text-white rounded-[2rem] p-7 border-4 border-indigo-950 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] flex flex-col justify-between relative overflow-hidden group hover:translate-y-[-4px] transition-transform">
          <div className="absolute -right-8 -bottom-8 w-28 h-28 bg-yellow-400/10 rounded-full blur-xl group-hover:scale-125 transition-all"></div>
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-800 flex items-center justify-center text-yellow-300 mb-5 border-2 border-indigo-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.2)]">
              <Navigation className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight mb-2 flex items-center gap-2">
              Nearby Quest
              <span className="text-[10px] bg-yellow-400 text-indigo-900 font-extrabold px-2 py-0.5 rounded-full">GPS</span>
            </h3>
            <p className="text-indigo-200 text-sm leading-relaxed mb-6 font-medium">
              Use your device's geolocation to center the quest in or nearby your active country for a familiar and faster experience!
            </p>
          </div>
          <button
            onClick={handleStartGeo}
            disabled={loading || geolocating}
            className="w-full py-3.5 px-5 bg-cyan-400 hover:bg-cyan-350 text-indigo-950 font-black rounded-2xl shadow-[4px_4px_0px_0px_#0891b2] hover:shadow-[2px_2px_0px_0px_#0891b2] active:translate-y-[2px] active:shadow-none transition-all uppercase tracking-tighter border-2 border-indigo-950 disabled:opacity-50 text-sm"
          >
            {geolocating ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-indigo-950 border-t-transparent animate-spin"></span>
                Sensing GPS...
              </>
            ) : (
              <>
                Sensing Nearest Quest
              </>
            )}
          </button>
        </div>

        {/* Quest Instruction/Rulebook checklist card */}
        <div className="bg-white text-indigo-950 rounded-[2rem] p-7 border-4 border-indigo-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] flex flex-col justify-between hover:translate-y-[-4px] transition-transform">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center text-pink-700 mb-5 border-2 border-indigo-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)]">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight mb-3">Quest Directives</h3>
            <ul className="space-y-3 text-xs text-indigo-900 font-bold leading-normal">
              <li className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-black border border-indigo-950">✓</div>
                <span>Solve 3 simple, visible landmark clues generated dynamically by Gemini.</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-black border border-indigo-950">✓</div>
                <span>Drop pins on where you think the landmarks are.</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-black border border-indigo-950">✓</div>
                <span>Verification matches accurate metric coordinates instantly.</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-black border border-indigo-950">✓</div>
                <span>Reach the final treasure to build your Scorecard!</span>
              </li>
            </ul>
          </div>
          <p className="text-[10px] text-indigo-900/50 font-black font-mono text-center pt-4 border-t-2 border-indigo-900/10 mt-4 uppercase">
            Estimated game length: 5–10 minutes
          </p>
        </div>
      </div>

      {/* Select Start City Presets header */}
      <div className="border-t-4 border-indigo-950/40 pt-10 mt-6 relative">
        <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-6 flex items-center gap-3">
          <Globe className="w-6 h-6 text-yellow-350" />
          Choose a Starting Region or Custom Destination
        </h3>

        {/* Custom Input Card */}
        <div className="mb-8 p-6 bg-indigo-900 border-4 border-indigo-950 text-white rounded-[2rem] shadow-[6px_6px_0px_0px_rgba(0,0,0,0.35)] space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🗺️</span>
            <div>
              <h4 className="font-sans font-black text-lg uppercase tracking-tight">Custom Destination</h4>
              <p className="text-xs font-semibold text-indigo-200">Enter a city, country, or landmark state you want to explore! Gemini will custom generate the riddles.</p>
            </div>
          </div>
          <form onSubmit={handleCustomSubmit} className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={customCity}
              onChange={(e) => {
                setCustomCity(e.target.value);
                setSelectedCity(null); // Deselect presets
              }}
              placeholder="e.g. Paris, France or Tokyo, Japan or Egypt..."
              className="flex-1 px-5 py-3.5 bg-white text-indigo-950 placeholder-indigo-955/40 font-bold rounded-2xl border-4 border-indigo-950 focus:outline-none focus:ring-4 focus:ring-yellow-400 select-all"
            />
            <button
              type="submit"
              disabled={loading || !customCity.trim()}
              className="py-3.5 px-6 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-indigo-950 font-black rounded-2xl border-4 border-indigo-950 shadow-[4px_4px_0px_0px_#ca8a04] hover:shadow-[2px_2px_0px_0px_#ca8a04] active:translate-y-[2px] active:shadow-none transition-all uppercase tracking-tighter text-sm shrink-0"
            >
              {loading ? "Launching..." : "Launch Custom Voyage 🚀"}
            </button>
          </form>
        </div>

        <p className="text-xs font-black text-indigo-200 uppercase tracking-widest mb-4">Or choose from popular presets:</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {PRESET_CITIES.map((city, idx) => (
            <motion.div
              whileHover={{ y: -3 }}
              key={idx}
              onClick={() => {
                setSelectedCity(city.name);
                setCustomCity(''); // Clear manual entry
              }}
              className={`p-5 rounded-2xl border-4 text-left cursor-pointer transition-all relative overflow-hidden ${
                selectedCity === city.name
                  ? 'border-yellow-450 bg-white text-indigo-950 ring-4 ring-yellow-400/30 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.25)]'
                  : 'border-indigo-950 bg-indigo-850 text-white hover:bg-indigo-900 hover:border-white/30 shadow-md'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="font-black text-md tracking-tight uppercase">{city.name}</h4>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedCity === city.name ? 'border-indigo-900 bg-yellow-400' : 'border-indigo-950'
                }`}>
                  {selectedCity === city.name && <div className="w-2 h-2 rounded-full bg-indigo-900"></div>}
                </div>
              </div>
              <p className={`text-xs font-semibold leading-relaxed ${
                selectedCity === city.name ? 'text-indigo-900/75' : 'text-indigo-300'
              }`}>{city.desc}</p>
            </motion.div>
          ))}
        </div>

        {selectedCity && (
          <div className="flex justify-center mt-10">
            <motion.button
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={() => handleStartWithCity(selectedCity)}
              disabled={loading}
              className="py-4 px-10 rounded-3xl bg-yellow-400 hover:bg-yellow-300 text-indigo-950 font-black text-lg shadow-[0px_6px_0px_0px_#ca8a04] hover:shadow-[0px_3px_0px_0px_#ca8a04] active:translate-y-1.5 active:shadow-none transition-all uppercase tracking-tighter border-2 border-indigo-950 flex items-center gap-2"
            >
              <span>Launch Voyage inside {selectedCity.split(',')[0]}</span>
              <Sparkles className="w-5 h-5 animate-bounce" />
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}
