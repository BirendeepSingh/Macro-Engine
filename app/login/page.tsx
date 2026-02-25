"use client";

import { createBrowserClient } from "@supabase/ssr";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push("/"); 
      }
      setLoading(false);
    };
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (event === "SIGNED_IN" && session) {
          router.push("/");
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, supabase]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-mono">INITIALIZING AUTH...</div>;

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-6 bg-cover bg-center bg-fixed relative"
      style={{ backgroundImage: "url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2000&auto=format&fit=crop')" }}
    >
      <div className="absolute inset-0 bg-black/80 z-0"></div>

      <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-md border border-zinc-700/50 rounded-2xl shadow-2xl p-8 z-10 relative">
        <h1 className="text-3xl font-extrabold text-white text-center mb-2 tracking-tight">
          Macro Engine
        </h1>
        <p className="text-zinc-400 text-center mb-8 text-sm italic">
          Sign up to unlock your 7-day professional protocol.
        </p>

        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: { colors: { brand: '#2563eb', brandAccent: '#1d4ed8', inputText: 'white' } },
            },
          }}
          theme="dark"
          providers={[]} // Disabled Google to fix your error, uses Magic Link/Email now
        />
      </div>
    </div>
  );
}