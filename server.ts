import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Gemini API client on the server securely
const geminiApiKey = process.env.GEMINI_API_KEY || "";
const googleMapsApiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || "";

const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Cities list with central coordinates to seed the quest generator
const STARTING_CITIES = [
  { name: "Rome, Italy", lat: 41.9028, lng: 12.4964 },
  { name: "Tokyo, Japan", lat: 35.6762, lng: 139.6503 },
  { name: "Paris, France", lat: 48.8566, lng: 2.3522 },
  { name: "New York City, USA", lat: 40.7128, lng: -74.0060 },
  { name: "Sydney, Australia", lat: -33.8688, lng: 151.2093 },
  { name: "Cairo, Egypt", lat: 30.0444, lng: 31.2357 },
  { name: "London, United Kingdom", lat: 51.5074, lng: -0.1278 },
  { name: "San Francisco, USA", lat: 37.7749, lng: -122.4194 },
  { name: "Rio de Janeiro, Brazil", lat: -22.9068, lng: -43.1729 },
  { name: "Cape Town, South Africa", lat: -33.9249, lng: 18.4241 },
  { name: "Kyoto, Japan", lat: 35.0116, lng: 135.7681 },
  { name: "Barcelona, Spain", lat: 41.3851, lng: 2.1734 }
];

// Simple in-memory session store
interface QuestStep {
  clue: string;
  targetName: string;
  targetLatLng: { lat: number; lng: number };
  trivia: string;
  playerGuess: { lat: number; lng: number } | null;
  distanceErrorMeters: number | null;
  scoreEarned: number;
  success: boolean | null;
}

interface QuestSession {
  sessionId: string;
  startCity: string;
  startLatLng: { lat: number; lng: number };
  steps: QuestStep[];
  currentStepIndex: number;
  totalScore: number;
  completed: boolean;
  startTime: string;
}

const sessions = new Map<string, QuestSession>();

