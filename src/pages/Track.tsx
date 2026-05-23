import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Package, Truck, CheckCircle2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Shipment {
  awb:        string;
  courier:    string;
  status:     string;
  order_id:   string;
}

/**
 * /track/[awb] — branded tracking shell.
 *
 * Looks up shipment by AWB and renders a clean status timeline.
 * For real-time courier events we link out to the Shiprocket tracking
 * deep-link (until we wire the Shiprocket tracking webhook → tracking_events).
 *
 * Anyone with the AWB can view; no auth required.
 */
export const Track = () => {
  const { awb } = useParams<{ awb: string }>();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!awb) return;
    (async () => {
      const { data } = await supabase
        .from('shipments')
        .select('awb, courier, status, order_id')
        .eq('awb', awb)
        .maybeSingle();
      setShipment(data as Shipment | null);
      setLoading(false);
    })();
  }, [awb]);

  const STATES: Array<{ id: string; label: string; icon: React.ReactNode }> = [
    { id: 'pickup_scheduled', label: 'Pickup Scheduled',  icon: <Package size={18} strokeWidth={1.5} /> },
    { id: 'in_transit',       label: 'In Transit',        icon: <Truck size={18} strokeWidth={1.5} /> },
    { id: 'out_for_delivery', label: 'Out for Delivery',  icon: <Truck size={18} strokeWidth={1.5} /> },
    { id: 'delivered',        label: 'Delivered',         icon: <CheckCircle2 size={18} strokeWidth={1.5} /> },
  ];

  const activeIndex = STATES.findIndex((s) => s.id === shipment?.status);

  return (
    <div className="bg-brand-paper min-h-screen pt-20 md:pt-24">
      <div className="max-w-3xl mx-auto px-6 md:px-10 lg:px-16 py-12 space-y-10">

        <header className="border-b border-brand-ink/10 pb-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-brand-primary font-bold mb-2">Shipment Tracking</p>
          <h1 className="text-4xl">AWB {awb}</h1>
        </header>

        {loading && <p className="text-sm text-brand-muted">Looking up your shipment…</p>}

        {!loading && !shipment && (
          <div className="bg-white border border-brand-ink/10 p-8 text-center">
            <p className="text-sm text-brand-muted mb-4">No shipment found for this AWB.</p>
            <Link to="/" className="text-[10px] uppercase tracking-widest font-bold text-brand-primary hover:underline">
              Back to home →
            </Link>
          </div>
        )}

        {!loading && shipment && (
          <>
            {/* Carrier card */}
            <div className="bg-white border border-brand-ink/10 p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-brand-muted font-bold mb-1">Courier</p>
                <p className="font-bold text-brand-ink">{shipment.courier || '—'}</p>
              </div>
              <a
                href={`https://shiprocket.co/tracking/${shipment.awb}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-brand-primary hover:underline"
              >
                Live updates <ArrowRight size={12} />
              </a>
            </div>

            {/* Timeline */}
            <div className="bg-white border border-brand-ink/10 p-6">
              <ol className="space-y-6">
                {STATES.map((s, i) => {
                  const reached = activeIndex >= i;
                  const current = activeIndex === i;
                  return (
                    <li key={s.id} className="flex items-start gap-4">
                      <div
                        className={`size-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          reached ? 'bg-brand-primary text-white' : 'bg-brand-surface text-brand-muted'
                        }`}
                      >
                        {s.icon}
                      </div>
                      <div className="flex-1 pt-1">
                        <p className={`text-sm font-bold ${reached ? 'text-brand-ink' : 'text-brand-muted'}`}>
                          {s.label}
                        </p>
                        {current && (
                          <p className="text-xs text-brand-primary uppercase tracking-widest font-bold mt-1">
                            Current Status
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            <p className="text-xs text-brand-muted text-center">
              Need help?{' '}
              <a href="mailto:support@coco36.com" className="text-brand-primary hover:underline font-bold">
                support@coco36.com
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
};
