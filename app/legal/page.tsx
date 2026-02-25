import Link from "next/link";

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-[#39FF14] selection:text-black">
      {/* Background Grid */}
      <div className="fixed inset-0 z-0 opacity-20 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full bg-[#0a0a0a]/90 backdrop-blur-md border-b border-zinc-800/80 z-50 px-8 py-5">
        <Link href="/" className="text-xl font-black tracking-tighter text-white flex items-center gap-2 hover:text-[#39FF14] transition-colors w-fit">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          BACK TO APP
        </Link>
      </nav>

      <main className="relative z-10 pt-32 pb-20 px-6 max-w-3xl mx-auto">
        <h1 className="text-4xl font-black text-white tracking-tighter mb-8">Legal & Compliance</h1>
        
        <div className="space-y-12 text-zinc-300 leading-relaxed">
          
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-b border-zinc-800 pb-2">1. Terms and Conditions</h2>
            <p className="mb-4">
              By using Macro Engine, you agree to these terms. Macro Engine provides AI-generated nutritional and training protocols for informational purposes only. The information provided is not medical advice. You must consult a medical professional before beginning any diet or exercise program. Macro Engine is not liable for any injury, health issues, or damages resulting from the use of our generated protocols.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-b border-zinc-800 pb-2">2. Privacy Policy</h2>
            <p className="mb-4">
              We respect your privacy. We collect basic biometric data (age, weight, height, gender) solely to calculate your nutritional targets and generate your protocol. We do not sell your personal data to third parties. Your generated protocols are stored securely in our database to allow you access via your Vault. Payment processing is handled securely by Razorpay; we do not store your credit card or banking information on our servers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-b border-zinc-800 pb-2">3. Refund and Cancellation Policy</h2>
            <p className="mb-4">
              <strong>Strict No-Refund Policy for Digital Goods:</strong> Due to the nature of digital products, all sales are final. Once a Premium 7-Day AI Protocol is generated and the PDF is made available to you in your Vault, the service is considered fulfilled. We do not offer refunds, cancellations, or exchanges after the payment has been successfully processed and the digital file has been generated.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-b border-zinc-800 pb-2">4. Shipping and Delivery Policy</h2>
            <p className="mb-4">
              <strong>Digital Delivery:</strong> Macro Engine does not ship physical products. Upon successful payment, your custom protocol is generated within 30 to 60 seconds. The PDF document is immediately delivered digitally to your browser for download. Simultaneously, a backup copy is securely saved to your personal "Vault" dashboard, where it can be accessed and downloaded instantly at any time as long as you maintain an active account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-b border-zinc-800 pb-2">5. Contact Us</h2>
            <p className="mb-2">If you experience any technical issues with your generated protocol or payment, please contact our support team.</p>
            <ul className="list-disc pl-6 text-zinc-400">
              <li><strong>Email:</strong> macroengine07@gmail.com</li>
              <li><strong>Address:</strong> Gurugram, Haryana, India</li>
            </ul>
          </section>

        </div>
      </main>
    </div>
  );
}