// Haversine formula to compute distance in meters between two coordinates
function getHaversineDistance(c1: { lat: number; lng: number }, c2: { lat: number; lng: number }): number {
  const R = 6371000; // Radius of earth in meters
  const dLat = (c2.lat - c1.lat) * Math.PI / 180;
  const dLng = (c2.lng - c1.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(c1.lat * Math.PI / 180) * Math.cos(c2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Safely and robustly parses coordinates that could be strings, numbers, or contain directional suffixes or degree symbols
function parseCoordinate(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }
  const str = String(val).trim();
  // Remove degrees, minutes, seconds symbols and directions (N, S, E, W)
  const cleaned = str.replace(/[°'\"NESWnesw\s]/g, "");
  const num = parseFloat(cleaned);
  const isNegative = /[SWsw]/.test(str);
  if (isNaN(num)) return 0;
  return isNegative ? -Math.abs(num) : num;
}

// Robust fallback wrapper over generateContent to retry across available developer models under high load
async function generateContentWithFallback(options: {
  contents: string;
  config?: any;
}) {
  const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  const maxRetriesPerModel = 3;
  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
      try {
        console.log(`Trying Gemini model: ${model} (Attempt ${attempt}/${maxRetriesPerModel})`);
        const response = await ai.models.generateContent({
          model: model,
          contents: options.contents,
          config: options.config,
        });
        if (response) {
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err.message || String(err);
        console.warn(`Gemini model ${model} (Attempt ${attempt}) failed:`, errMsg);

        // If it's a 404 or 400, or invalid model, no point in retrying this model
        if (
          errMsg.includes("404") || 
          errMsg.includes("NOT_FOUND") || 
          errMsg.includes("400") || 
          errMsg.includes("INVALID_ARGUMENT") ||
          errMsg.includes("not found for API version")
        ) {
          break; // Break the retry loop for this model and move to next model
        }

        // Wait before next retry
        if (attempt < maxRetriesPerModel) {
          const waitMs = attempt * 1000;
          console.log(`Waiting ${waitMs}ms before retrying ${model}...`);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
      }
    }
  }

  throw lastError || new Error("All Gemini models failed to generate content.");
}

// Geocodes a given city/country name using Google Maps Geocoding API or Gemini AI
async function geocodeLocation(name: string): Promise<{ name: string; lat: number; lng: number } | null> {
  const geminiApiKey = process.env.GEMINI_API_KEY || "";
  const googleMapsApiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || "";

  // Try Google Geocoding API first if available
  if (googleMapsApiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(name)}&key=${googleMapsApiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const loc = data.results[0].geometry.location;
          return {
            name: data.results[0].formatted_address,
            lat: parseCoordinate(loc.lat),
            lng: parseCoordinate(loc.lng)
          };
        }
      }
    } catch (err) {
      console.warn("Google Geocoding API failed, falling back to Gemini:", err);
    }
  }

  // Fallback to Gemini AI for geocoding
  if (geminiApiKey) {
    try {
      const prompt = `Identify the real-world city/country or tourist destination: "${name}".
      Provide its center latitude and center longitude as clean decimal numbers.
      Format the response exactly as a JSON object with keys: "name", "lat", "lng". e.g.,
      {"name": "Kochi, Kerala, India", "lat": 9.9312, "lng": 76.2673}`;

      const response = await generateContentWithFallback({
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            required: ["name", "lat", "lng"],
            properties: {
              name: { type: Type.STRING },
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER }
            }
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      if (parsed.lat !== undefined && parsed.lng !== undefined) {
        return {
          name: parsed.name || name,
          lat: parseCoordinate(parsed.lat),
          lng: parseCoordinate(parsed.lng)
        };
      }
    } catch (err) {
      console.error("Gemini geocoding also failed:", err);
    }
  }

  return null;
}

// 1. Start Quest Endpoint
app.post("/api/quest/start", async (req, res) => {
  try {
    const { userLatitude, userLongitude, prefCity } = req.body;

    let selectedCity = STARTING_CITIES[Math.floor(Math.random() * STARTING_CITIES.length)];

    // If preferred city is selected
    if (prefCity) {
      const match = STARTING_CITIES.find(c => c.name.toLowerCase().includes(prefCity.toLowerCase()));
      if (match) {
        selectedCity = match;
      } else {
        // Not found in starting cities presets, so we geocode it dynamically!
        const geocoded = await geocodeLocation(prefCity);
        if (geocoded) {
          selectedCity = geocoded;
        } else {
          console.warn(`Could not geocode custom destination: ${prefCity}. Falling back to default.`);
        }
      }
    } else if (userLatitude && userLongitude) {
      // Find the closest predefined city to coordinates to make geolocation feel smart!
      let closestCity = STARTING_CITIES[0];
      let minDistance = getHaversineDistance(
        { lat: userLatitude, lng: userLongitude },
        { lat: closestCity.lat, lng: closestCity.lng }
      );

      for (const city of STARTING_CITIES) {
        const d = getHaversineDistance(
          { lat: userLatitude, lng: userLongitude },
          { lat: city.lat, lng: city.lng }
        );
        if (d < minDistance) {
          minDistance = d;
          closestCity = city;
        }
      }
      selectedCity = closestCity;
    }

    if (!geminiApiKey) {
      return res.status(400).json({
        error: "Missing GEMINI_API_KEY. Please set GEMINI_API_KEY in the Secrets panel."
      });
    }

    // Call Gemini to generate 3 themed clues for the selected city
    const prompt = `Generate a location-based treasure hunt sequence of 3 major iconic landmarks or extremely famous places in: ${selectedCity.name}.
    The coordinates of the city are roughly latitude ${selectedCity.lat}, longitude ${selectedCity.lng}.
    
    IMPORTANT Rules:
    - The 3 landmarks must all be within a very tight 2.5km radius of these coordinates (${selectedCity.lat}, ${selectedCity.lng}). This is CRITICAL because the map loads with an initial zoom level of 13. The places MUST be highly prominent, well-known, and clearly visible/labeled on a standard Google Maps view at zoom 13 (no obscure spots, no remote places far outside the default viewport, and no invisible hidden coordinates).
    - Design a simple, clear, and descriptive clue directing the player to find this landmark, WITHOUT mentioning the landmark's actual name in the clue text itself. Avoid overly cryptic riddles. Instead, make the clue direct and helpful, incorporating visual features, nearby water body names, or major connecting roads, so the player can easily spot it on the map.
    - Provide the exact coordinates (lat, lng) of the landmark.
    - Provide the exact landmark name.
    - Add a delightful interesting short trivia/fun-fact about each place to be read when uncovered.
    - Format response exactly as valid JSON conforming to the schema. Do not output anything but the JSON.`;

    const chatResponse = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["landmarks"],
          properties: {
            landmarks: {
              type: Type.ARRAY,
              description: "The list of 3 landmarks and clues",
              items: {
                type: Type.OBJECT,
                required: ["name", "clue", "lat", "lng", "trivia"],
                properties: {
                  name: { type: Type.STRING, description: "Exact landmark name" },
                  clue: { type: Type.STRING, description: "Thematic riddle clue pointing to it" },
                  lat: { type: Type.NUMBER, description: "Latitude coordinates" },
                  lng: { type: Type.NUMBER, description: "Longitude coordinates" },
                  trivia: { type: Type.STRING, description: "Fascinating local fact or history bit" }
                }
              }
            }
          }
        }
      }
    });

    const parsedData = JSON.parse(chatResponse.text || "{}");
    const landmarks = parsedData.landmarks || [];

    if (landmarks.length < 3) {
      throw new Error("Unable to generate proper quest steps from Gemini API. Try again.");
    }

    const sessionId = `gq_${Math.random().toString(36).substring(2, 11)}`;
    const steps: QuestStep[] = landmarks.map((l: any) => ({
      clue: l.clue,
      targetName: l.name,
      targetLatLng: { lat: parseCoordinate(l.lat), lng: parseCoordinate(l.lng) },
      trivia: l.trivia,
      playerGuess: null,
      distanceErrorMeters: null,
      scoreEarned: 0,
      success: null
    }));

    const session: QuestSession = {
      sessionId,
      startCity: selectedCity.name,
      startLatLng: { lat: selectedCity.lat, lng: selectedCity.lng },
      steps,
      currentStepIndex: 0,
      totalScore: 0,
      completed: false,
      startTime: new Date().toISOString()
    };

    sessions.set(sessionId, session);

    // Filter session details before returning to client (shield answer coords!)
    res.json({
      sessionId,
      startCity: session.startCity,
      startLatLng: session.startLatLng,
      currentStep: {
        clue: steps[0].clue,
        stepIndex: 0,
        totalSteps: steps.length,
      },
      totalScore: 0,
      completed: false
    });

  } catch (err: any) {
    console.error("Error creating session:", err);
    res.status(500).json({ error: err.message || "Failed to initiate quest room." });
  }
});

