import type { Track } from "./store";

export const SEED_TRACKS: Track[] = [
  {
    id: "physics",
    name: "Physics",
    chapters: [
      {
        id: "phy-1", trackId: "physics", name: "Kinematics", priority: "High", completion: 0,
        concepts: [
          { id: "phy-1-c1", name: "Equations of motion (v, s, a)", done: false, weight: "Medium" },
          { id: "phy-1-c2", name: "Projectile motion", done: false, weight: "Medium" },
          { id: "phy-1-c3", name: "Relative velocity", done: false, weight: "Medium" },
          { id: "phy-1-c4", name: "v-t and x-t graph analysis", done: false, weight: "Medium" },
          { id: "phy-1-c5", name: "Circular motion — speed & acceleration", done: false, weight: "Medium" },
        ],
      },
      {
        id: "phy-2", trackId: "physics", name: "Laws of Motion", priority: "High", completion: 0,
        concepts: [
          { id: "phy-2-c1", name: "Newton's three laws", done: false, weight: "Medium" },
          { id: "phy-2-c2", name: "Free body diagrams", done: false, weight: "Medium" },
          { id: "phy-2-c3", name: "Static & kinetic friction", done: false, weight: "Medium" },
          { id: "phy-2-c4", name: "Constraint motion (string/pulley)", done: false, weight: "Medium" },
          { id: "phy-2-c5", name: "Pseudo force in non-inertial frames", done: false, weight: "Medium" },
        ],
      },
      {
        id: "phy-3", trackId: "physics", name: "Rotational Motion", priority: "High", completion: 0,
        concepts: [
          { id: "phy-3-c1", name: "Moment of inertia & parallel axis theorem", done: false, weight: "Medium" },
          { id: "phy-3-c2", name: "Torque and angular momentum", done: false, weight: "Medium" },
          { id: "phy-3-c3", name: "Rolling without slipping", done: false, weight: "Medium" },
          { id: "phy-3-c4", name: "Angular kinematics equations", done: false, weight: "Medium" },
          { id: "phy-3-c5", name: "Conservation of angular momentum", done: false, weight: "Medium" },
        ],
      },
      {
        id: "phy-4", trackId: "physics", name: "Gravitation", priority: "Medium", completion: 0,
        concepts: [
          { id: "phy-4-c1", name: "Newton's law of gravitation", done: false, weight: "Medium" },
          { id: "phy-4-c2", name: "Gravitational field & potential", done: false, weight: "Medium" },
          { id: "phy-4-c3", name: "Kepler's laws", done: false, weight: "Medium" },
          { id: "phy-4-c4", name: "Orbital & escape velocity", done: false, weight: "Medium" },
        ],
      },
      {
        id: "phy-5", trackId: "physics", name: "Thermodynamics", priority: "High", completion: 0,
        concepts: [
          { id: "phy-5-c1", name: "Zeroth & first law", done: false, weight: "Medium" },
          { id: "phy-5-c2", name: "Isothermal, adiabatic, isochoric, isobaric processes", done: false, weight: "Medium" },
          { id: "phy-5-c3", name: "Second law & Carnot engine", done: false, weight: "Medium" },
          { id: "phy-5-c4", name: "Specific heat of gases (Cp, Cv, γ)", done: false, weight: "Medium" },
          { id: "phy-5-c5", name: "KTG — rms speed, mean free path", done: false, weight: "Medium" },
        ],
      },
      {
        id: "phy-6", trackId: "physics", name: "Electrostatics", priority: "High", completion: 0,
        concepts: [
          { id: "phy-6-c1", name: "Coulomb's law & superposition", done: false, weight: "Medium" },
          { id: "phy-6-c2", name: "Electric field lines & flux", done: false, weight: "Medium" },
          { id: "phy-6-c3", name: "Gauss's law applications", done: false, weight: "Medium" },
          { id: "phy-6-c4", name: "Electric potential & potential energy", done: false, weight: "Medium" },
          { id: "phy-6-c5", name: "Capacitors — series/parallel, energy", done: false, weight: "Medium" },
          { id: "phy-6-c6", name: "Dielectrics", done: false, weight: "Medium" },
        ],
      },
      {
        id: "phy-7", trackId: "physics", name: "Current Electricity", priority: "High", completion: 0,
        concepts: [
          { id: "phy-7-c1", name: "Ohm's law & resistivity", done: false, weight: "Medium" },
          { id: "phy-7-c2", name: "Kirchhoff's laws (KVL, KCL)", done: false, weight: "Medium" },
          { id: "phy-7-c3", name: "Wheatstone bridge & meter bridge", done: false, weight: "Medium" },
          { id: "phy-7-c4", name: "EMF & internal resistance", done: false, weight: "Medium" },
          { id: "phy-7-c5", name: "RC circuits — charging/discharging", done: false, weight: "Medium" },
        ],
      },
      {
        id: "phy-8", trackId: "physics", name: "Magnetism & EMI", priority: "High", completion: 0,
        concepts: [
          { id: "phy-8-c1", name: "Biot-Savart law", done: false, weight: "Medium" },
          { id: "phy-8-c2", name: "Ampere's law applications", done: false, weight: "Medium" },
          { id: "phy-8-c3", name: "Force on current in magnetic field", done: false, weight: "Medium" },
          { id: "phy-8-c4", name: "Faraday's & Lenz's law", done: false, weight: "Medium" },
          { id: "phy-8-c5", name: "Self & mutual inductance", done: false, weight: "Medium" },
          { id: "phy-8-c6", name: "AC circuits — LCR, resonance", done: false, weight: "Medium" },
        ],
      },
      {
        id: "phy-9", trackId: "physics", name: "Optics", priority: "Medium", completion: 0,
        concepts: [
          { id: "phy-9-c1", name: "Reflection — mirrors & image formation", done: false, weight: "Medium" },
          { id: "phy-9-c2", name: "Refraction — Snell's law, TIR", done: false, weight: "Medium" },
          { id: "phy-9-c3", name: "Lens formula & magnification", done: false, weight: "Medium" },
          { id: "phy-9-c4", name: "Young's double slit experiment", done: false, weight: "Medium" },
          { id: "phy-9-c5", name: "Diffraction & polarisation basics", done: false, weight: "Medium" },
        ],
      },
      {
        id: "phy-10", trackId: "physics", name: "Modern Physics", priority: "High", completion: 0,
        concepts: [
          { id: "phy-10-c1", name: "Photoelectric effect", done: false, weight: "Medium" },
          { id: "phy-10-c2", name: "Bohr model of hydrogen atom", done: false, weight: "Medium" },
          { id: "phy-10-c3", name: "de Broglie wavelength", done: false, weight: "Medium" },
          { id: "phy-10-c4", name: "Radioactivity — decay law, half-life", done: false, weight: "Medium" },
          { id: "phy-10-c5", name: "Nuclear reactions & binding energy", done: false, weight: "Medium" },
        ],
      },
      {
        id: "phy-11", trackId: "physics", name: "Waves & SHM", priority: "Medium", completion: 0,
        concepts: [
          { id: "phy-11-c1", name: "SHM — equation, energy, time period", done: false, weight: "Medium" },
          { id: "phy-11-c2", name: "Spring-mass and pendulum systems", done: false, weight: "Medium" },
          { id: "phy-11-c3", name: "Wave equation — speed, frequency, wavelength", done: false, weight: "Medium" },
          { id: "phy-11-c4", name: "Superposition & standing waves", done: false, weight: "Medium" },
          { id: "phy-11-c5", name: "Doppler effect", done: false, weight: "Medium" },
        ],
      },
    ],
  },
  {
    id: "pchem",
    name: "Physical Chemistry",
    chapters: [
      {
        id: "pc-1", trackId: "pchem", name: "Mole Concept", priority: "High", completion: 0,
        concepts: [
          { id: "pc-1-c1", name: "Mole, Avogadro number, molar mass", done: false, weight: "Medium" },
          { id: "pc-1-c2", name: "Stoichiometry & balancing equations", done: false, weight: "Medium" },
          { id: "pc-1-c3", name: "Limiting reagent & % yield", done: false, weight: "Medium" },
          { id: "pc-1-c4", name: "Concentration terms (M, m, χ, ppm)", done: false, weight: "Medium" },
          { id: "pc-1-c5", name: "POAC & cross-multiplication method", done: false, weight: "Medium" },
        ],
      },
      {
        id: "pc-2", trackId: "pchem", name: "Atomic Structure", priority: "High", completion: 0,
        concepts: [
          { id: "pc-2-c1", name: "Bohr model & spectral lines", done: false, weight: "Medium" },
          { id: "pc-2-c2", name: "Quantum numbers (n, l, m, s)", done: false, weight: "Medium" },
          { id: "pc-2-c3", name: "Orbital shapes & radial nodes", done: false, weight: "Medium" },
          { id: "pc-2-c4", name: "Electronic configuration & exceptions", done: false, weight: "Medium" },
        ],
      },
      {
        id: "pc-3", trackId: "pchem", name: "Thermodynamics", priority: "High", completion: 0,
        concepts: [
          { id: "pc-3-c1", name: "System, surroundings, state functions", done: false, weight: "Medium" },
          { id: "pc-3-c2", name: "Enthalpy & Hess's law", done: false, weight: "Medium" },
          { id: "pc-3-c3", name: "Entropy & second law", done: false, weight: "Medium" },
          { id: "pc-3-c4", name: "Gibbs free energy & spontaneity", done: false, weight: "Medium" },
          { id: "pc-3-c5", name: "Bond enthalpies & Born-Haber cycle", done: false, weight: "Medium" },
        ],
      },
      {
        id: "pc-4", trackId: "pchem", name: "Chemical Equilibrium", priority: "High", completion: 0,
        concepts: [
          { id: "pc-4-c1", name: "Kc and Kp expressions", done: false, weight: "Medium" },
          { id: "pc-4-c2", name: "Relation between Kc and Kp", done: false, weight: "Medium" },
          { id: "pc-4-c3", name: "Le Chatelier's principle", done: false, weight: "Medium" },
          { id: "pc-4-c4", name: "Degree of dissociation calculations", done: false, weight: "Medium" },
        ],
      },
      {
        id: "pc-5", trackId: "pchem", name: "Ionic Equilibrium", priority: "High", completion: 0,
        concepts: [
          { id: "pc-5-c1", name: "pH, pOH, pKa, pKb", done: false, weight: "Medium" },
          { id: "pc-5-c2", name: "Buffer solutions (Henderson equation)", done: false, weight: "Medium" },
          { id: "pc-5-c3", name: "Solubility product (Ksp)", done: false, weight: "Medium" },
          { id: "pc-5-c4", name: "Salt hydrolysis", done: false, weight: "Medium" },
          { id: "pc-5-c5", name: "Indicators & titration curves", done: false, weight: "Medium" },
        ],
      },
      {
        id: "pc-6", trackId: "pchem", name: "Electrochemistry", priority: "High", completion: 0,
        concepts: [
          { id: "pc-6-c1", name: "Galvanic cell, EMF, SHE", done: false, weight: "Medium" },
          { id: "pc-6-c2", name: "Nernst equation", done: false, weight: "Medium" },
          { id: "pc-6-c3", name: "Electrolysis & Faraday's laws", done: false, weight: "Medium" },
          { id: "pc-6-c4", name: "Conductance & Kohlrausch's law", done: false, weight: "Medium" },
        ],
      },
      {
        id: "pc-7", trackId: "pchem", name: "Chemical Kinetics", priority: "Medium", completion: 0,
        concepts: [
          { id: "pc-7-c1", name: "Rate laws & order of reaction", done: false, weight: "Medium" },
          { id: "pc-7-c2", name: "Integrated rate equations (0, 1st, 2nd order)", done: false, weight: "Medium" },
          { id: "pc-7-c3", name: "Arrhenius equation & activation energy", done: false, weight: "Medium" },
          { id: "pc-7-c4", name: "Half-life calculations", done: false, weight: "Medium" },
        ],
      },
      {
        id: "pc-8", trackId: "pchem", name: "Solutions", priority: "Medium", completion: 0,
        concepts: [
          { id: "pc-8-c1", name: "Raoult's law & ideal/non-ideal solutions", done: false, weight: "Medium" },
          { id: "pc-8-c2", name: "Colligative properties overview", done: false, weight: "Medium" },
          { id: "pc-8-c3", name: "Elevation of boiling point & depression of freezing point", done: false, weight: "Medium" },
          { id: "pc-8-c4", name: "Osmosis & van 't Hoff factor", done: false, weight: "Medium" },
        ],
      },
    ],
  },
  {
    id: "ochem",
    name: "Organic Chemistry",
    chapters: [
      {
        id: "oc-1", trackId: "ochem", name: "GOC & Isomerism", priority: "High", completion: 0,
        concepts: [
          { id: "oc-1-c1", name: "Inductive & field effects", done: false, weight: "Medium" },
          { id: "oc-1-c2", name: "Resonance & mesomeric effect", done: false, weight: "Medium" },
          { id: "oc-1-c3", name: "Hyperconjugation", done: false, weight: "Medium" },
          { id: "oc-1-c4", name: "Structural isomerism types", done: false, weight: "Medium" },
          { id: "oc-1-c5", name: "Stereoisomerism — enantiomers, diastereomers", done: false, weight: "Medium" },
          { id: "oc-1-c6", name: "R/S and E/Z nomenclature", done: false, weight: "Medium" },
        ],
      },
      {
        id: "oc-2", trackId: "ochem", name: "Hydrocarbons", priority: "High", completion: 0,
        concepts: [
          { id: "oc-2-c1", name: "Alkanes — free radical halogenation", done: false, weight: "Medium" },
          { id: "oc-2-c2", name: "Alkenes — addition reactions, Markovnikov", done: false, weight: "Medium" },
          { id: "oc-2-c3", name: "Alkynes — acidic nature, reactions", done: false, weight: "Medium" },
          { id: "oc-2-c4", name: "Aromatic compounds — EAS reactions", done: false, weight: "Medium" },
          { id: "oc-2-c5", name: "Birch reduction & Friedel-Crafts", done: false, weight: "Medium" },
        ],
      },
      {
        id: "oc-3", trackId: "ochem", name: "Haloalkanes & Haloarenes", priority: "High", completion: 0,
        concepts: [
          { id: "oc-3-c1", name: "SN1 vs SN2 mechanism", done: false, weight: "Medium" },
          { id: "oc-3-c2", name: "E1 vs E2 elimination", done: false, weight: "Medium" },
          { id: "oc-3-c3", name: "Nucleophilic aromatic substitution", done: false, weight: "Medium" },
          { id: "oc-3-c4", name: "Grignard reagent preparation", done: false, weight: "Medium" },
        ],
      },
      {
        id: "oc-4", trackId: "ochem", name: "Alcohols, Phenols, Ethers", priority: "High", completion: 0,
        concepts: [
          { id: "oc-4-c1", name: "Acidity of alcohols vs phenols", done: false, weight: "Medium" },
          { id: "oc-4-c2", name: "Reactions of alcohols (oxidation, esterification)", done: false, weight: "Medium" },
          { id: "oc-4-c3", name: "Phenol reactions (nitration, Kolbe, Reimer-Tiemann)", done: false, weight: "Medium" },
          { id: "oc-4-c4", name: "Ether synthesis & cleavage", done: false, weight: "Medium" },
        ],
      },
      {
        id: "oc-5", trackId: "ochem", name: "Aldehydes & Ketones", priority: "High", completion: 0,
        concepts: [
          { id: "oc-5-c1", name: "Nucleophilic addition mechanism", done: false, weight: "Medium" },
          { id: "oc-5-c2", name: "Aldol condensation", done: false, weight: "Medium" },
          { id: "oc-5-c3", name: "Cannizzaro reaction", done: false, weight: "Medium" },
          { id: "oc-5-c4", name: "Oxidation — Tollens, Fehling, Benedict", done: false, weight: "Medium" },
          { id: "oc-5-c5", name: "Named reactions — Clemmensen, Wolff-Kishner", done: false, weight: "Medium" },
        ],
      },
      {
        id: "oc-6", trackId: "ochem", name: "Carboxylic Acids", priority: "Medium", completion: 0,
        concepts: [
          { id: "oc-6-c1", name: "Acidity factors & pKa comparison", done: false, weight: "Medium" },
          { id: "oc-6-c2", name: "Fischer esterification", done: false, weight: "Medium" },
          { id: "oc-6-c3", name: "Acid derivatives (anhydrides, chlorides, amides)", done: false, weight: "Medium" },
          { id: "oc-6-c4", name: "Hell-Volhard-Zelinsky reaction", done: false, weight: "Medium" },
        ],
      },
      {
        id: "oc-7", trackId: "ochem", name: "Amines", priority: "High", completion: 0,
        concepts: [
          { id: "oc-7-c1", name: "Basicity order of amines", done: false, weight: "Medium" },
          { id: "oc-7-c2", name: "Preparation methods (Gabriel, Hoffman)", done: false, weight: "Medium" },
          { id: "oc-7-c3", name: "Diazotization & coupling reaction", done: false, weight: "Medium" },
          { id: "oc-7-c4", name: "Reactions with nitrous acid (1°, 2°, 3°)", done: false, weight: "Medium" },
        ],
      },
      {
        id: "oc-8", trackId: "ochem", name: "Biomolecules & Polymers", priority: "Medium", completion: 0,
        concepts: [
          { id: "oc-8-c1", name: "Carbohydrates — reducing sugars, mutarotation", done: false, weight: "Medium" },
          { id: "oc-8-c2", name: "Proteins — primary to quaternary structure", done: false, weight: "Medium" },
          { id: "oc-8-c3", name: "Nucleic acids — DNA vs RNA", done: false, weight: "Medium" },
          { id: "oc-8-c4", name: "Polymers — addition vs condensation", done: false, weight: "Medium" },
        ],
      },
    ],
  },
  {
    id: "ichem",
    name: "Inorganic Chemistry",
    chapters: [
      {
        id: "ic-1", trackId: "ichem", name: "Chemical Bonding", priority: "High", completion: 0,
        concepts: [
          { id: "ic-1-c1", name: "Lewis dot structures & formal charge", done: false, weight: "Medium" },
          { id: "ic-1-c2", name: "VSEPR theory & geometry prediction", done: false, weight: "Medium" },
          { id: "ic-1-c3", name: "Hybridization (sp, sp2, sp3, sp3d…)", done: false, weight: "Medium" },
          { id: "ic-1-c4", name: "Molecular orbital theory (MOT)", done: false, weight: "Medium" },
          { id: "ic-1-c5", name: "Hydrogen bonding & van der Waals forces", done: false, weight: "Medium" },
        ],
      },
      {
        id: "ic-2", trackId: "ichem", name: "Periodic Table", priority: "High", completion: 0,
        concepts: [
          { id: "ic-2-c1", name: "Atomic & ionic radius trends", done: false, weight: "Medium" },
          { id: "ic-2-c2", name: "Ionization energy & electron affinity", done: false, weight: "Medium" },
          { id: "ic-2-c3", name: "Electronegativity trends", done: false, weight: "Medium" },
          { id: "ic-2-c4", name: "Effective nuclear charge (Slater's rules)", done: false, weight: "Medium" },
        ],
      },
      {
        id: "ic-3", trackId: "ichem", name: "Coordination Compounds", priority: "High", completion: 0,
        concepts: [
          { id: "ic-3-c1", name: "IUPAC nomenclature", done: false, weight: "Medium" },
          { id: "ic-3-c2", name: "VBT & CFT bonding theories", done: false, weight: "Medium" },
          { id: "ic-3-c3", name: "Isomerism (geometric, optical, linkage)", done: false, weight: "Medium" },
          { id: "ic-3-c4", name: "Spectrochemical series & color", done: false, weight: "Medium" },
          { id: "ic-3-c5", name: "Stability constants & chelate effect", done: false, weight: "Medium" },
        ],
      },
      {
        id: "ic-4", trackId: "ichem", name: "p-Block Elements", priority: "High", completion: 0,
        concepts: [
          { id: "ic-4-c1", name: "Group 13 — Boron compounds (borax, boric acid)", done: false, weight: "Medium" },
          { id: "ic-4-c2", name: "Group 14 — Carbon allotropes, silicates", done: false, weight: "Medium" },
          { id: "ic-4-c3", name: "Group 15 — Nitrogen oxides, phosphorus compounds", done: false, weight: "Medium" },
          { id: "ic-4-c4", name: "Group 16 — Sulphur oxoacids", done: false, weight: "Medium" },
          { id: "ic-4-c5", name: "Group 17 — Halogens, interhalogen compounds", done: false, weight: "Medium" },
          { id: "ic-4-c6", name: "Group 18 — Noble gas compounds", done: false, weight: "Medium" },
        ],
      },
      {
        id: "ic-5", trackId: "ichem", name: "d & f-Block Elements", priority: "Medium", completion: 0,
        concepts: [
          { id: "ic-5-c1", name: "General properties & electronic configuration", done: false, weight: "Medium" },
          { id: "ic-5-c2", name: "Magnetic moment & colour", done: false, weight: "Medium" },
          { id: "ic-5-c3", name: "Important compounds (KMnO4, K2Cr2O7)", done: false, weight: "Medium" },
          { id: "ic-5-c4", name: "Lanthanide contraction", done: false, weight: "Medium" },
        ],
      },
      {
        id: "ic-6", trackId: "ichem", name: "s-Block Elements", priority: "Medium", completion: 0,
        concepts: [
          { id: "ic-6-c1", name: "Alkali metals — properties & compounds", done: false, weight: "Medium" },
          { id: "ic-6-c2", name: "Alkaline earth metals — properties & compounds", done: false, weight: "Medium" },
          { id: "ic-6-c3", name: "Anomalous behaviour of Li & Be", done: false, weight: "Medium" },
          { id: "ic-6-c4", name: "Biological importance of Na, K, Ca, Mg", done: false, weight: "Medium" },
        ],
      },
      {
        id: "ic-7", trackId: "ichem", name: "Qualitative Analysis", priority: "High", completion: 0,
        concepts: [
          { id: "ic-7-c1", name: "Group 0 — soluble salts", done: false, weight: "Medium" },
          { id: "ic-7-c2", name: "Groups I-IV cation identification", done: false, weight: "Medium" },
          { id: "ic-7-c3", name: "Groups V-VI cation identification", done: false, weight: "Medium" },
          { id: "ic-7-c4", name: "Anion tests (carbonate, sulphate, halides, etc.)", done: false, weight: "Medium" },
        ],
      },
    ],
  },
  {
    id: "maths",
    name: "Mathematics",
    chapters: [
      {
        id: "m-1", trackId: "maths", name: "Quadratic Equations", priority: "Medium", completion: 0,
        concepts: [
          { id: "m-1-c1", name: "Sum & product of roots (Vieta's formulas)", done: false, weight: "Medium" },
          { id: "m-1-c2", name: "Nature of roots — discriminant", done: false, weight: "Medium" },
          { id: "m-1-c3", name: "Quadratic inequalities & wavy curve method", done: false, weight: "Medium" },
          { id: "m-1-c4", name: "Common roots & transformation of equations", done: false, weight: "Medium" },
        ],
      },
      {
        id: "m-2", trackId: "maths", name: "Sequences & Series", priority: "Medium", completion: 0,
        concepts: [
          { id: "m-2-c1", name: "AP — nth term & sum formulas", done: false, weight: "Medium" },
          { id: "m-2-c2", name: "GP — nth term, sum, infinite GP", done: false, weight: "Medium" },
          { id: "m-2-c3", name: "HP & AM-GM-HM inequality", done: false, weight: "Medium" },
          { id: "m-2-c4", name: "Telescoping & method of differences", done: false, weight: "Medium" },
        ],
      },
      {
        id: "m-3", trackId: "maths", name: "Trigonometry", priority: "High", completion: 0,
        concepts: [
          { id: "m-3-c1", name: "Basic identities & transformations", done: false, weight: "Medium" },
          { id: "m-3-c2", name: "Inverse trigonometric functions", done: false, weight: "Medium" },
          { id: "m-3-c3", name: "Trigonometric equations", done: false, weight: "Medium" },
          { id: "m-3-c4", name: "Properties of triangle (sine/cosine rule)", done: false, weight: "Medium" },
          { id: "m-3-c5", name: "Heights & distances", done: false, weight: "Medium" },
        ],
      },
      {
        id: "m-4", trackId: "maths", name: "Coordinate Geometry", priority: "High", completion: 0,
        concepts: [
          { id: "m-4-c1", name: "Distance & section formula", done: false, weight: "Medium" },
          { id: "m-4-c2", name: "Equations of a line (all forms)", done: false, weight: "Medium" },
          { id: "m-4-c3", name: "Angle between lines & distance from point", done: false, weight: "Medium" },
          { id: "m-4-c4", name: "Locus problems", done: false, weight: "Medium" },
          { id: "m-4-c5", name: "Circle — equation, tangent, chord of contact", done: false, weight: "Medium" },
        ],
      },
      {
        id: "m-5", trackId: "maths", name: "Conic Sections", priority: "High", completion: 0,
        concepts: [
          { id: "m-5-c1", name: "Parabola — standard forms & properties", done: false, weight: "Medium" },
          { id: "m-5-c2", name: "Ellipse — eccentricity, foci, directrix", done: false, weight: "Medium" },
          { id: "m-5-c3", name: "Hyperbola — asymptotes, rectangular hyperbola", done: false, weight: "Medium" },
          { id: "m-5-c4", name: "Tangent & normal equations for all conics", done: false, weight: "Medium" },
          { id: "m-5-c5", name: "Chord of contact & pair of tangents", done: false, weight: "Medium" },
        ],
      },
      {
        id: "m-6", trackId: "maths", name: "Limits, Continuity, Differentiability", priority: "High", completion: 0,
        concepts: [
          { id: "m-6-c1", name: "Standard limits & L'Hôpital's rule", done: false, weight: "Medium" },
          { id: "m-6-c2", name: "Sandwich theorem", done: false, weight: "Medium" },
          { id: "m-6-c3", name: "Continuity — types of discontinuity", done: false, weight: "Medium" },
          { id: "m-6-c4", name: "Differentiability — corner, cusp, vertical tangent", done: false, weight: "Medium" },
        ],
      },
      {
        id: "m-7", trackId: "maths", name: "Application of Derivatives", priority: "High", completion: 0,
        concepts: [
          { id: "m-7-c1", name: "Tangent & normal to a curve", done: false, weight: "Medium" },
          { id: "m-7-c2", name: "Monotonicity — increasing/decreasing intervals", done: false, weight: "Medium" },
          { id: "m-7-c3", name: "Maxima & minima (first/second derivative test)", done: false, weight: "Medium" },
          { id: "m-7-c4", name: "Rate of change & related rates", done: false, weight: "Medium" },
          { id: "m-7-c5", name: "Rolle's & mean value theorems", done: false, weight: "Medium" },
        ],
      },
      {
        id: "m-8", trackId: "maths", name: "Integrals & Area", priority: "High", completion: 0,
        concepts: [
          { id: "m-8-c1", name: "Standard integrals & substitution", done: false, weight: "Medium" },
          { id: "m-8-c2", name: "Integration by parts (ILATE)", done: false, weight: "Medium" },
          { id: "m-8-c3", name: "Partial fractions", done: false, weight: "Medium" },
          { id: "m-8-c4", name: "Definite integral properties", done: false, weight: "Medium" },
          { id: "m-8-c5", name: "Area under curves & between curves", done: false, weight: "Medium" },
        ],
      },
      {
        id: "m-9", trackId: "maths", name: "Differential Equations", priority: "Medium", completion: 0,
        concepts: [
          { id: "m-9-c1", name: "Variable separable method", done: false, weight: "Medium" },
          { id: "m-9-c2", name: "Homogeneous differential equations", done: false, weight: "Medium" },
          { id: "m-9-c3", name: "Linear first-order ODE (integrating factor)", done: false, weight: "Medium" },
          { id: "m-9-c4", name: "Bernoulli's equation", done: false, weight: "Medium" },
        ],
      },
      {
        id: "m-10", trackId: "maths", name: "Vectors & 3D Geometry", priority: "High", completion: 0,
        concepts: [
          { id: "m-10-c1", name: "Dot product & cross product", done: false, weight: "Medium" },
          { id: "m-10-c2", name: "Scalar triple product & coplanarity", done: false, weight: "Medium" },
          { id: "m-10-c3", name: "Line in 3D — symmetric & parametric form", done: false, weight: "Medium" },
          { id: "m-10-c4", name: "Plane equations & angle between planes", done: false, weight: "Medium" },
          { id: "m-10-c5", name: "Distance between skew lines", done: false, weight: "Medium" },
        ],
      },
      {
        id: "m-11", trackId: "maths", name: "Probability", priority: "High", completion: 0,
        concepts: [
          { id: "m-11-c1", name: "Classical probability & counting", done: false, weight: "Medium" },
          { id: "m-11-c2", name: "Conditional probability & Bayes' theorem", done: false, weight: "Medium" },
          { id: "m-11-c3", name: "Independent events & multiplication theorem", done: false, weight: "Medium" },
          { id: "m-11-c4", name: "Binomial distribution", done: false, weight: "Medium" },
        ],
      },
      {
        id: "m-12", trackId: "maths", name: "Matrices & Determinants", priority: "Medium", completion: 0,
        concepts: [
          { id: "m-12-c1", name: "Matrix operations & types", done: false, weight: "Medium" },
          { id: "m-12-c2", name: "Determinant properties & expansion", done: false, weight: "Medium" },
          { id: "m-12-c3", name: "Adjoint & inverse of a matrix", done: false, weight: "Medium" },
          { id: "m-12-c4", name: "System of equations — Cramer's rule", done: false, weight: "Medium" },
        ],
      },
      {
        id: "m-13", trackId: "maths", name: "Complex Numbers", priority: "Medium", completion: 0,
        concepts: [
          { id: "m-13-c1", name: "Argand plane, modulus & argument", done: false, weight: "Medium" },
          { id: "m-13-c2", name: "Polar form & Euler's formula", done: false, weight: "Medium" },
          { id: "m-13-c3", name: "De Moivre's theorem", done: false, weight: "Medium" },
          { id: "m-13-c4", name: "nth roots of unity", done: false, weight: "Medium" },
          { id: "m-13-c5", name: "Geometry of complex numbers (loci)", done: false, weight: "Medium" },
        ],
      },
    ],
  },
];
