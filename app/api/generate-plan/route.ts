import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { calories, protein, carbs, fats, goal, trainingStyle, region } = body;

    // We configure the model to STRICTLY return JSON data, no markdown, no conversational text.
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const prompt = `
      You are an elite Board Certified Sports Dietitian (CSSD) and Certified Strength and Conditioning Specialist (CSCS).
      Generate a clinically sound 7-Day Meal Plan and 7-Day Training Microcycle based strictly on the user's data.

      USER DATA:
      - Daily Targets: ${calories} kcal | ${protein}g Protein | ${carbs}g Carbs | ${fats}g Fats
      - Goal: ${goal}
      - Training Style: ${trainingStyle}
      - Dietary Region / Cuisine: ${region}

      CRITICAL ENFORCEMENT RULES:
      1. MACRO MATH MUST BE EXACT. The sum of the calories and macros for each day's meals MUST equal the Daily Targets within a tight 10 kcal margin. Recalculate before outputting.
      2. No main meal can have less than 20g of protein.
      3. Use culturally authentic ingredients strictly aligned with ${region}. Limit primary protein sources to 3 per week for realistic batch meal prep.
      4. Design a 7-day periodized training split aligned with ${trainingStyle}. Include specific exercises, sets, reps, and RPE (Rate of Perceived Exertion). Include rest days.
      5. Consolidate a weekly grocery list with zero duplicate entries.

      OUTPUT FORMAT:
      You must return a valid JSON object matching this exact schema:
      {
        "dailyTargets": { "calories": number, "protein": number, "carbs": number, "fats": number },
        "mealPlan": [
          {
            "day": number,
            "meals": [
              {
                "type": string,
                "name": string,
                "macros": { "calories": number, "protein": number, "carbs": number, "fats": number }
              }
            ]
          }
        ],
        "groceryList": {
          "produce": [ string ],
          "meatDairy": [ string ],
          "pantry": [ string ]
        },
        "trainingProtocol": [
          {
            "day": number,
            "focus": string,
            "routine": [ string ]
          }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // We parse the JSON to ensure it is valid before sending it to the frontend
    const jsonData = JSON.parse(text);

    return NextResponse.json({ planData: jsonData });
  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: "Failed to generate plan securely." }, { status: 500 });
  }
}