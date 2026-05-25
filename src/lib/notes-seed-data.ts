/**
 * Sample notes from temp-prototype (formula-flash-notes), mapped to production
 * track/chapter IDs in seed.ts. Used as dev fallback when Storage files are missing.
 */
import type { ContentBlock } from "./matrix-types";
import { blocksToDocument } from "./matrix-types";
import type { NotesDocument, NotesManifest } from "./notes";

const kineticsNotes: ContentBlock[] = [
  { type: "heading", text: "Introduction" },
  {
    type: "paragraph",
    text: "Chemical kinetics is the branch of chemistry concerned with the rates of chemical reactions and the factors that influence them — concentration, temperature, catalysts, and the nature of reactants.",
  },
  { type: "heading", text: "Rate of Reaction" },
  {
    type: "paragraph",
    text: "The rate of a reaction is defined as the change in concentration of a reactant or product per unit time. Average rate is measured over an interval, while instantaneous rate is the slope of the concentration-time curve at a point.",
  },
  { type: "formula", label: "Average rate", expr: "rate = -Δ[R]/Δt = +Δ[P]/Δt" },
  { type: "heading", text: "Order and Molecularity" },
  {
    type: "paragraph",
    text: "Order is experimentally determined and refers to the sum of powers of concentration terms in the rate law. Molecularity is the number of reacting species in an elementary step and is always a whole number.",
  },
  { type: "heading", text: "Arrhenius Equation" },
  {
    type: "paragraph",
    text: "The Arrhenius equation describes the temperature dependence of the rate constant. A higher activation energy means the rate is more sensitive to temperature.",
  },
  { type: "formula", label: "Arrhenius", expr: "k = A·e^(-Ea/RT)" },
  { type: "heading", text: "Catalysis" },
  {
    type: "paragraph",
    text: "A catalyst increases the reaction rate by providing an alternative pathway with lower activation energy. It does not alter the equilibrium constant or ΔG of the reaction.",
  },
];

const kineticsFormulas: ContentBlock[] = [
  { type: "heading", text: "Rate Laws" },
  { type: "formula", label: "Zero order", expr: "[R] = [R]₀ - k·t" },
  { type: "formula", label: "First order", expr: "ln([R]₀/[R]) = k·t" },
  { type: "formula", label: "Second order", expr: "1/[R] - 1/[R]₀ = k·t" },
  { type: "heading", text: "Half-Life" },
  { type: "formula", label: "First order t½", expr: "t½ = 0.693 / k" },
  { type: "formula", label: "Zero order t½", expr: "t½ = [R]₀ / (2k)" },
  { type: "heading", text: "Temperature Dependence" },
  { type: "formula", label: "Arrhenius", expr: "k = A·e^(-Ea/RT)" },
  { type: "formula", label: "Two-temperature form", expr: "ln(k₂/k₁) = (Ea/R)·(1/T₁ - 1/T₂)" },
];

const thermoNotes: ContentBlock[] = [
  { type: "heading", text: "First Law of Thermodynamics" },
  {
    type: "paragraph",
    text: "Energy can neither be created nor destroyed. The change in internal energy of a system equals the heat added to the system minus the work done by the system.",
  },
  { type: "formula", label: "First law", expr: "ΔU = q + w" },
  { type: "heading", text: "Enthalpy" },
  {
    type: "paragraph",
    text: "Enthalpy is a state function defined for constant-pressure processes. The enthalpy change of a reaction equals the heat absorbed or released at constant pressure.",
  },
  { type: "formula", label: "Enthalpy", expr: "H = U + PV" },
  { type: "heading", text: "Second Law and Entropy" },
  {
    type: "paragraph",
    text: "The entropy of an isolated system always increases in a spontaneous process. Entropy is a measure of disorder or the number of accessible microstates.",
  },
  { type: "heading", text: "Gibbs Free Energy" },
  {
    type: "paragraph",
    text: "Gibbs free energy combines enthalpy and entropy to predict spontaneity at constant T and P. A negative ΔG indicates a spontaneous process.",
  },
  { type: "formula", label: "Gibbs", expr: "ΔG = ΔH - T·ΔS" },
];

const thermoFormulas: ContentBlock[] = [
  { type: "heading", text: "Core Relations" },
  { type: "formula", label: "First law", expr: "ΔU = q + w" },
  { type: "formula", label: "Work (reversible, isothermal)", expr: "w = -nRT·ln(V₂/V₁)" },
  { type: "formula", label: "Enthalpy", expr: "H = U + PV" },
  { type: "heading", text: "Heat Capacities" },
  { type: "formula", label: "Cp - Cv (ideal gas)", expr: "Cp - Cv = R" },
  { type: "formula", label: "γ (gamma)", expr: "γ = Cp / Cv" },
  { type: "heading", text: "Spontaneity" },
  { type: "formula", label: "Gibbs energy", expr: "ΔG = ΔH - T·ΔS" },
  { type: "formula", label: "Standard Gibbs", expr: "ΔG° = -RT·ln(K)" },
];

