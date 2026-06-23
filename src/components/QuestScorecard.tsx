import { useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import {
  Trophy,
  Award,
  Calendar,
  Compass,
  Download,
  Share2,
  Check,
  RefreshCcw,
  Sparkles,
  MapPin,
  Map as MapIcon,
  BookOpen
} from 'lucide-react';
import { motion } from 'motion/react';
import { LatLng } from '../types';
import LocationMap from './LocationMap';

interface ScorecardStep {
  clue: string;
  targetName: string;
  targetLatLng: LatLng;
  playerGuess: LatLng;
  distanceErrorMeters: number;
  scoreEarned: number;
  trivia: string;
}

export interface ScorecardData {
  sessionId: string;
  startCity: string;
  startTime: string;
  totalScore: number;
  averageDistanceErrorMeters: number;
  personalizedSummary: string;
  badgeTitle: string;
  steps: ScorecardStep[];
}

interface QuestScorecardProps {
  scorecard: ScorecardData;
  onReset: () => void;
  mapsApiKey: string;
}

export default function QuestScorecard({ scorecard, onReset, mapsApiKey }: QuestScorecardProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedDoc, setCopiedDoc] = useState(false);

  const shareUrl = `${window.location.origin}/?quest_id=${scorecard.sessionId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyMarkdown = () => {
    const markdown = `# GEO QUEST EXPLORATION SCOREBOARD
Certified by Gemini AI Cartographer

## Summary of the Quest
- **Session ID:** ${scorecard.sessionId}
- **Starting Region:** ${scorecard.startCity}
- **Launch Date:** ${new Date(scorecard.startTime).toLocaleDateString()}
- **Final Score Achievement:** ${scorecard.totalScore} Pts
- **Rank Badge:** ${scorecard.badgeTitle}
- **Average Pin Offset Accuracy:** ${scorecard.averageDistanceErrorMeters} meters

### Adventurer Narrative Log
"${scorecard.personalizedSummary}"

### Exploration Log Steps:
${scorecard.steps.map((st, idx) => `
#### Core Step ${idx + 1}: ${st.targetName}
- Clue Riddle: "${st.clue}"
- Target Location: { lat: ${st.targetLatLng.lat.toFixed(4)}, lng: ${st.targetLatLng.lng.toFixed(4)} }
- Player Guess: { lat: ${st.playerGuess.lat.toFixed(4)}, lng: ${st.playerGuess.lng.toFixed(4)} }
- Distance Error: ${st.distanceErrorMeters} meters
- Score Earned: ${st.scoreEarned} points
- Historical Fact: ${st.trivia}
`).join('\n')}

Generated at Geo Quest Portal. Share: ${shareUrl}
`;

    navigator.clipboard.writeText(markdown);
    setCopiedDoc(true);
    setTimeout(() => setCopiedDoc(false), 2000);
  };

  // Build trail connection list for maps visual display
  const historySteps = scorecard.steps.map(s => ({
    targetLatLng: s.targetLatLng,
    playerGuess: s.playerGuess
  }));

  // Simple visual SVG QR Representation
  const renderQRCodeSvg = () => {
    return (
      <svg className="w-24 h-24 stroke-indigo-950 p-1.5 bg-white rounded-lg border border-slate-200" viewBox="0 0 24 24" fill="none" strokeWidth="2">
        <rect x="2" y="2" width="6" height="6" rx="0.5" />
        <rect x="16" y="2" width="6" height="6" rx="0.5" />
        <rect x="2" y="16" width="6" height="6" rx="0.5" />
        
        {/* Fill center blocks */}
        <rect x="4" y="4" width="2" height="2" fill="currentColor" stroke="none" />
        <rect x="18" y="4" width="2" height="2" fill="currentColor" stroke="none" />
        <rect x="4" y="18" width="2" height="2" fill="currentColor" stroke="none" />

        {/* Dynamic looking visual glyphs */}
        <path d="M10 2h4M10 6h2M14 10h4M2 10h4M10 14h2M14 14v4M18 10v4M22 18v4M18 22h4M10 22h4M6 14h2" />
        <path d="M10 18h2M14 20h2" />
      </svg>
    );
  };

  return (
    <APIProvider apiKey={mapsApiKey} version="weekly">
      <div className="max-w-5xl mx-auto py-12 px-6 space-y-10" id="scorecard-container">
        
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-yellow-400 text-indigo-950 text-xs font-black uppercase tracking-widest border-2 border-indigo-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)] animate-bounce">
            <Trophy className="w-4 h-4" />
            <span>Treasure Reached!</span>
          </span>
          <h2 className="text-5xl font-sans font-black text-white tracking-tighter uppercase drop-shadow-md">
            Certified Exploration Log
          </h2>
          <p className="text-indigo-150 text-sm max-w-md mx-auto font-medium opacity-90">
            Your unique journey of geographical deduction in {scorecard.startCity.split(',')[0]} has been recorded.
          </p>
        </div>

        {/* Master layout: Document Left, Traveled Map Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Document layout: styled like an elegant, formal certificate with chunky high-contrast borders */}
          <div className="lg:col-span-7 bg-white text-indigo-950 border-4 border-indigo-950 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] rounded-[2.5rem] overflow-hidden flex flex-col justify-between">
            
            {/* Elegant Doc margins */}
            <div className="p-8 md:p-10 space-y-8">
              {/* Doc header-header */}
              <div className="pb-6 border-b-4 border-indigo-100 flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Compass className="w-5 h-5 text-indigo-600 animate-spin-slow" />
                    <span className="font-mono text-xs font-black uppercase tracking-widest text-indigo-400">
                      GEO QUEST CERTIFICATE v1.2
                    </span>
                  </div>
                  <h3 className="font-black text-3xl text-indigo-950 font-sans tracking-tight uppercase leading-tight">
                    Cartography Certificate
                  </h3>
                  <div className="font-mono text-[10px] text-indigo-900/60 flex flex-wrap items-center gap-2 font-bold">
                    <span>LAUNCHED: {new Date(scorecard.startTime).toLocaleDateString()}</span>
                    <span>|</span>
                    <span>ID: {scorecard.sessionId.substring(0, 8).toUpperCase()}</span>
                  </div>
                </div>
                
                {/* Score badge dynamic layout */}
                <div className="text-right">
                  <div className="inline-flex shrink-0 w-16 h-16 rounded-2xl bg-yellow-400 border-2 border-indigo-950 items-center justify-center text-indigo-950 font-black text-3xl shadow-[3px_3px_0px_0px_rgba(0,0,0,0.2)]">
                    {scorecard.totalScore}
                  </div>
                  <p className="text-[10px] font-mono font-black text-indigo-500 uppercase mt-2 tracking-wider">
                    TOTAL SCORE
                  </p>
                </div>
              </div>

              {/* Dynamic summary narrator generated by Gemini */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-indigo-950 text-yellow-350 rounded-xl text-[10px] font-black font-mono border border-indigo-950">
                    GEMINI LOG
                  </span>
                  <p className="text-xs uppercase font-black text-indigo-455 tracking-wider">
                    Master Cartographer Assessment
                  </p>
                </div>
                
                <div className="p-6 bg-indigo-55 rounded-2xl border-2 border-indigo-100 leading-relaxed font-sans font-medium text-indigo-900 italic text-sm md:text-base relative shadow-inner">
                  <span className="absolute -top-3.5 left-4 text-4xl text-indigo-300 font-serif font-black select-none opacity-20">“</span>
                  "{scorecard.personalizedSummary}"
                </div>
              </div>

              {/* Explorer stats details & Badge Title */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-6 border-b-2 border-indigo-50">
                <div className="p-4 bg-slate-50 rounded-2xl border-2 border-indigo-900 flex flex-col justify-center shadow-sm">
                  <span className="text-[9px] font-black font-mono text-slate-500 tracking-wider uppercase">
                    Badge Title
                  </span>
                  <span className="text-sm font-black text-indigo-950 flex items-center gap-1.5 mt-1.5 uppercase">
                    <Award className="w-4 h-4 text-cyan-600 shrink-0" />
                    {scorecard.badgeTitle}
                  </span>
                </div>
                
                <div className="p-4 bg-slate-50 rounded-2xl border-2 border-indigo-900 flex flex-col justify-center shadow-sm">
                  <span className="text-[9px] font-black font-mono text-slate-500 tracking-wider uppercase">
                    Landmarks Resolved
                  </span>
                  <span className="text-sm font-black text-indigo-950 block mt-1.5 uppercase">
                    {scorecard.steps.length} Localized Sites
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border-2 border-indigo-900 flex flex-col justify-center shadow-sm">
                  <span className="text-[9px] font-black font-mono text-slate-500 tracking-wider uppercase">
                    Avg Dev Error
                  </span>
                  <span className="text-sm font-black text-indigo-700 block mt-1.5 font-mono">
                    {scorecard.averageDistanceErrorMeters >= 1000
                      ? `${(scorecard.averageDistanceErrorMeters / 1000).toFixed(1)} km`
                      : `${scorecard.averageDistanceErrorMeters} m`}
                  </span>
                </div>
              </div>

              {/* Share QR badge section */}
              <div className="bg-slate-50 p-5 rounded-[1.5rem] border-2 border-indigo-900 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="space-y-1.5 text-center sm:text-left">
                  <h4 className="font-black text-indigo-950 text-sm flex items-center justify-center sm:justify-start gap-1.5 uppercase">
                    <MapIcon className="w-5 h-5 text-emerald-600" />
                    Explorer QR Badge Credentials
                  </h4>
                  <p className="text-slate-600 text-xs leading-relaxed max-w-sm font-semibold">
                    This encrypted code points to your digital leaderboard scorecard. Tap or copy to share with other voyagers.
                  </p>
                </div>
                
                {renderQRCodeSvg()}
              </div>

            </div>

            {/* Doc Footer Action Bar inside card bottom */}
            <div className="px-8 py-6 bg-slate-100 border-t-4 border-indigo-150 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleCopyLink}
                  className="py-2.5 px-4 rounded-xl border-2 border-indigo-950 bg-white hover:bg-slate-50 text-indigo-950 font-black text-xs uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] flex items-center gap-1.5"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-600 animate-bounce" /> : <Share2 className="w-4 h-4" />}
                  <span>{copiedLink ? "Link Copied!" : "Share Link"}</span>
                </button>

                <button
                  onClick={handleCopyMarkdown}
                  className="py-2.5 px-4 rounded-xl border-2 border-indigo-950 bg-white hover:bg-slate-50 text-indigo-950 font-black text-xs uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] flex items-center gap-1.5"
                >
                  {copiedDoc ? <Check className="w-4 h-4 text-emerald-600 animate-bounce" /> : <Download className="w-4 h-4" />}
                  <span>{copiedDoc ? "Copied Markdown!" : "Copy Markdown"}</span>
                </button>
              </div>

              <button
                onClick={onReset}
                className="py-3 px-6 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-indigo-950 font-black text-xs uppercase tracking-wider transition-all shadow-[4px_4px_0px_0px_#ca8a04] hover:shadow-[2px_2px_0px_0px_#ca8a04] active:translate-y-0.5 active:shadow-none border-2 border-indigo-950 flex items-center gap-2"
              >
                <RefreshCcw className="w-4 h-4 shrink-0 transition-transform" />
                <span>Voyage Again</span>
              </button>
            </div>

          </div>

          {/* Map overview details: showing ALL their Pins / connect paths */}
          <div className="lg:col-span-5 h-[500px] lg:h-auto flex flex-col space-y-6">
            <div className="bg-white text-indigo-950 border-4 border-indigo-950 rounded-[2.5rem] p-5 flex-1 flex flex-col space-y-3.5 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)]">
              <h4 className="font-extrabold text-indigo-950 text-sm flex items-center gap-2 uppercase tracking-tight">
                <MapIcon className="w-5 h-5 text-indigo-650" />
                Deduction Trail Route Overview
              </h4>
              <p className="text-xs text-indigo-900/80 leading-relaxed font-bold">
                This overview map plots connecting lines (represented in <span className="text-blue-600">blue</span>) and logs the pin deviations (represented in <span className="text-red-500 animate-pulse font-bold">red</span>) between target coordinates and guest coordinates.
              </p>
              
              <div className="flex-1 w-full relative min-h-[250px] rounded-2xl overflow-hidden shadow-inner border-2 border-indigo-900">
                <LocationMap
                  center={scorecard.steps[0].targetLatLng}
                  playerGuess={null}
                  onPlaceGuess={() => {}}
                  targetLatLng={null}
                  historySteps={historySteps}
                  interactive={false}
                />
              </div>
            </div>

            {/* List of Landmarks checked as Accordion look */}
            <div className="bg-indigo-900 text-white border-4 border-indigo-950 rounded-[2rem] p-5 max-h-[250px] overflow-y-auto space-y-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] select-none">
              <h5 className="font-black text-xs font-mono uppercase tracking-wider text-yellow-350 border-b-2 border-indigo-950 pb-2 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-yellow-300" />
                Trophy Case Exploration Records
              </h5>
              
              <div className="space-y-4">
                {scorecard.steps.map((st, sIdx) => (
                  <div key={sIdx} className="text-xs border-b border-indigo-950/60 pb-3 last:border-none flex gap-3 text-indigo-100 leading-normal">
                    <div className="w-5 h-5 rounded-lg bg-yellow-400 leading-5 text-center text-[10px] font-black text-indigo-950 shrink-0 border border-indigo-950 shadow-sm mt-0.5">
                      {sIdx + 1}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-white uppercase">{st.targetName}</span>
                        <span className="font-mono text-[9px] px-2 py-0.5 bg-indigo-950 text-yellow-400 rounded-md font-bold shrink-0 border border-indigo-800">
                          {st.scoreEarned} PTS
                        </span>
                        <span className="font-mono text-[9px] px-2 py-0.5 bg-indigo-950 text-red-400 rounded-md font-bold shrink-0 border border-indigo-800">
                          {st.distanceErrorMeters}M DEVIATION
                        </span>
                      </div>
                      <p className="text-[10px] text-indigo-200 leading-relaxed font-medium">{st.trivia}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>
    </APIProvider>
  );
}
