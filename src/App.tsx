import { useState, useEffect } from 'react';
import { Compass, Globe, Sparkles, AlertTriangle, Play, CheckCircle, HelpCircle, X, ExternalLink } from 'lucide-react';
import QuestLobby from './components/QuestLobby';
import QuestInterface from './components/QuestInterface';
import QuestScorecard, { ScorecardData } from './components/QuestScorecard';
import { LatLng } from './types';

const MAPS_API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const hasValidKey = Boolean(MAPS_API_KEY) && MAPS_API_KEY !== 'YOUR_API_KEY' && MAPS_API_KEY !== '';

export default function App() {
  const [view, setView] = useState<'lobby' | 'quest' | 'scorecard'>('lobby');
  const [session, setSession] = useState<any>(null);
  const [scorecard, setScorecard] = useState<ScorecardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMapsHelp, setShowMapsHelp] = useState(false);

  // Check if a shared quest scorecard is specified via URL search parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedQuestId = params.get('quest_id');
    if (sharedQuestId) {
      loadScorecard(sharedQuestId);
    }
  }, []);

  const loadScorecard = async (sId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/quest/scorecard/${sId}`);
      if (!response.ok) throw new Error("Could not find this shared scorecard.");
      const data = await response.json();
      setScorecard(data);
      setView('scorecard');
    } catch (err: any) {
      setError(err.message || "Failed to retrieve the scorecard card.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuest = async (configs: { prefCity?: string; useCoords?: boolean; lat?: number; lng?: number }) => {
    setLoading(true);
    setError(null);
    try {
      const payload: any = {};
      if (configs.prefCity) payload.prefCity = configs.prefCity;
      if (configs.useCoords) {
        payload.userLatitude = configs.lat;
        payload.userLongitude = configs.lng;
      }

      const response = await fetch('/api/quest/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to start quest session.");
      }

      const sessionData = await response.json();
      setSession(sessionData);
      setView('quest');
    } catch (err: any) {
      setError(err.message || "Unable to start voyage due to Gemini or network delay. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuessSubmit = async (coords: LatLng) => {
    if (!session) throw new Error("No active session.");
    const response = await fetch('/api/quest/guess', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId: session.sessionId,
        lat: coords.lat,
        lng: coords.lng
      })
    });

    if (!response.ok) {
      let errMsg = "Coordinate checking failed on server.";
      try {
        const errData = await response.json();
        if (errData && errData.error) {
          errMsg = errData.error;
        }
      } catch (e) {}
      throw new Error(errMsg);
    }

    const verificationResult = await response.json();

    // Update session score & steps stats
    setSession((prev: any) => ({
      ...prev,
      totalScore: verificationResult.totalScore,
      completed: verificationResult.completed
    }));

    return verificationResult;
  };

  const handleNextClue = async () => {
    if (!session) return;
    setLoading(true);
    try {
      if (session.completed) {
        // Fetch and load finalized scoreboard cert
        const resp = await fetch(`/api/quest/scorecard/${session.sessionId}`);
        if (!resp.ok) throw new Error("Failed to compile scorecard cert.");
        const cardData = await resp.json();
        setScorecard(cardData);
        setView('scorecard');
      } else {
        // Sync & update next step index of session
        const resp = await fetch(`/api/quest/session/${session.sessionId}`);
        if (!resp.ok) throw new Error("Failed syncing active state.");
        const syncedData = await resp.json();
        
        setSession((prev: any) => ({
          ...prev,
          currentStep: {
            clue: syncedData.steps[syncedData.currentStepIndex].clue,
            stepIndex: syncedData.currentStepIndex,
            totalSteps: syncedData.steps.length
          }
        }));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAbandon = () => {
    if (confirm("Are you sure you want to abandon your current voyage progress?")) {
      setView('lobby');
      setSession(null);
      setScorecard(null);
      // Clean query search param to enable fresh start
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const handleReset = () => {
    setView('lobby');
    setSession(null);
    setScorecard(null);
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  // 1. Mandatory API Key Splash Screen fallback if process.env key is absent or undefined
  if (!hasValidKey) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white p-6 font-sans select-none" id="setup-splash">
        <div className="max-w-xl w-full bg-slate-950/80 backdrop-blur-md rounded-3xl p-8 border border-slate-800 shadow-2xl space-y-8">
          
          <div className="text-center space-y-3">
            <div className="inline-flex w-14 h-14 bg-indigo-500/20 text-indigo-400 items-center justify-center rounded-2xl border border-indigo-500/30 shadow-sm animate-pulse mb-1">
              <Compass className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight">Geo Quest Portal</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Google Maps Platform credentials are required to render world maps, locate street tags, and verify coordinates.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Easy Integration Configuration Steps
            </h3>
            
            <ul className="space-y-3.5 text-xs text-slate-400 font-medium">
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-full flex items-center justify-center font-bold shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <a 
                    href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" 
                    target="_blank" 
                    rel="noopener"
                    className="text-indigo-400 hover:underline font-bold"
                  >
                    Obtain a Google Maps API Key
                  </a>
                  <p className="opacity-80 mt-0.5">Create your developer platform token from Google Cloud Platform Console.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-full flex items-center justify-center font-bold shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <p className="text-slate-300 font-bold">Inject Variable as a Secret API Key</p>
                  <p className="opacity-80 mt-0.5">Open AI Studio settings (⚙️ gear icon, top-right corner) → Secrets → enter name <code className="font-mono text-indigo-300 bg-slate-950 px-1 py-0.5 rounded border border-slate-800">GOOGLE_MAPS_PLATFORM_KEY</code> → paste key token.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-full flex items-center justify-center font-bold shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <p className="text-slate-300 font-bold">Verify Gemini API Secrets</p>
                  <p className="opacity-80 mt-0.5">Make sure <code className="font-mono text-indigo-300 bg-slate-950 px-1 py-0.5 rounded border border-slate-800">GEMINI_API_KEY</code> is also declared for clue creations.</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-500 font-medium">
            The application will automatically compile and reload once the secret keys are connected.
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-indigo-600 text-white flex flex-col justify-between font-sans selection:bg-yellow-300 selection:text-indigo-900 overflow-x-hidden">
      
      {/* Dynamic Vibrant Header */}
      <nav className="w-full bg-indigo-700/80 backdrop-blur-md border-b-4 border-indigo-950/40 shrink-0 h-20 flex items-center justify-between px-6 md:px-8 select-none z-10 shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-400 text-indigo-900 w-11 h-11 rounded-xl flex items-center justify-center font-black text-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,0.25)] border-2 border-indigo-900 scale-100 active:scale-95 transition-transform cursor-pointer" onClick={handleReset}>
            G
          </div>
          <span className="font-black text-2xl tracking-tighter uppercase text-white cursor-pointer hover:text-yellow-300 transition-colors" onClick={handleReset}>
            Geo Quest
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowMapsHelp(true)}
            className="flex items-center gap-1.5 py-2 px-3 bg-red-505/10 bg-yellow-400 text-indigo-950 border-2 border-indigo-950 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-yellow-350 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] active:translate-y-0.5"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Map Error Fix?</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 bg-indigo-900/40 px-3.5 py-1.5 rounded-xl border border-white/10 text-xs font-mono text-indigo-200 font-bold">
            <Globe className="w-4 h-4 animate-spin-slow text-yellow-350" />
            <span>UTC LIVE: 2026-05-22</span>
          </div>
          
          {view !== 'lobby' && (
            <button
              onClick={handleReset}
              className="py-2 px-4 bg-white/10 hover:bg-white/20 border-2 border-white/20 hover:border-white/40 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all active:translate-y-0.5"
            >
              Back to Lobby
            </button>
          )}
        </div>
      </nav>

      {/* Main interactive area */}
      <main className="flex-1 w-full flex flex-col justify-center">
        {view === 'lobby' && (
          <QuestLobby
            onStartQuest={handleStartQuest}
            loading={loading}
            error={error}
          />
        )}

        {view === 'quest' && session && (
          <QuestInterface
            session={session}
            onGuessSubmit={handleGuessSubmit}
            onNextClue={handleNextClue}
            onAbandon={handleAbandon}
            mapsApiKey={MAPS_API_KEY}
          />
        )}

        {view === 'scorecard' && scorecard && (
          <QuestScorecard
            scorecard={scorecard}
            onReset={handleReset}
            mapsApiKey={MAPS_API_KEY}
          />
        )}
      </main>



      {/* Troubleshooter Modal for ApiNotActivatedMapError */}
      {showMapsHelp && (
        <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn" id="troubleshoot-modal">
          <div className="bg-white text-indigo-950 border-4 border-indigo-950 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.35)] rounded-[2.5rem] max-w-xl w-full p-6 md:p-8 relative space-y-6">
            
            <button
              onClick={() => setShowMapsHelp(false)}
              className="absolute top-4 right-4 text-indigo-950 hover:text-indigo-600 font-black cursor-pointer bg-slate-105 p-1 rounded-full border-2 border-indigo-950 bg-slate-100 transition-transform hover:scale-105 active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="space-y-2 text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 border-2 border-red-650 text-red-750 text-xs font-black rounded-lg uppercase tracking-wide">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                ApiNotActivatedMapError
              </span>
              <h3 className="text-2xl font-black uppercase tracking-tight">How to Activate your Map API</h3>
              <p className="text-slate-600 text-xs font-semibold leading-relaxed">
                If the map is grey, displays "development purposes only", or throws <code className="bg-slate-100 px-1 py-0.5 rounded text-red-650 font-mono text-[11px] font-bold">ApiNotActivatedMapError</code>, you must enable the APIs in your Google Cloud Platform (GCP) console.
              </p>
            </div>

            <div className="bg-slate-50 border-2 border-indigo-900 rounded-3xl p-5 space-y-4">
              <h4 className="font-extrabold text-sm flex items-center gap-1.5 uppercase tracking-tight text-indigo-950">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-indigo-950"></span>
                Instant Solution Checklist
              </h4>
              
              <ol className="space-y-4 text-xs text-indigo-900 font-bold leading-normal">
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 bg-yellow-400 border-2 border-indigo-950 text-indigo-950 rounded-full flex items-center justify-center font-black shrink-0 text-[10px] mt-0.5">
                    1
                  </span>
                  <div>
                    <a
                      href="https://console.cloud.google.com/apis/library?utm_campaign=gmp-code-assist-ais"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline flex items-center gap-1 font-black"
                    >
                      <span>Open Google Cloud API Library</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <p className="opacity-75 mt-0.5 font-medium">Log into the GCP Account containing your Google Maps API Key.</p>
                  </div>
                </li>
                
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 bg-yellow-400 border-2 border-indigo-950 text-indigo-950 rounded-full flex items-center justify-center font-black shrink-0 text-[10px] mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="text-indigo-955">Activate "Maps JavaScript API"</p>
                    <p className="opacity-75 mt-0.5 font-medium">Search for <span className="underline select-all text-indigo-700">Maps JavaScript API</span> in the library, click into it, and hit the blue <span className="font-extrabold uppercase text-indigo-700">ENABLE</span> button.</p>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 bg-yellow-400 border-2 border-indigo-950 text-indigo-950 rounded-full flex items-center justify-center font-black shrink-0 text-[10px] mt-0.5">
                    3
                  </span>
                  <div>
                    <p className="text-indigo-955">Activate "Places API" & "Geocoding API"</p>
                    <p className="opacity-75 mt-0.5 font-medium">Also search and click <span className="font-extrabold uppercase text-indigo-750">ENABLE</span> on the <span className="underline select-all text-indigo-710">Places API</span> and <span className="underline select-all text-indigo-710">Geocoding API</span>. These are required for coordinate checks.</p>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 bg-yellow-400 border-2 border-indigo-950 text-indigo-950 rounded-full flex items-center justify-center font-black shrink-0 text-[10px] mt-0.5">
                    4
                  </span>
                  <div>
                    <p className="text-indigo-955">Pragmatic Delay (Wait & Refresh)</p>
                    <p className="opacity-75 mt-0.5 font-medium">Google requires <strong className="text-indigo-950 font-black">2 to 3 minutes</strong> to sync enables across global servers. Refresh the app page afterwards, and you're good to go!</p>
                  </div>
                </li>
              </ol>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => setShowMapsHelp(false)}
                className="py-3 px-8 bg-indigo-955 hover:bg-slate-800 text-indigo-950 bg-yellow-400 font-extrabold rounded-2xl border-2 border-indigo-950 text-xs uppercase tracking-wider transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)] active:translate-y-0.5"
              >
                Understood, Got It!
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
