import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, ChefHat, Scale, ArrowLeftRight, BookOpen, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

const SUGGESTED_PROMPTS = [
  { icon: ChefHat,        label: 'Recipe ideas with our 70% Trinitario',          prompt: 'Suggest three recipes using your India Trinitario 70% Couverture for a small bakery.' },
  { icon: ArrowLeftRight, label: 'Substitute Dutch cocoa for natural cocoa',      prompt: 'I have a recipe that calls for natural cocoa powder. Can I use your Dutch process cocoa instead, and what should I adjust?' },
  { icon: Scale,          label: 'Scale a ganache from 200g to 5kg',              prompt: 'Help me scale a basic dark ganache from 200g batch to 5kg for production.' },
  { icon: BookOpen,       label: 'Why did my chocolate seize?',                   prompt: 'My chocolate seized when I tried to temper it. What happened and how do I save it?' },
];

// Local pattern-matched responses (replace with real Gemini API call when GEMINI_API_KEY proxy is wired)
function generateResponse(userText: string): string {
  const t = userText.toLowerCase();
  if (t.includes('substitut') || t.includes('replace') || t.includes('instead of')) {
    return `Great question. Here's a quick guide for cocoa substitutions in your recipes:

• Natural cocoa → Dutch process: Use a 1:1 swap, but reduce baking soda by 75% and add a pinch of baking powder. Dutched cocoa is alkaline-neutral, so it won't activate the soda.
• Dutch process → Natural cocoa: 1:1 swap, but increase baking soda by 25% to balance the acidity.
• Couverture → chips: Avoid this in tempered work — chips contain stabilizers that prevent proper bloom-free crystallization.

For our specific lots, the India Trinitario Couverture 70% pairs especially well with the Mānuka Honey UMF 15+ in a salted caramel ganache. Want a recipe?`;
  }
  if (t.includes('temper') || t.includes('seiz') || t.includes('bloom')) {
    return `Sorry to hear that — seizing happens when even a drop of water hits melted chocolate. Two paths forward:

1. Save it: Add 1 tsp warm water at a time and whisk until smooth. You've made ganache. Use it for truffles, frosting, or hot chocolate (not tempering work).
2. Avoid next time: Make sure your bowl, spatula, and thermometer are bone-dry. If you're tempering, work on a marble slab and keep your seed pieces below 30°C.

For our 70% Trinitario, target temperatures are: melt 45°C → cool 28°C → working 31-32°C. The seed method (10-15% reserved chocolate) is more forgiving than tabling.`;
  }
  if (t.includes('scale') || t.includes('batch') || t.includes('5kg') || t.includes('production')) {
    return `Scaling chocolate work is mostly proportional — but two things to watch:

For ganache (200g → 5kg = 25× scale):
• Cream: 100g → 2.5kg
• Chocolate: 100g → 2.5kg
• Use a 60L tempering melter, not a stockpot — even heat is critical.
• Cool to 35°C before emulsifying with an immersion blender for 3 minutes per batch.
• Shelf life is the same, but vacuum-pack in 500g portions for consistency.

If you're making more than 50 batches/month, ask about our 5kg bulk Trinitario pistoles (SKU CO-CAO-IND-02) — we offer a 12% trade discount.`;
  }
  if (t.includes('recipe') || t.includes('suggest')) {
    return `Three recipes built around the India Trinitario 70%:

1. Single-origin Anamalai Bonbon — 70% Trinitario shell, salted Mānuka caramel center, finished with cocoa nib. Showcases the cherry-tobacco notes.
2. Café Mocha Ganache Tart — Trinitario ganache + Sulawesi natural cocoa shortcrust, brushed with Tahitian vanilla syrup.
3. Chocolate Sourdough — 5% cocoa solids in a high-hydration sourdough, finished with a flake-salt cocoa-nib crust.

Want me to expand any of these into a full formula sheet?`;
  }
  return `I'm your COCO36 recipe consultant. I can help with recipe ideas, substitutions, scaling for production, or troubleshooting.

A few starter ideas:
• Ask "How do I temper your 70% Trinitario?"
• "Substitute Dutch cocoa for natural cocoa"
• "Scale a ganache from 200g to 5kg"
• "What can I make with Mānuka honey and dark chocolate?"

(Note: this is a demo response. For production, wire up the @google/genai client to a backend proxy that holds your GEMINI_API_KEY — never ship the key in browser bundles.)`;
}

