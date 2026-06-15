export interface Step {
  number: number;
  title: string;
  description: string;
}

export interface Phase {
  id: string;
  number: string;            // "I", "II", ...
  title: string;
  subtitle: string;
  description: string;
  image: string;
  steps: Step[];
}

export const PHASES: Phase[] = [
  {
    id: 'seed-and-soil',
    number: 'I',
    title: 'Seed & Soil',
    subtitle: 'Steps 01-06',
    description: 'Origin begins underground. We start with heritage cultivars, biodynamic soil prep, and shade-grown agroforestry.',
    image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&q=80&w=1200',
    steps: [
      { number: 1, title: 'Cultivar Selection',        description: 'Heritage Criollo, Trinitario, and Forastero varietals chosen for terroir match.' },
      { number: 2, title: 'Soil Microbiology Test',    description: 'Lab-verified mycorrhizal counts, pH, and trace mineral baseline before planting.' },
      { number: 3, title: 'Companion Planting',        description: 'Cocoa interplanted with banana, mango, and nitrogen-fixing legumes.' },
      { number: 4, title: 'Nursery Propagation',       description: '90-day shaded nursery period, only the strongest 60% advance to the field.' },
      { number: 5, title: 'Field Transplant',          description: 'Transplanted at 18 months at the start of the long rains.' },
      { number: 6, title: 'Soil Carbon Baseline',      description: 'Initial soil-organic-carbon measurement establishes regenerative baseline.' },
    ],
  },
  {
    id: 'growth',
    number: 'II',
    title: 'Growth',
    subtitle: 'Steps 07-12',
    description: 'Five years to first harvest. We monitor canopy, water, and biodiversity with farmer-owned data.',
    image: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&q=80&w=1200',
    steps: [
      { number: 7,  title: 'Canopy Management',        description: 'Shade trees pruned to maintain 60–70% coverage, protects pods, hosts pollinators.' },
      { number: 8,  title: 'Pollinator Habitat',       description: 'Forced-rest zones for midges, the only species that pollinates cocoa flowers.' },
      { number: 9,  title: 'Drip Irrigation',          description: 'Solar-fed drip irrigation, rainwater-buffered for the dry season.' },
      { number: 10, title: 'Pest Audit',               description: 'Monthly Phytophthora and Capsid scans, IPM-only intervention.' },
      { number: 11, title: 'Biodiversity Census',      description: 'Annual bird, insect, and amphibian counts, published openly.' },
      { number: 12, title: 'First Pod Set',            description: 'Year-five flowering yields the first commercially viable harvest.' },
    ],
  },
  {
    id: 'harvest-and-fermentation',
    number: 'III',
    title: 'Harvest & Fermentation',
    subtitle: 'Steps 13-18',
    description: 'The defining six days. Pods cracked at peak ripeness, beans fermented in cedar boxes, flavor is born here.',
    image: 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?auto=format&fit=crop&q=80&w=1200',
    steps: [
      { number: 13, title: 'Ripeness Selection',        description: 'Color- and sound-tested by hand, only fully ripe pods are cut.' },
      { number: 14, title: 'Pod Breaking',              description: 'Wooden mallets only, preserves bean integrity and shell sugars.' },
      { number: 15, title: 'Cedar-Box Fermentation',    description: 'Six-day cascade through three cedar boxes. Pulp converts to acetic acid.' },
      { number: 16, title: 'Sun Drying',                description: 'Slow seven-day sun-dry on raised teak beds reduces moisture to 7%.' },
      { number: 17, title: 'Sorting & Grading',         description: 'Beans hand-sorted; defective and flat beans removed.' },
      { number: 18, title: 'Origin Lot Sealing',        description: 'Lots vacuum-sealed in jute liners with QR-coded provenance tags.' },
    ],
  },
  {
    id: 'processing-and-quality',
    number: 'IV',
    title: 'Processing & Quality',
    subtitle: 'Steps 19-24',
    description: 'From bean to nib, powder, or couverture, every batch passes our triple-blind sensory and lab review.',
    image: 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?auto=format&fit=crop&q=80&w=1200',
    steps: [
      { number: 19, title: 'Inbound Lab',               description: 'Heavy-metal screen, mycotoxin assay, moisture, and free fatty acid panel.' },
      { number: 20, title: 'Roast Profiling',           description: 'Convection roast curves tuned per origin lot, preserves volatile aromatics.' },
      { number: 21, title: 'Winnowing',                 description: 'Cascading air separates nib from husk; husks composted back to farms.' },
      { number: 22, title: 'Conching or Milling',       description: 'For couverture: 48-hour granite conche. For powder: cold-stone mill.' },
      { number: 23, title: 'Triple-Blind Cupping',      description: 'Three independent panels score each batch. Sub-90 lots are rejected.' },
      { number: 24, title: 'Final Spec Lock',           description: 'Particle size, fat content, and pH locked to product standard.' },
    ],
  },
  {
    id: 'logistics-and-storage',
    number: 'V',
    title: 'Logistics & Storage',
    subtitle: 'Steps 25-30',
    description: 'Climate-controlled, ocean-freight first, with provenance verified at every transfer point.',
    image: 'https://images.unsplash.com/photo-1494412651409-8963ce7935a7?auto=format&fit=crop&q=80&w=1200',
    steps: [
      { number: 25, title: 'Cold-Chain Packing',        description: 'Vacuum-sealed in light-blocking, food-grade liners.' },
      { number: 26, title: 'Origin Bonded Warehouse',   description: '14-day rest in 14.5°C climate-controlled bonded storage at origin port.' },
      { number: 27, title: 'Ocean Freight',             description: 'Reefer containers, 14.5°C average, sealed end-to-end with IoT temp loggers.' },
      { number: 28, title: 'Customs & Re-Lab',          description: 'Re-tested on arrival, independent lab verifies in-transit integrity.' },
      { number: 29, title: 'Distribution Cellar',       description: 'Stored in our temperature-stable cellar until order release.' },
      { number: 30, title: 'Pick & Pack',               description: 'Hand-packed with ice packs in summer; carbon-neutral courier dispatch.' },
    ],
  },
  {
    id: 'craft-and-consumption',
    number: 'VI',
    title: 'Craft & Consumption',
    subtitle: 'Steps 31-36',
    description: 'The journey ends in your kitchen, and begins again with feedback that flows back to the farm.',
    image: 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?auto=format&fit=crop&q=80&w=1200',
    steps: [
      { number: 31, title: 'Last-Mile Delivery',        description: 'Insulated packaging, electric or carbon-offset final-mile fleet.' },
      { number: 32, title: 'Unboxing & Provenance QR',  description: 'Every package includes a scannable QR linking to the harvest log.' },
      { number: 33, title: 'Recipe Activation',         description: 'AI Recipe Consultant suggests ideal applications for the lot you received.' },
      { number: 34, title: 'Craft Kitchen Use',         description: 'Bakers, chocolatiers, manufacturers transform ingredient into final form.' },
      { number: 35, title: 'Sensory Feedback Loop',     description: 'Chefs rate each batch, feedback flows back to the lab and the farm.' },
      { number: 36, title: 'Farmer Premium Settled',    description: 'A guaranteed quality premium is paid back to the originating farm collective.' },
    ],
  },
];