// 2. Submit Player Guess and Verification
app.post("/api/quest/guess", async (req, res) => {
  try {
    const { sessionId, lat, lng } = req.body;
    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Active quest session not found." });
    }

    if (session.completed) {
      return res.status(400).json({ error: "This quest is already completed!" });
    }

    const playerLat = Number(lat);
    const playerLng = Number(lng);

    if (isNaN(playerLat) || isNaN(playerLng)) {
      return res.status(400).json({ error: "Invalid guess coordinates received." });
    }

    const currentStep = session.steps[session.currentStepIndex];
    if (!currentStep) {
      return res.status(400).json({ error: "Current step index is invalid." });
    }

    const target = currentStep.targetLatLng;
    if (!target || isNaN(Number(target.lat)) || isNaN(Number(target.lng))) {
      return res.status(500).json({ error: "Target location coordinates for this clue are missing or corrupt." });
    }

    const targetLat = Number(target.lat);
    const targetLng = Number(target.lng);

    const distance = getHaversineDistance({ lat: playerLat, lng: playerLng }, { lat: targetLat, lng: targetLng });

    let isMatch = distance <= 500; // Directly within 500 meters is considered a Direct match
    let placesMatchFound = false;
    let fallbackPlaceName = "";

    // If it is not a direct metric hit, verify with the Places API (New) via coordinates bias
    if (!isMatch && googleMapsApiKey) {
      try {
        // Query google places API to find places matching the targetName around the player's guess coordinates
        const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": googleMapsApiKey,
            "X-Goog-FieldMask": "places.displayName,places.location,places.formattedAddress"
          },
          body: JSON.stringify({
            textQuery: currentStep.targetName,
            locationBias: {
              circle: {
                center: { latitude: playerLat, longitude: playerLng },
                radius: 1000.0 // search within 1km of player's guess
              }
            }
          })
        });

        if (response.ok) {
          const placesData = await response.json();
          if (placesData.places && placesData.places.length > 0) {
            // Find the first place returned
            const matchPlace = placesData.places[0];
            if (matchPlace && matchPlace.location && matchPlace.location.latitude !== undefined && matchPlace.location.longitude !== undefined) {
              const pLoc = {
                lat: Number(matchPlace.location.latitude),
                lng: Number(matchPlace.location.longitude)
              };
              const matchDistance = getHaversineDistance({ lat: playerLat, lng: playerLng }, pLoc);
              // If the matching target place resides within 600m of user's pin, count it as a successful search!
              if (matchDistance <= 600) {
                placesMatchFound = true;
                fallbackPlaceName = matchPlace.displayName?.text || currentStep.targetName;
              }
            }
          }
        }
      } catch (placeErr) {
        console.warn("Places API verification bypass:", placeErr);
      }
    }

    const verifiedSuccess = isMatch || placesMatchFound;

    // Award scoring logic
    // Perfect: within 100m = 100 points
    // Great: within 250m = 90 points
    // Good: within 500m = 80 points
    // Bypassed via Places API match: 70 points
    // Else: If they decide to proceed with large error, score calculated relative to distance (max error 5000m)
    let score = 0;
    if (verifiedSuccess) {
      if (distance <= 100) score = 100;
      else if (distance <= 250) score = 90;
      else if (distance <= 500) score = 80;
      else score = 70; // verified via places matching
    } else {
      // Partial score if they are just close-by but forced unlock, or we can allow next clue with minor penalty
      score = Math.max(10, Math.round(70 * Math.max(0, (5000 - distance) / 5000)));
    }

    // Save step outcome
    currentStep.playerGuess = { lat: playerLat, lng: playerLng };
    currentStep.distanceErrorMeters = Math.round(distance);
    currentStep.scoreEarned = score;
    currentStep.success = verifiedSuccess;

    session.totalScore += score;

    const nextIndex = session.currentStepIndex + 1;
    const hasNext = nextIndex < session.steps.length;

    if (!hasNext) {
      session.completed = true;
    } else {
      session.currentStepIndex = nextIndex;
    }

    sessions.set(sessionId, session);

    res.json({
      success: verifiedSuccess,
      distanceMeters: Math.round(distance),
      scoreEarned: score,
      trivia: currentStep.trivia,
      targetLatLng: currentStep.targetLatLng,
      targetName: currentStep.targetName,
      hasNext,
      currentStepIndex: session.currentStepIndex,
      nextClue: hasNext ? session.steps[nextIndex].clue : null,
      totalScore: session.totalScore,
      completed: session.completed
    });

  } catch (err: any) {
    console.error("Guesser endpoint error:", err);
    res.status(500).json({ error: "Verification system malfunctioned." });
  }
});

