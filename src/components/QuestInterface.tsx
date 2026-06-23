import { useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import {
  HelpCircle,
  Trophy,
  Navigation,
  ArrowRight,
  RotateCcw,
  Sparkles,
  MapPin,
  Compass,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LatLng } from '../types';
import LocationMap from './LocationMap';

interface QuestStepInfo {
  clue: string;
  stepIndex: number;
  totalSteps: number;
}

interface QuestSessionInfo {
  sessionId: string;
  startCity: string;
  startLatLng: LatLng;
  currentStep: QuestStepInfo;
  totalScore: number;
  completed: boolean;
}

interface GuessResult {
  success: boolean;
  distanceMeters: number;
  scoreEarned: number;
  trivia: string;
  targetLatLng: LatLng;
  targetName: string;
  hasNext: boolean;
}

interface QuestInterfaceProps {
  session: QuestSessionInfo;
  onGuessSubmit: (coords: LatLng) => Promise<GuessResult>;
  onNextClue: () => void;
  onAbandon: () => void;
  mapsApiKey: string;
}

export default function QuestInterface({
  session,
  onGuessSubmit,
  onNextClue,
  onAbandon,
  mapsApiKey
}: QuestInterfaceProps) {
  const [playerGuess, setPlayerGuess] = useState<LatLng | null>(null);
  const [guessResult, setGuessResult] = useState<GuessResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHelper, setShowHelper] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handlePlaceGuess = (coords: LatLng) => {
    if (guessResult) return; // Locked once guessed
    setPlayerGuess(coords);
    setError(null);
  };

  const handleSubmitGuess = async () => {
    if (!playerGuess) return;
    setLoading(true);
    setError(null);
    try {
      const res = await onGuessSubmit(playerGuess);
      setGuessResult(res);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to check coordinates on server.");
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = () => {
    setPlayerGuess(null);
    setGuessResult(null);
    setError(null);
    onNextClue();
  };

  return (
    <APIProvider apiKey={mapsApiKey} version="weekly">
      <div className="w-full h-[calc(100vh-80px)] flex flex-col md:flex-row bg-indigo-950 overflow-hidden" id="quest-container">
        
        {/* Left Side Pane: Instructions, Clues, Status Tracking */}
        <div className="w-full md:w-[440px] shrink-0 bg-indigo-900 border-r-4 border-indigo-950 flex flex-col justify-between overflow-y-auto shadow-2xl z-10">
          
          {/* Header Progress Tracker with Vibrant theme styling */}
          <div className="p-5 border-b-4 border-indigo-950 bg-indigo-950/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-yellow-300 animate-spin-slow" />
              <span className="font-sans font-black text-sm text-yellow-300 tracking-tight uppercase">
                {session.startCity.split(',')[0]} Voyage
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-400 border-2 border-indigo-950 rounded-xl font-black text-xs text-indigo-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] animate-pulse">
                <Trophy className="w-3.5 h-3.5 shrink-0" />
                <span>{session.totalScore} Pts</span>
              </div>
              <span className="text-xs font-black text-indigo-200 bg-indigo-950 px-2 py-1 rounded-lg border border-indigo-800">
                {session.currentStep.stepIndex + 1}/{session.currentStep.totalSteps}
              </span>
            </div>
          </div>

          {/* Core Content Body */}
          <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              
              {/* Clue Panel styled like play card in Vibrant Palette */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-200 font-mono">
                    Gemini Cartography Clue
                  </span>
                  <div className="flex-1 h-[2px] bg-indigo-850"></div>
                </div>
                
                <div className="bg-white text-indigo-950 rounded-[2rem] p-6 border-4 border-indigo-950 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] relative flex flex-col min-h-48 justify-center">
                  <div className="absolute -top-4 -right-4 bg-cyan-400 w-12 h-12 rounded-full flex items-center justify-center text-white text-xl rotate-12 shadow-lg border-2 border-indigo-950">
                    ✨
                  </div>
                  
                  <span className="text-xs uppercase font-black text-indigo-400 mb-2 tracking-widest block">
                    Clue #{session.currentStep.stepIndex + 1}
                  </span>
                  
                  <p className="text-md md:text-lg leading-relaxed font-black mb-3">
                    The Mystery Spot...
                  </p>
                  
                  <p className="text-sm md:text-base font-medium leading-relaxed opacity-90 text-indigo-900 italic">
                    "{session.currentStep.clue}"
                  </p>
                </div>
              </div>

              {/* Guide card */}
              <AnimatePresence>
                {showHelper && !playerGuess && !guessResult && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-cyan-950/40 border-2 border-cyan-500/30 rounded-2xl text-cyan-200 text-xs font-bold space-y-2 relative"
                  >
                    <p className="flex items-center gap-1.5 font-black text-cyan-300">
                      <Sparkles className="w-4 h-4 text-yellow-300" />
                      HOW TO PINPOINT THE LOCATION:
                    </p>
                    <p className="leading-relaxed opacity-90 font-medium">
                      Navigate & scan the map on the right. Tap or left-click directly to drop your estimate guess marker. You can click elsewhere to correct it!
                    </p>
                    <button
                      onClick={() => setShowHelper(false)}
                      className="absolute top-2 right-2 text-cyan-400 hover:text-cyan-200 font-black cursor-pointer text-sm"
                    >
                      ✕
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Guess Outcome Revealed Cards */}
              {guessResult && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Results box with heavy thick border */}
                  <div className={`p-5 rounded-[2rem] border-4 ${
                    guessResult.success
                      ? 'bg-emerald-500 text-white border-indigo-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.25)]'
                      : 'bg-yellow-400 text-indigo-950 border-indigo-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.25)]'
                  }`}>
                    
                    <div className="flex items-start gap-4 mb-3.5">
                      <div className={`w-11 h-11 rounded-xl shrink-0 flex items-center justify-center border-2 border-indigo-950 shadow-sm ${
                        guessResult.success ? 'bg-white text-emerald-600' : 'bg-indigo-900 text-yellow-400'
                      }`}>
                        {guessResult.success ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-black tracking-widest opacity-80 font-mono">
                          {guessResult.success ? 'DIRECT MATCH FOUND!' : 'OFFSET LOGGED'}
                        </span>
                        <h4 className="font-sans font-black text-lg leading-tight uppercase">
                          {guessResult.targetName}
                        </h4>
                      </div>
                    </div>

                    {/* Stats metrics with nice rounded inner panels */}
                    <div className="grid grid-cols-2 gap-3 mb-4 text-center">
                      <div className="py-2.5 px-3 bg-indigo-950/20 rounded-2xl border border-indigo-950/30">
                        <p className="text-[10px] uppercase opacity-75 font-black">Accuracy Range</p>
                        <p className="text-xl font-black font-mono">
                          {guessResult.distanceMeters >= 1000
                            ? `${(guessResult.distanceMeters / 1000).toFixed(1)} km`
                            : `${guessResult.distanceMeters} m`}
                        </p>
                      </div>
                      <div className="py-2.5 px-3 bg-indigo-950/20 rounded-2xl border border-indigo-950/30">
                        <p className="text-[10px] uppercase opacity-75 font-black">Score Gained</p>
                        <p className="text-xl font-black font-mono">
                          +{guessResult.scoreEarned} pts
                        </p>
                      </div>
                    </div>

                    {/* Trivia content */}
                    <div className="space-y-1.5 border-t border-indigo-950/20 pt-3">
                      <p className="text-[10.5px] uppercase font-black tracking-wider flex items-center gap-1 select-none">
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                        Cartology Factoid Log
                      </p>
                      <p className="text-xs leading-relaxed font-bold opacity-90">
                        {guessResult.trivia}
                      </p>
                    </div>

                  </div>
                </motion.div>
              )}
            </div>

            {/* User Interaction Trigger Buttons with Playful 3D Tactile shadows */}
            <div className="space-y-4 pt-6 border-t-2 border-indigo-950/30">
              
              {error && (
                <div className="p-3 bg-red-950/40 border-2 border-red-500/40 text-red-200 text-xs font-bold rounded-xl flex items-center gap-2 select-none">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              {!guessResult ? (
                <>
                  <button
                    onClick={handleSubmitGuess}
                    disabled={!playerGuess || loading}
                    className="w-full py-4 px-5 bg-yellow-400 hover:bg-yellow-300 text-indigo-950 font-black text-md rounded-2xl shadow-[4px_4px_0px_0px_#ca8a04] hover:shadow-[2px_2px_0px_0px_#ca8a04] active:translate-y-[2px] active:shadow-none transition-all uppercase tracking-tighter border-2 border-indigo-950 disabled:bg-indigo-900/60 disabled:text-indigo-600 disabled:border-indigo-850 disabled:shadow-none"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 rounded-full border-2 border-indigo-950 border-t-transparent animate-spin"></span>
                        Calibrating Pin...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Navigation className="w-4 h-4 text-indigo-950 rotate-45" />
                        Confirm Clue Guess Location
                      </span>
                    )}
                  </button>
                  
                  <button
                    onClick={onAbandon}
                    className="w-full py-2.5 px-4 rounded-xl border-2 border-indigo-800 hover:border-yellow-300 hover:text-yellow-305 text-indigo-300 text-xs font-black uppercase tracking-wider transition-all select-none"
                  >
                    Abandon Voyage Progress
                  </button>
                </>
              ) : (
                <button
                  onClick={handleProceed}
                  className="w-full py-4 px-5 bg-cyan-400 hover:bg-cyan-350 text-indigo-950 font-black text-md rounded-2xl shadow-[4px_4px_0px_0px_#0891b2] hover:shadow-[2px_2px_0px_0px_#0891b2] active:translate-y-[2px] active:shadow-none transition-all uppercase tracking-tighter border-2 border-indigo-950 flex items-center justify-center gap-2"
                >
                  <span>{guessResult.hasNext ? "Receive Next Riddle" : "Unlock Cartography Certificate"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              
            </div>

          </div>
        </div>

        {/* Right Side Pane: Interactive World/City Google Map with thick border frame */}
        <div className="flex-1 w-full h-full relative border-l-4 border-indigo-950" id="quest-map-pane">
          <LocationMap
            center={session.startLatLng}
            playerGuess={playerGuess}
            onPlaceGuess={handlePlaceGuess}
            targetLatLng={guessResult ? guessResult.targetLatLng : null}
            interactive={!guessResult}
          />
        </div>

      </div>
    </APIProvider>
  );
}
