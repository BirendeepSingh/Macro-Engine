"use client";

import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [gender, setGender] = useState("male");
  const [activity, setActivity] = useState(1.2);
  const [goal, setGoal] = useState("cut");
  const [trainingStyle, setTrainingStyle] = useState("weights");
  const [region, setRegion] = useState("Indian / Desi");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{
    calories: number;
    protein: number;
    fats: number;
    carbs: number;
  } | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        setUserEmail(session.user.email || null);
      }
    };
    checkUser();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserId(null);
    setUserEmail(null);
    setResult(null);
  };

  const calculateMacros = () => {
    if (!age || !weight || !height) return;

    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseFloat(age);

    if (w > 180 || w < 30 || h > 250 || h < 100 || a < 15 || a > 100) {
      alert("Please enter realistic measurements.");
      return;
    }

    let bmr = gender === "male" ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161;
    let tdee = bmr * activity;

    if (goal === "cut") tdee -= 500;
    if (goal === "bulk") tdee += 300;

    let proteinMultiplier = 2.0;
    if (trainingStyle === "weights") proteinMultiplier = goal === "cut" ? 2.2 : 1.8;
    if (trainingStyle === "cardio") proteinMultiplier = 1.6;
    if (trainingStyle === "mix") proteinMultiplier = 1.8;
    if (trainingStyle === "none") proteinMultiplier = 1.2;

    let protein = proteinMultiplier * w;
    if (protein > 250) protein = 250;

    const fats = (0.25 * tdee) / 9;
    const carbs = (tdee - protein * 4 - fats * 9) / 4;

    setResult({
      calories: Math.round(tdee),
      protein: Math.round(protein),
      fats: Math.round(fats),
      carbs: Math.round(carbs),
    });
  };

  const generateAIPDF = async () => {
    if (!result) return;
    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calories: result.calories,
          protein: result.protein,
          carbs: result.carbs,
          fats: result.fats,
          goal,
          trainingStyle,
          region,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      const plan = data.planData;

      // --- SUPABASE DATABASE INJECTION ---
      // We silently save the plan to the user's profile before generating the PDF
      if (userId) {
        const { error: dbError } = await supabase
          .from("diet_plans")
          .insert({
            user_id: userId,
            plan_json: plan,
            payment_status: "dev_bypass", // We will change this to 'paid' when Razorpay is attached
          });

        if (dbError) {
          console.error("CRITICAL: Failed to save plan to database:", dbError.message);
          // We log the error but don't block the user from getting their PDF today
        }
      }
      // -----------------------------------

      const doc = new jsPDF();
      let yPos = 20;

      const checkPage = (spaceNeeded = 10) => {
        if (yPos + spaceNeeded > 280) {
          doc.addPage();
          yPos = 20;
        }
      };

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("Premium 7-Day Fitness Protocol", 20, yPos);
      yPos += 10;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Region: ${region} | Goal: ${goal.toUpperCase()} | Training: ${trainingStyle.toUpperCase()}`, 20, yPos);
      yPos += 10;

      doc.setDrawColor(0);
      doc.setFillColor(240, 240, 240);
      doc.rect(20, yPos, 170, 20, "F");
      yPos += 12;
      doc.setFont("helvetica", "bold");
      doc.text(`Target Macros: ${plan.dailyTargets.calories} kcal | ${plan.dailyTargets.protein}g Protein | ${plan.dailyTargets.carbs}g Carbs | ${plan.dailyTargets.fats}g Fats`, 25, yPos);
      yPos += 20;

      doc.setFontSize(16);
      doc.text("7-DAY MEAL PLAN", 20, yPos);
      yPos += 8;

      plan.mealPlan.forEach((day: any) => {
        checkPage(30);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Day ${day.day}`, 20, yPos);
        yPos += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        day.meals.forEach((meal: any) => {
          checkPage(15);
          const mealText = `- ${meal.type.toUpperCase()}: ${meal.name} (${meal.macros.calories} kcal, ${meal.macros.protein}g P)`;
          const splitMeal = doc.splitTextToSize(mealText, 170);
          doc.text(splitMeal, 25, yPos);
          yPos += (splitMeal.length * 5) + 2;
        });
        yPos += 4;
      });

      checkPage(40);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("7-DAY TRAINING MICROCYCLE", 20, yPos);
      yPos += 8;

      plan.trainingProtocol.forEach((day: any) => {
        checkPage(25);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Day ${day.day}: ${day.focus}`, 20, yPos);
        yPos += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        day.routine.forEach((exercise: string) => {
          checkPage(10);
          const splitExercise = doc.splitTextToSize(`- ${exercise}`, 170);
          doc.text(splitExercise, 25, yPos);
          yPos += (splitExercise.length * 5);
        });
        yPos += 6;
      });

      checkPage(50);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("WEEKLY GROCERY LIST", 20, yPos);
      yPos += 8;

      doc.setFontSize(11);
      doc.text("Produce:", 20, yPos);
      yPos += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const produceText = doc.splitTextToSize(plan.groceryList.produce.join(", "), 170);
      doc.text(produceText, 25, yPos);
      yPos += (produceText.length * 5) + 4;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Meat, Dairy & Protein:", 20, yPos);
      yPos += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const meatText = doc.splitTextToSize(plan.groceryList.meatDairy.join(", "), 170);
      doc.text(meatText, 25, yPos);
      yPos += (meatText.length * 5) + 4;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Pantry & Spices:", 20, yPos);
      yPos += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const pantryText = doc.splitTextToSize(plan.groceryList.pantry.join(", "), 170);
      doc.text(pantryText, 25, yPos);
      yPos += (pantryText.length * 5) + 12;

      checkPage(20);
      doc.setFontSize(9);
      doc.setTextColor(100);
      const disclaimer = doc.splitTextToSize("MEDICAL DISCLAIMER: This 7-day protocol is generated by an AI tool for informational purposes only and does not constitute medical advice.", 170);
      doc.text(disclaimer, 20, yPos);

      doc.save("Premium_7_Day_Protocol.pdf");
    } catch (error) {
      console.error(error);
      alert("Error generating the plan. Please check the terminal.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePremiumAction = () => {
    if (!userId) {
      router.push("/login");
      return;
    }
    
    // TEMPORARY BYPASS: Directly trigger the AI generation since Razorpay is paused
    generateAIPDF();
  };

  return (
    <div 
      className="min-h-screen text-zinc-100 font-sans selection:bg-[#39FF14] selection:text-black bg-cover bg-center bg-fixed relative"
      style={{ backgroundImage: "url('https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=2000&auto=format&fit=crop')" }}
    >
      <div className="absolute inset-0 bg-[#0a0a0a]/85 z-0"></div> {/* This darkens the photo so text is readable */}

      {/* TOP NAVIGATION BAR */}
      <nav className="fixed top-0 left-0 w-full bg-[#0a0a0a]/80 backdrop-blur-md border-b border-zinc-800/80 z-50 flex justify-between items-center px-8 py-5">
        <div className="text-xl font-black tracking-tighter text-white flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#39FF14" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          MACRO ENGINE
        </div>
        <div>
          {userId ? (
            <div className="flex items-center gap-6 text-sm font-medium">
              <button 
                onClick={() => router.push("/dashboard")} 
                className="text-[#39FF14] hover:text-white transition-colors font-bold flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                My Vault
              </button>
              <button onClick={handleSignOut} className="text-zinc-500 hover:text-red-400 transition-colors">
                Sign Out
              </button>
            </div>
          ) : (
            <button onClick={() => router.push("/login")} className="text-sm font-bold bg-[#39FF14] text-black px-6 py-2.5 rounded-lg hover:bg-[#32e612] transition-colors">
              Sign In
            </button>
          )}
        </div>
      </nav>

      <main className="relative z-10 flex flex-col items-center pt-32 p-6 pb-20 w-full max-w-4xl mx-auto">
        
        {/* MARKETING HERO SECTION */}
        <div className="w-full flex flex-col items-center text-center mb-16">
          <div className="mb-6 px-4 py-1.5 border border-zinc-800 rounded-full text-xs font-semibold tracking-widest text-zinc-400 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#39FF14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            SCIENCE-BACKED NUTRITION
          </div>
          <h1 className="text-6xl md:text-7xl font-black text-white tracking-tighter leading-[1.1] mb-6">
            Stop Guessing. <span className="text-[#39FF14]">Start Building.</span>
          </h1>
          <p className="text-lg text-zinc-400 font-medium max-w-2xl">
            Get your clinical macro targets instantly for free. Precision-engineered calculations tailored to your body, goals, and lifestyle.
          </p>
        </div>

        {/* CALCULATOR CARD */}
        <div className="w-full bg-[#121212] border border-zinc-800/80 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-[#39FF14]/10 rounded-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#39FF14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Calculate Your Macros</h2>
              <p className="text-sm text-zinc-500">Fill in your details below</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-zinc-400">Age</label>
              <input type="number" className="p-3.5 bg-[#1a1a1a] border border-zinc-800 rounded-xl text-white outline-none focus:border-[#39FF14] transition-colors" placeholder="25" value={age} onChange={(e) => setAge(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-zinc-400">Gender</label>
              <select className="p-3.5 bg-[#1a1a1a] border border-zinc-800 rounded-xl text-white outline-none focus:border-[#39FF14] appearance-none transition-colors" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-zinc-400">Weight (kg)</label>
              <input type="number" className="p-3.5 bg-[#1a1a1a] border border-zinc-800 rounded-xl text-white outline-none focus:border-[#39FF14] transition-colors" placeholder="70" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-zinc-400">Height (cm)</label>
              <input type="number" className="p-3.5 bg-[#1a1a1a] border border-zinc-800 rounded-xl text-white outline-none focus:border-[#39FF14] transition-colors" placeholder="175" value={height} onChange={(e) => setHeight(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-zinc-400">Activity Level</label>
              <select className="p-3.5 bg-[#1a1a1a] border border-zinc-800 rounded-xl text-white outline-none focus:border-[#39FF14] appearance-none transition-colors" value={activity} onChange={(e) => setActivity(parseFloat(e.target.value))}>
                <option value="1.2">Sedentary (Desk Job)</option>
                <option value="1.375">Light (1-3 days/week)</option>
                <option value="1.55">Moderate (3-5 days/week)</option>
                <option value="1.725">Active (6-7 days/week)</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[#b48eed]">Dietary Region</label>
              <select className="p-3.5 bg-[#1a1a1a] border border-zinc-800 rounded-xl text-white outline-none focus:border-[#b48eed] appearance-none transition-colors" value={region} onChange={(e) => setRegion(e.target.value)}>
                <option value="Indian / Desi">Indian / Desi</option>
                <option value="Western / American">Western / American</option>
                <option value="Mediterranean">Mediterranean</option>
                <option value="East Asian">East Asian</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-zinc-400">Primary Goal</label>
              <select className="p-3.5 bg-[#1a1a1a] border border-zinc-800 rounded-xl text-white outline-none focus:border-[#39FF14] appearance-none transition-colors" value={goal} onChange={(e) => setGoal(e.target.value)}>
                <option value="maintain">Maintenance</option>
                <option value="cut">Fat Loss</option>
                <option value="bulk">Muscle Gain</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[#39FF14]">Training Style</label>
              <select className="p-3.5 bg-[#1a1a1a] border border-zinc-800 rounded-xl text-white outline-none focus:border-[#39FF14] appearance-none transition-colors" value={trainingStyle} onChange={(e) => setTrainingStyle(e.target.value)}>
                <option value="weights">Weightlifting</option>
                <option value="cardio">Cardio / Running</option>
                <option value="mix">Mixed / CrossFit</option>
                <option value="none">No Training</option>
              </select>
            </div>
          </div>

          {!result ? (
            <button onClick={calculateMacros} disabled={!age || !weight || !height} className="w-full bg-[#39FF14] hover:bg-[#32e612] disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold py-4 rounded-xl shadow-lg transition-colors">
              Calculate Your Macros
            </button>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
                <div className="bg-[#1a1a1a] p-5 rounded-xl border border-zinc-800/80">
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Calories</p>
                  <p className="text-2xl font-black text-white">{result.calories}</p>
                </div>
                <div className="bg-[#1a1a1a] p-5 rounded-xl border border-zinc-800/80">
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Protein</p>
                  <p className="text-2xl font-black text-[#39FF14]">{result.protein}g</p>
                </div>
                <div className="bg-[#1a1a1a] p-5 rounded-xl border border-zinc-800/80">
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Fats</p>
                  <p className="text-2xl font-black text-white">{result.fats}g</p>
                </div>
                <div className="bg-[#1a1a1a] p-5 rounded-xl border border-zinc-800/80">
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Carbs</p>
                  <p className="text-2xl font-black text-white">{result.carbs}g</p>
                </div>
              </div>
              
              <button
                onClick={handlePremiumAction}
                disabled={isGenerating}
                className="w-full bg-[#0a996f] hover:bg-[#08825e] disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all mt-4"
              >
                {isGenerating 
                  ? "🧠 Validating Data & Building..." 
                  : !userId 
                    ? "🔒 Login to Unlock Premium 7-Day Protocol" 
                    : "💳 Get Premium AI Protocol (₹149)"}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}