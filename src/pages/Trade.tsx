import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Mail, Building, FileText, ArrowRight, Check } from 'lucide-react';

const STEPS = [
  { title: 'Identity', icon: Mail },
  { title: 'Compliance', icon: Building },
  { title: 'Validation', icon: ShieldCheck },
  { title: 'Agreement', icon: FileText },
];

export const Trade = () => {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <div className="min-h-screen pt-20 flex bg-brand-paper">
      {/* Sidebar */}
      <div className="hidden lg:flex w-1/3 border-r border-brand-ink/10 p-20 flex-col justify-between">
        <div>
          <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-brand-primary mb-8 block">
            Network Enrollment
          </span>
          <h1 className="text-6xl mb-12">
            Join the<br />Collective.
          </h1>
          <p className="text-lg font-sans text-brand-ink/60 leading-relaxed font-serif italic mb-12">
            Manufacturers and artisans undergo a 30-day verification process to ensure zero-deforestation and fair labour compliance before joining the network.
          </p>
        </div>

        <div className="space-y-8">
          {STEPS.map((step, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-6 transition-all duration-500 ${idx <= currentStep ? 'opacity-100' : 'opacity-20'}`}
            >
              <div
                className={`w-10 h-10 flex items-center justify-center border transition-all duration-500 ${
                  idx < currentStep
                    ? 'border-brand-primary bg-brand-primary text-brand-paper'
                    : idx === currentStep
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-brand-ink'
                }`}
              >
                {idx < currentStep ? <Check size={16} /> : <step.icon size={16} />}
              </div>
              <span className="text-[11px] uppercase tracking-widest font-bold">{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Form area */}
      <div className="flex-1 p-8 md:p-20 flex items-center justify-center relative overflow-hidden">
        <div className="bg-noise opacity-[0.03] pointer-events-none absolute inset-0" />

        {/* Mobile step indicator */}
        <div className="lg:hidden absolute top-24 left-8 flex gap-2">
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 w-8 transition-all duration-500 ${idx <= currentStep ? 'bg-brand-primary' : 'bg-brand-ink/10'}`}
            />
          ))}
        </div>

        <div className="max-w-md w-full relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
            >
              {/* Step heading */}
              <div className="mb-10">
                <span className="text-[10px] uppercase tracking-[0.3em] text-brand-primary font-bold block mb-3">
                  Step {currentStep + 1} of {STEPS.length}
                </span>
                <h2 className="text-4xl">{STEPS[currentStep].title}</h2>
              </div>

              {/* Step 1: Identity */}
              {currentStep === 0 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-50 block">
                      Registered Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="business@example.com"
                      className="w-full bg-transparent border-b border-brand-ink/20 py-4 focus:outline-none focus:border-brand-primary text-xl font-serif italic transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-50 block">
                      Organisation Name
                    </label>
                    <input
                      type="text"
                      placeholder="Botanical Labs Co."
                      className="w-full bg-transparent border-b border-brand-ink/20 py-4 focus:outline-none focus:border-brand-primary text-xl font-serif italic transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-50 block">
                      Tax ID / VAT Number
                    </label>
                    <input
                      type="text"
                      placeholder="XX-XXXXXXX"
                      className="w-full bg-transparent border-b border-brand-ink/20 py-4 focus:outline-none focus:border-brand-primary text-xl font-serif italic transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Compliance */}
              {currentStep === 1 && (
                <div className="space-y-8">
                  <p className="text-brand-ink/60 font-serif italic">
                    Upload compliance documentation to verify zero-deforestation and fair labour standards.
                  </p>
                  <div className="p-12 border-2 border-dashed border-brand-ink/10 text-center space-y-4 hover:border-brand-primary/40 transition-colors cursor-pointer group">
                    <div className="mx-auto w-12 h-12 flex items-center justify-center bg-brand-ink/5 group-hover:bg-brand-primary/10 transition-colors">
                      <FileText className="opacity-40 group-hover:text-brand-primary transition-colors" size={20} />
                    </div>
                    <p className="text-[11px] uppercase tracking-widest opacity-60">Drop VAT or NGO Certifications</p>
                    <p className="text-xs text-brand-muted">PDF, JPG, PNG · max 10MB</p>
                  </div>
                  <div className="space-y-3">
                    {['Zero-deforestation policy', 'Fair labour standards', 'Ecological impact report'].map((check) => (
                      <label key={check} className="flex items-center gap-4 cursor-pointer group">
                        <div className="w-5 h-5 border border-brand-ink/20 group-hover:border-brand-primary transition-colors flex items-center justify-center shrink-0">
                          <div className="w-2.5 h-2.5 bg-brand-primary opacity-0 group-hover:opacity-30 transition-opacity" />
                        </div>
                        <span className="text-[11px] uppercase tracking-widest font-bold opacity-60">{check}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3+: Under Review */}
              {currentStep >= 2 && (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-brand-primary/10 text-brand-primary flex items-center justify-center mx-auto mb-8 rounded-full">
                    <ShieldCheck size={40} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-3xl mb-4">Under Review</h3>
                  <p className="text-brand-ink/60 text-sm max-w-xs mx-auto leading-relaxed">
                    Our validation team will review your application and respond within 72 hours. You'll receive a confirmation email when approved.
                  </p>
                </div>
              )}

              <button
                onClick={() => setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1))}
                disabled={currentStep >= 2}
                className="mt-12 w-full py-6 bg-brand-ink text-brand-paper text-[11px] uppercase tracking-widest font-bold flex items-center justify-center gap-4 hover:bg-brand-primary transition-all duration-500 disabled:opacity-20 disabled:cursor-not-allowed"
              >
                {currentStep < 2 ? (
                  <>
                    Continue <ArrowRight size={14} />
                  </>
                ) : (
                  'Awaiting Verification'
                )}
              </button>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
