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

// Decorative, neutral imagery (grayscaled in the UI) reused across phases.
const IMG_FIELD = 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&q=80&w=1200';
const IMG_LAND  = 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&q=80&w=1200';
const IMG_STORE = 'https://images.unsplash.com/photo-1494412651409-8963ce7935a7?auto=format&fit=crop&q=80&w=1200';

/**
 * COCO36's crop-to-craft framework, written generically so it holds across
 * every category (cocoa, flours, sugars, extracts, spices, mixes). It describes
 * the STANDARD each lot moves through — no fabricated metrics or crop-specific
 * claims. The crop-specific work lives inside steps 08 and 20.
 */
export const PHASES: Phase[] = [
  {
    id: 'origin',
    number: 'I',
    title: 'Origin & Sourcing',
    subtitle: 'Steps 01-06',
    description: 'Every ingredient starts with where and how it is grown. We source from named origins, not anonymous channels.',
    image: IMG_FIELD,
    steps: [
      { number: 1, title: 'Origin selection',      description: 'We match each crop to a region and growing conditions suited to it.' },
      { number: 2, title: 'Grower partnership',    description: 'We source from named estates, farms and collectives, never anonymous brokers.' },
      { number: 3, title: 'Variety & seed',        description: 'The cultivar or variety is chosen for flavour, quality and resilience.' },
      { number: 4, title: 'Responsible land',      description: 'We favour regenerative, biodiverse and low-input growing practices.' },
      { number: 5, title: 'Harvest timing',        description: 'The crop is picked at the right ripeness or maturity for its type.' },
      { number: 6, title: 'First-mile collection', description: 'Harvests are gathered and consolidated together with the grower.' },
    ],
  },
  {
    id: 'processing',
    number: 'II',
    title: 'Harvest & Primary Processing',
    subtitle: 'Steps 07-12',
    description: 'Raw crop becomes a stable, graded ingredient, with the lot recorded from the very first step.',
    image: IMG_LAND,
    steps: [
      { number: 7,  title: 'Cleaning & sorting',    description: 'Debris, foreign matter and under-grade material are removed.' },
      { number: 8,  title: 'Primary processing',    description: 'The crop-specific first step, whether fermenting, hulling, pressing or distilling.' },
      { number: 9,  title: 'Drying & curing',       description: 'Moisture is brought to a level that is safe and stable for storage.' },
      { number: 10, title: 'Grading',               description: 'The batch is sorted by size, grade and quality tier.' },
      { number: 11, title: 'Lot identification',    description: 'A lot code is assigned so the batch can be traced end to end.' },
      { number: 12, title: 'Origin documentation',  description: 'Harvest date, location and grower are recorded against the lot.' },
    ],
  },
  {
    id: 'quality',
    number: 'III',
    title: 'Quality & Testing',
    subtitle: 'Steps 13-18',
    description: 'No lot moves forward on trust alone. Each is sampled, tasted and lab-checked against our standard.',
    image: IMG_STORE,
    steps: [
      { number: 13, title: 'Representative sampling', description: 'Samples are drawn from each lot for assessment.' },
      { number: 14, title: 'Sensory evaluation',      description: 'Taste, aroma and appearance are checked against our standard.' },
      { number: 15, title: 'Lab analysis',            description: 'A Certificate of Analysis records the key parameters for the lot.' },
      { number: 16, title: 'Safety screening',        description: 'We test for contaminants, residues and adulteration as relevant to the crop.' },
      { number: 17, title: 'Spec verification',       description: 'Moisture, purity and grade are confirmed against the product spec.' },
      { number: 18, title: 'Batch approval',          description: 'Only lots that pass advance; the rest are held or sent back.' },
    ],
  },
  {
    id: 'craft',
    number: 'IV',
    title: 'Craft & Transformation',
    subtitle: 'Steps 19-24',
    description: 'The ingredient is brought to its finished form, with consistency held to a published specification.',
    image: IMG_FIELD,
    steps: [
      { number: 19, title: 'Intake check',            description: 'The lot is re-verified as it enters the craft stage.' },
      { number: 20, title: 'Transformation',          description: 'The category-appropriate craft step, such as roasting, milling, refining or blending.' },
      { number: 21, title: 'In-process control',      description: 'The process is monitored to hold flavour and consistency.' },
      { number: 22, title: 'Formulation & blending',  description: 'Mixes and blends are built to a defined recipe, where applicable.' },
      { number: 23, title: 'Finishing',               description: 'A final refinement brings the ingredient to the product standard.' },
      { number: 24, title: 'Final spec lock',         description: 'The finished ingredient is locked to its published specification.' },
    ],
  },
  {
    id: 'logistics',
    number: 'V',
    title: 'Documentation & Logistics',
    subtitle: 'Steps 25-30',
    description: 'Provenance is compiled and the ingredient is packed, labelled and stored to reach you intact.',
    image: IMG_STORE,
    steps: [
      { number: 25, title: 'Provenance record',       description: 'The origin-to-craft history of the lot is compiled into one record.' },
      { number: 26, title: 'Certification mapping',    description: 'Applicable certifications and documents are attached to the lot.' },
      { number: 27, title: 'Protective packing',       description: 'Packed in food-grade materials chosen to protect freshness.' },
      { number: 28, title: 'Labelling & compliance',   description: 'Labelled with FSSAI, batch and statutory details.' },
      { number: 29, title: 'Correct storage',          description: 'Held in dry or cool conditions suited to the ingredient.' },
      { number: 30, title: 'Dispatch',                 description: 'Released and shipped with the lot details carried through.' },
    ],
  },
  {
    id: 'kitchen',
    number: 'VI',
    title: 'Kitchen & Feedback',
    subtitle: 'Steps 31-36',
    description: 'The journey ends in your kitchen, and begins again with feedback and fair value flowing back to origin.',
    image: IMG_LAND,
    steps: [
      { number: 31, title: 'Last-mile delivery',      description: 'The order reaches your door in protective packaging.' },
      { number: 32, title: 'Lot traceability',        description: 'Each order carries its lot reference so its journey can be looked up.' },
      { number: 33, title: 'Storage & handling',      description: 'Clear guidance on keeping the ingredient at its best.' },
      { number: 34, title: 'Your craft',              description: 'You transform the ingredient into your final product.' },
      { number: 35, title: 'Feedback',                description: 'Quality feedback is captured and reviewed batch to batch.' },
      { number: 36, title: 'Back to origin',          description: 'Learnings and fair value flow back to the growers we source from.' },
    ],
  },
];
