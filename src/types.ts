export interface LatLng {
  lat: number;
  lng: number;
}

export interface QuestStep {
  clue: string;
  targetName: string;
  targetLatLng: LatLng;
  trivia: string;
  playerGuess: LatLng | null;
  distanceErrorMeters: number | null;
  scoreEarned: number;
  success: boolean | null;
}

export interface QuestSession {
  sessionId: string;
  startCity: string;
  startLatLng: LatLng;
  steps: QuestStep[];
  currentStepIndex: number;
  totalScore: number;
  completed: boolean;
  startTime: string;
}

export interface ScorecardData {
  sessionId: string;
  startCity: string;
  startTime: string;
  totalScore: number;
  totalDistanceErrorMeters: number;
  steps: {
    clue: string;
    targetName: string;
    targetLocation: LatLng;
    playerGuess: LatLng;
    distanceError: number;
    score: number;
    trivia: string;
  }[];
}
