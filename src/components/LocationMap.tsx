import { useEffect, useState } from 'react';
import { Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { LatLng } from '../types';

interface LocationMapProps {
  center: LatLng;
  zoom?: number;
  playerGuess: LatLng | null;
  onPlaceGuess: (coords: LatLng) => void;
  targetLatLng?: LatLng | null;
  historySteps?: { targetLatLng: LatLng; playerGuess: LatLng | null }[];
  interactive?: boolean;
}

// Custom hook to draw flight path or trails on the maps instance
function MapTrails({ historySteps }: { historySteps: { targetLatLng: LatLng; playerGuess: LatLng | null }[] }) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib || !historySteps || historySteps.length === 0) return;

    const polylines: google.maps.Polyline[] = [];

    // 1. Draw connecting trails between target landmarks
    const pathCoordinates = historySteps.map(step => step.targetLatLng);
    if(pathCoordinates.length > 1) {
      const trail = new google.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: '#3B82F6', // Blue-500
        strokeOpacity: 0.8,
        strokeWeight: 4,
        icons: [{
          icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW },
          offset: '100%',
          repeat: '100px'
        }]
      });
      trail.setMap(map);
      polylines.push(trail);
    }

    // 2. Draw dashed lines connecting target to player's guesses to highlight the error visual offset
    historySteps.forEach(step => {
      if (step.playerGuess) {
        const offsetLine = new google.maps.Polyline({
          path: [step.targetLatLng, step.playerGuess],
          geodesic: true,
          strokeColor: '#EF4444', // Red-500
          strokeOpacity: 0.6,
          strokeWeight: 2,
          style: 'dashed', // visual dash indicator using standard symbol dashes
          icons: [{
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 0.8,
              scale: 2
            },
            offset: '0',
            repeat: '20px'
          }]
        } as any);
        offsetLine.setMap(map);
        polylines.push(offsetLine);
      }
    });

    // Fit map bounds to encompass all positions
    const bounds = new google.maps.LatLngBounds();
    historySteps.forEach(s => {
      bounds.extend(s.targetLatLng);
      if (s.playerGuess) bounds.extend(s.playerGuess);
    });
    map.fitBounds(bounds);

    return () => {
      polylines.forEach(p => p.setMap(null));
    };
  }, [map, mapsLib, historySteps]);

  return null;
}

export default function LocationMap({
  center,
  zoom = 13,
  playerGuess,
  onPlaceGuess,
  targetLatLng,
  historySteps,
  interactive = true
}: LocationMapProps) {
  const map = useMap();

  // Keep track of map clicks
  const handleMapClick = (ev: any) => {
    if (!interactive) return;
    const latLng = ev.detail?.latLng || ev.latLng;
    if (latLng) {
      onPlaceGuess({
        lat: typeof latLng.lat === 'function' ? latLng.lat() : latLng.lat,
        lng: typeof latLng.lng === 'function' ? latLng.lng() : latLng.lng
      });
    }
  };

  // Center on step coordinates update
  useEffect(() => {
    if (map && center) {
      map.panTo(center);
    }
  }, [map, center]);

  return (
    <div className="relative w-full h-full min-h-[400px] md:min-h-0 bg-slate-900 rounded-2xl overflow-hidden shadow-inner border border-slate-800">
      <Map
        defaultCenter={center}
        defaultZoom={zoom}
        gestureHandling={interactive ? 'cooperative' : 'none'}
        disableDefaultUI={!interactive}
        onClick={handleMapClick}
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Render temporary interactive guess pin dropped by player */}
        {playerGuess && (
          <AdvancedMarker position={playerGuess} title="Your Guess Location">
            <Pin background="#ef4444" glyphColor="#ffffff" borderColor="#b91c1c" scale={1.2}>
              <span className="font-mono text-[9px] font-bold text-white">GUESS</span>
            </Pin>
          </AdvancedMarker>
        )}

        {/* Render target actual answer marker once guess result is active */}
        {targetLatLng && (
          <AdvancedMarker position={targetLatLng} title="Correct Answer Landmark">
            <Pin background="#10b981" glyphColor="#ffffff" borderColor="#047857" scale={1.2}>
              <span className="font-mono text-[9px] font-bold text-white">TARGET</span>
            </Pin>
          </AdvancedMarker>
        )}

        {/* Render entire travel paths polylines for historic summaries if available */}
        {historySteps && historySteps.length > 0 && (
          <>
            <MapTrails historySteps={historySteps} />
            {historySteps.map((step, idx) => (
              <span key={idx}>
                <AdvancedMarker position={step.targetLatLng} title={`Step ${idx + 1} Target`}>
                  <Pin background="#10b981" glyphColor="#ffffff">
                    <span className="text-xs font-semibold">{idx + 1}</span>
                  </Pin>
                </AdvancedMarker>
                {step.playerGuess && (
                  <AdvancedMarker position={step.playerGuess} title={`Step ${idx + 1} Guess`}>
                    <Pin background="#ef4444" glyphColor="#ffffff">
                      <span className="text-[10px] font-semibold">G{idx + 1}</span>
                    </Pin>
                  </AdvancedMarker>
                )}
              </span>
            ))}
          </>
        )}
      </Map>

      {interactive && (
        <div className="absolute top-3 left-3 bg-slate-950/92 backdrop-blur-md text-white py-1.5 px-3 rounded-lg text-[11px] font-medium flex items-center gap-2 border border-slate-800 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Click on the map to place/adjust your guess pin</span>
        </div>
      )}
    </div>
  );
}