// 3. Get Active Session Details (Safely hides target coordinates of unreached steps)
app.get("/api/quest/session/:sessionId", (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: "Session not found." });
  }

  const safeSteps = session.steps.map((s, idx) => {
    // If the step is already tackled, the user can see everything.
    // Otherwise, do not leak coordinates!
    if (idx <= session.currentStepIndex || s.playerGuess !== null) {
      return {
        clue: s.clue,
        playerGuess: s.playerGuess,
        distanceErrorMeters: s.distanceErrorMeters,
        scoreEarned: s.scoreEarned,
        success: s.success,
        trivia: s.playerGuess ? s.trivia : undefined,
        targetName: s.playerGuess ? s.targetName : undefined,
        // Only return targetLatLng if answer is resolved
        targetLatLng: s.playerGuess ? s.targetLatLng : undefined
      };
    }
    return {
      clue: s.clue,
      playerGuess: null,
      distanceErrorMeters: null,
      scoreEarned: 0,
      success: null
    };
  });

  res.json({
    sessionId: session.sessionId,
    startCity: session.startCity,
    startLatLng: session.startLatLng,
    currentStepIndex: session.currentStepIndex,
    totalScore: session.totalScore,
    completed: session.completed,
    steps: safeSteps
  });
});

// 4. Generate beautiful dynamic Docs Scorecard as JSON + Markdown / custom download
app.get("/api/quest/scorecard/:sessionId", async (req, res) => {
  try {
    const session = sessions.get(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: "Completed quest session not found." });
    }

    const totalDistanceError = session.steps.reduce((acc, s) => acc + (s.distanceErrorMeters || 0), 0);
    const averageDistanceError = Math.round(totalDistanceError / session.steps.length);

    // Call Gemini to generate a beautifully customized, personalized summary of the player's route & achievement!
    let summaryText = `Congratulations! You scored ${session.totalScore} in the ${session.startCity} Geo Quest with an average distance error of ${averageDistanceError} meters!`;

    if (geminiApiKey) {
      try {
        const result = await generateContentWithFallback({
          contents: `The player completed a location-based treasure hunt in ${session.startCity}.
          Here are their stats:
          - Total Score: ${session.totalScore}
          - Average Distance Pin Offset Error: ${averageDistanceError} meters
          - Locations discovered: ${session.steps.map(s => s.targetName).join(", ")}
          
          Write a concise, playful, prestigious adventurer's narrative (80 words) celebrating their victory, detailing their route and performance. Refer to them as 'Master Cartographer' or similar fun title based on how close their average offset is. Be creative! No markdown formatting wrapper, just standard text.`,
          config: {
            temperature: 0.8
          }
        });
        summaryText = result.text || summaryText;
      } catch (apiErr) {
        console.warn("Gemini scorecard summaries bypass:", apiErr);
      }
    }

    res.json({
      sessionId: session.sessionId,
      startCity: session.startCity,
      startTime: session.startTime,
      totalScore: session.totalScore,
      averageDistanceErrorMeters: averageDistanceError,
      personalizedSummary: summaryText,
      badgeTitle: session.totalScore >= 450 ? "Apex Cartographer" : session.totalScore >= 350 ? "Master Navigator" : "Junior Explorer",
      steps: session.steps.map(s => ({
        clue: s.clue,
        targetName: s.targetName,
        targetLatLng: s.targetLatLng,
        playerGuess: s.playerGuess,
        distanceErrorMeters: s.distanceErrorMeters,
        scoreEarned: s.scoreEarned,
        trivia: s.trivia
      }))
    });

  } catch (err: any) {
    res.status(500).json({ error: "Failed to generate your adventure scorecard." });
  }
});

// Integrate Vite middleware dynamically
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Geo Quest] Full-stack Server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();
