"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf"; // Add this line

export default function DashboardPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchDashboardData = async () => {
      // 1. Check Auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      
      setUserEmail(session.user.email || "Athlete");

      // 2. Fetch User's Saved Plans from the Vault
      const { data: savedPlans, error } = await supabase
        .from("diet_plans")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching plans:", error);
      } else {
        setPlans(savedPlans || []);
      }
      
      setLoading(false);
    };

    fetchDashboardData();
  }, [router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const downloadSavedPDF = (planData: any) => {
    try {
      const plan = planData.plan_json;
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
      doc.text(`Retrieved from Secure Vault | ID: ${planData.id.split('-')[0]}`, 20, yPos);
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

      doc.save(`Vault_Protocol_${planData.id.split('-')[0]}.pdf`);
    } catch (error) {
      console.error("PDF Error:", error);
      alert("Error building the saved PDF. Check the console.");
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-[#39FF14] font-mono tracking-widest text-sm">LOADING SECURE VAULT...</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-[#39FF14] selection:text-black">
      {/* Background */}
      <div className="fixed inset-0 z-0 opacity-20 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full bg-[#0a0a0a]/80 backdrop-blur-md border-b border-zinc-800/80 z-50 flex justify-between items-center px-8 py-5">
        <div 
          onClick={() => router.push("/")}
          className="text-xl font-black tracking-tighter text-white flex items-center gap-2 cursor-pointer hover:text-[#39FF14] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          MACRO ENGINE
        </div>
        <div className="flex items-center gap-6 text-sm font-medium">
          <span className="text-zinc-400">{userEmail}</span>
          <button onClick={handleSignOut} className="text-zinc-400 hover:text-white transition-colors">Sign Out</button>
        </div>
      </nav>

      <main className="relative z-10 flex flex-col items-center pt-32 p-6 pb-20 w-full max-w-5xl mx-auto">
        <div className="w-full mb-12">
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">Protocol Vault</h1>
          <p className="text-zinc-400">Your saved AI-generated nutrition and training plans.</p>
        </div>

        {plans.length === 0 ? (
          <div className="w-full bg-[#121212] border border-zinc-800/80 rounded-2xl p-12 text-center shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">No Protocols Found</h2>
            <p className="text-zinc-500 mb-6">You haven't generated any premium plans yet.</p>
            <button onClick={() => router.push("/")} className="bg-[#39FF14] text-black font-bold px-6 py-3 rounded-lg hover:bg-[#32e612] transition-colors">
              Generate Your First Plan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {plans.map((plan) => (
              <div key={plan.id} className="bg-[#121212] border border-zinc-800 hover:border-[#39FF14]/50 transition-colors rounded-2xl p-6 shadow-xl flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-bold bg-zinc-800 text-zinc-300 px-2 py-1 rounded uppercase tracking-wider">
                      {new Date(plan.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${plan.payment_status === 'dev_bypass' ? 'bg-blue-900/50 text-blue-400' : 'bg-emerald-900/50 text-emerald-400'}`}>
                    {plan.payment_status === 'dev_bypass' ? 'DEV MODE' : 'PAID'}
                  </span>
                </div>
                
                <h3 className="text-2xl font-black text-white mb-4">
                  {plan.plan_json.dailyTargets.calories} <span className="text-sm font-medium text-zinc-500">kcal / day</span>
                </h3>
                
                <div className="grid grid-cols-3 gap-2 mb-6">
                  <div className="bg-[#1a1a1a] p-3 rounded-lg text-center">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Protein</p>
                    <p className="text-sm font-bold text-[#39FF14]">{plan.plan_json.dailyTargets.protein}g</p>
                  </div>
                  <div className="bg-[#1a1a1a] p-3 rounded-lg text-center">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Carbs</p>
                    <p className="text-sm font-bold text-white">{plan.plan_json.dailyTargets.carbs}g</p>
                  </div>
                  <div className="bg-[#1a1a1a] p-3 rounded-lg text-center">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Fats</p>
                    <p className="text-sm font-bold text-white">{plan.plan_json.dailyTargets.fats}g</p>
                  </div>
                </div>

                {/* Future implementation: Re-generate PDF from this JSON */}
                <button 
                  className="w-full mt-auto bg-zinc-800 hover:bg-[#39FF14] hover:text-black text-white font-bold py-3 rounded-xl transition-all shadow-md text-sm flex items-center justify-center gap-2"
                  onClick={() => downloadSavedPDF(plan)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Instant Download PDF
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}