export const RecipeConsultant = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text: value, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Simulate latency for realism; swap for real Gemini call when wired.
    await new Promise((r) => setTimeout(r, 900));

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      text: generateResponse(value),
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, assistantMsg]);
    setLoading(false);
  };

  return (
    <div className="bg-brand-paper min-h-screen">
      {/* HERO */}
      <section className="pt-36 pb-12 px-6 md:px-12 lg:px-20 border-b border-brand-ink/10">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center">
              <Sparkles size={18} strokeWidth={1.5} />
            </div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-brand-primary font-bold">
              COCO AI Recipe Consultant
            </p>
          </div>

          <h1 className="text-5xl md:text-7xl mb-8 leading-[0.95]">
            Ask me anything,<br />
            <span className="italic">from ganache to scale.</span>
          </h1>

          <p className="text-lg md:text-xl text-brand-ink/70 leading-relaxed font-serif italic max-w-3xl">
            I'm your COCO36 recipe consultant. Ask me how to use our ingredients, troubleshoot a ganache, swap one cocoa for another, or scale a batch for your bakery.
          </p>
        </div>
      </section>

      {/* CHAT INTERFACE */}
      <section className="px-6 md:px-12 lg:px-20 py-12">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Suggested prompts */}
          <aside className="lg:col-span-4 lg:order-last">
            <div className="lg:sticky lg:top-28 space-y-6">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-brand-muted mb-4">Try a prompt</p>
                <ul className="space-y-2">
                  {SUGGESTED_PROMPTS.map((p) => (
                    <li key={p.label}>
                      <button
                        onClick={() => handleSend(p.prompt)}
                        disabled={loading}
                        className="w-full text-left p-4 border border-brand-ink/10 hover:border-brand-ink hover:bg-brand-surface/50 transition-all group flex items-start gap-3 disabled:opacity-50"
                      >
                        <p.icon size={16} strokeWidth={1.5} className="text-brand-primary shrink-0 mt-0.5" />
                        <span className="text-sm font-serif italic leading-snug text-brand-ink/85 group-hover:text-brand-ink">
                          {p.label}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 border border-brand-ink/10 bg-brand-surface/40">
                <p className="text-[10px] uppercase tracking-widest font-bold text-brand-primary mb-2">What I can do</p>
                <ul className="text-xs text-brand-ink/70 space-y-1.5 leading-relaxed">
                  <li>· Suggest recipes using COCO36 ingredients</li>
                  <li>· Troubleshoot baking and chocolate work</li>
                  <li>· Scale formulas across batch sizes</li>
                  <li>· Recommend substitutions and conversions</li>
                </ul>
              </div>
            </div>
          </aside>

          {/* Conversation */}
          <div className="lg:col-span-8 flex flex-col">
            <div
              ref={scrollRef}
              className="flex-1 min-h-[400px] max-h-[60vh] overflow-y-auto border border-brand-ink/10 p-6 bg-brand-paper space-y-6 mb-4"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <Sparkles size={32} strokeWidth={1} className="text-brand-primary mb-4" />
                  <p className="font-serif italic text-xl text-brand-ink/60 mb-2">
                    Ask a question to begin.
                  </p>
                  <p className="text-[11px] uppercase tracking-widest text-brand-muted">
                    Or pick a prompt from the sidebar →
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      <div
                        className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-full ${
                          msg.role === 'user'
                            ? 'bg-brand-ink text-brand-paper'
                            : 'bg-brand-primary/10 text-brand-primary'
                        }`}
                      >
                        {msg.role === 'user' ? (
                          <span className="text-[10px] uppercase font-bold">You</span>
                        ) : (
                          <Sparkles size={14} strokeWidth={1.5} />
                        )}
                      </div>
                      <div
                        className={`max-w-[85%] px-5 py-4 ${
                          msg.role === 'user'
                            ? 'bg-brand-ink text-brand-paper'
                            : 'bg-brand-surface'
                        }`}
                      >
                        <p className="font-serif text-base leading-relaxed whitespace-pre-line">{msg.text}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                    <Sparkles size={14} strokeWidth={1.5} />
                  </div>
                  <div className="bg-brand-surface px-5 py-4">
                    <Loader2 size={16} className="animate-spin text-brand-muted" />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-end gap-3 border border-brand-ink/15 bg-brand-paper p-3 focus-within:border-brand-ink"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask about a recipe, technique, or substitution…"
                rows={2}
                className="flex-1 resize-none bg-transparent px-3 py-2 text-base font-serif italic placeholder:text-brand-muted/50 focus:outline-none"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="shrink-0 px-5 py-3 bg-brand-ink text-brand-paper text-[10px] uppercase tracking-widest font-bold hover:bg-brand-primary transition-all duration-300 flex items-center gap-2 disabled:opacity-30"
              >
                Send <Send size={12} />
              </button>
            </form>

            <p className="mt-3 text-[10px] uppercase tracking-widest text-brand-muted text-center">
              Demo responses · production build wires Gemini via backend proxy
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