const kinematicsFormulas: ContentBlock[] = [
  { type: "heading", text: "Equations of Motion" },
  { type: "formula", label: "Velocity", expr: "v = u + a·t" },
  { type: "formula", label: "Displacement", expr: "s = u·t + ½·a·t²" },
  { type: "formula", label: "v²–u²", expr: "v² = u² + 2·a·s" },
];

const gocNotes: ContentBlock[] = [
  { type: "heading", text: "Inductive Effect" },
  {
    type: "paragraph",
    text: "The inductive effect is the polarization of a sigma bond due to electronegativity differences, transmitted along a chain of atoms with diminishing strength.",
  },
  { type: "heading", text: "Resonance" },
  {
    type: "paragraph",
    text: "Resonance describes delocalization of electrons through a system of conjugated p-orbitals, lowering the energy of the molecule relative to any single Lewis structure.",
  },
];

const periodicNotes: ContentBlock[] = [
  { type: "heading", text: "Periodic Trends" },
  {
    type: "paragraph",
    text: "Atomic radius decreases across a period due to increasing effective nuclear charge, and increases down a group due to addition of new shells.",
  },
  { type: "heading", text: "Ionization Energy" },
  {
    type: "paragraph",
    text: "Ionization energy generally increases across a period and decreases down a group, with notable exceptions at fully and half-filled configurations.",
  },
];

const coordinationFormulas: ContentBlock[] = [
  { type: "heading", text: "Crystal Field" },
  { type: "formula", label: "CFSE (octahedral)", expr: "CFSE = (-0.4·n(t₂g) + 0.6·n(eg))·Δo" },
  { type: "formula", label: "Magnetic moment", expr: "μ = √(n(n+2)) BM" },
];

const calculusNotes: ContentBlock[] = [
  { type: "heading", text: "Limits" },
  {
    type: "paragraph",
    text: "The limit of a function describes the value it approaches as the input approaches a particular point, forming the foundation of calculus.",
  },
  { type: "heading", text: "Derivatives" },
  {
    type: "paragraph",
    text: "The derivative measures the instantaneous rate of change of a function and equals the slope of the tangent line at a point.",
  },
];

const calculusFormulas: ContentBlock[] = [
  { type: "heading", text: "Standard Derivatives" },
  { type: "formula", label: "Power rule", expr: "d/dx (xⁿ) = n·xⁿ⁻¹" },
  { type: "formula", label: "Sine", expr: "d/dx (sin x) = cos x" },
  { type: "formula", label: "Exponential", expr: "d/dx (eˣ) = eˣ" },
  { type: "formula", label: "Logarithm", expr: "d/dx (ln x) = 1/x" },
];

/** subjectId/chapterId → prototype content (also used by upload script) */
export const SEED_BLOCKS: Record<
  string,
  { shortNotes?: ContentBlock[]; formulaSheet?: ContentBlock[] }
> = {
  "physics/phy-5": { shortNotes: thermoNotes, formulaSheet: thermoFormulas },
  "physics/phy-1": { formulaSheet: kinematicsFormulas },
  "pchem/pc-7": { shortNotes: kineticsNotes, formulaSheet: kineticsFormulas },
  "pchem/pc-3": { shortNotes: thermoNotes, formulaSheet: thermoFormulas },
  "ochem/oc-1": { shortNotes: gocNotes },
  "ichem/ic-2": { shortNotes: periodicNotes },
  "ichem/ic-3": { formulaSheet: coordinationFormulas },
  "maths/m-6": { shortNotes: calculusNotes, formulaSheet: calculusFormulas },
};

function chapterKey(subjectId: string, chapterId: string) {
  return `${subjectId}/${chapterId}`;
}

export const SEED_NOTES_MANIFEST: NotesManifest = {
  physics: {
    "phy-1": { hasNotes: false, hasFormulas: true },
    "phy-5": { hasNotes: true, hasFormulas: true },
  },
  pchem: {
    "pc-3": { hasNotes: true, hasFormulas: true },
    "pc-7": { hasNotes: true, hasFormulas: true },
  },
  ochem: {
    "oc-1": { hasNotes: true, hasFormulas: false },
  },
  ichem: {
    "ic-2": { hasNotes: true, hasFormulas: false },
    "ic-3": { hasNotes: false, hasFormulas: true },
  },
  maths: {
    "m-6": { hasNotes: true, hasFormulas: true },
  },
};

export function getSeedShortNotes(
  subjectId: string,
  chapterId: string,
): NotesDocument | null {
  const blocks = SEED_BLOCKS[chapterKey(subjectId, chapterId)]?.shortNotes;
  return blocks?.length ? blocksToDocument(blocks) : null;
}

export function getSeedFormulaSheet(
  subjectId: string,
  chapterId: string,
): NotesDocument | null {
  const blocks = SEED_BLOCKS[chapterKey(subjectId, chapterId)]?.formulaSheet;
  return blocks?.length ? blocksToDocument(blocks) : null;
}

export function getDevSeedManifest(): NotesManifest {
  return SEED_NOTES_MANIFEST;
}
