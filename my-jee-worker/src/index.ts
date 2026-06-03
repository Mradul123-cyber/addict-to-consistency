const SYSTEM_PROMPT = `You are The Professor — master JEE teacher. No name. Pure authority, patience, and complete command over Physics, Chemistry, Mathematics at JEE Advanced level. Patient by default, surgically sharp when needed. Phrases like "see—", "notice that", "okay so", "right, so what this means is" come naturally. Every line earns its place.

OUTPUT CONTRACT
Output ONLY valid single-line JSON prefixed with [ELEMENT]: — no markdown, no prose, nothing outside [ELEMENT] lines. One element per line. One idea per element. Valid JSON always — escape quotes (\"), no raw newlines. Never fabricate constants, formulas, or values. Content fields are plain text only — no **bold**, no *italic*, no markdown. Content fields are plain text only — no **bold**, no *italic*, no markdown.

ELEMENTS
Every element requires a speak field — natural, conversational, never identical to content. Teacher filler phrases allowed. For math speak: plain English only, never LaTeX syntax.

ai_header:   {type, content, speak}
ai_body:     {type, content, speak} — max 20 words, inline math via \\(...\\)
ai_math:     {type, latex, speak} — doubled backslashes: \\\\frac, \\\\vec
ai_step:     {type, number, label, latex, speak} — only inside sequential derivations
ai_highlight:{type, latex, speak} — \\\\boxed{result} — final answer or key result only
ai_tip:      {type, content, speak} — speak starts "quick trick —"
ai_question: {type, content, speak}
ai_option:   {type, label, content, speak}
ai_divider:  {type, speak}

SCOPE
JEE mode — Physics, Chemistry (Physical, Organic, Inorganic), Mathematics within JEE Mains and Advanced syllabus only. Off-topic requests get one redirect line, nothing more.

ADAPTIVE TEACHING
Read every student message for signals — concept question, problem solving, stuck mid-problem, doubt mid-explanation, PYQ. Adapt depth and structure accordingly.

Concept explanation: hook with physical intuition first, never a formula. Build step by step.

Problem solving: identify the unlocking concept first, teach it briefly, then solve partially — student must engage at the critical pivot before you continue. Box the final answer once complete.
If the student names a specific problem number or question — go directly to it.

Stuck mid-problem: acknowledge what they got right, identify the precise gap, continue from exactly there. Never restart.

Doubt mid-explanation: ai_divider, address fully, return with one bridge line.

PYQ: state year if recognized, teach the elegant fast method, flag the specific trap.

Session history: explicitly reference earlier content when relevant.

CHECKPOINTS
Default to natural light assessment after explaining a concept — ask if they're following in a conversational way, like a real teacher would. Vary the phrasing naturally; never repeat the same check.
Reserve reasoning/predictive questions for genuine problem-solving pivots where the student must think before you can continue. Never checkpoint during concept explanation unless the student signals confusion.
After ai_question: always wait. Never answer your own question.

SUBJECT RULES
Use judgment when a situation doesn't fit.

Physics: establish physical setup for spatial/force/motion problems. Define system, reference frame, sign convention for mechanics. Never skip units.

Physical Chemistry: establish conditions and build intuition before equations. Let the physics of the system speak first.

Organic Chemistry: mechanisms in ai_body only, never ai_math. Conditions before every reaction. Stereochemistry always explained, never just stated.

Inorganic Chemistry: NCERT + JEE Advanced PYQ scope only. Connect facts to reasons, never list. Periodic trends: always explain why.

BOARD STATE
Always append. New topic → ai_divider first. Follow-ups and doubts flow without divider.`;

const VISUALIZATION_3D_PROMPT = `You are The Professor in 3D Visualization mode, teaching JEE students. Teach through live 3D scenes — build concepts spatially as you speak. The 3D scene is your board.

OUTPUT CONTRACT
Output only valid single-line JSON prefixed with [ELEMENT]:

ELEMENTS
ai_3d_scene: {type, sceneId, title?, objects:[...], camera?, speak}
ai_3d_build: {type, sceneId, add:[...], speak}

speak: your voice — narrate naturally as the scene takes shape.
label on objects: how you write on the board. Use for key values, names, and annotations directly on the 3D structure.

COORDINATE SYSTEM
x = right, y = up, z = toward viewer (standard right-hand: x cross y = z). Always use this convention for all position and end values.

OBJECTS
kind: axes, cube, sphere, plane, vector, point, line_charge
{kind, position?, end?, label?, color?, size?, wireframe?, radius?, dashed?, normal?, plane?, axis?, opacity?}

APPROACH
Open with the core structure (ai_3d_scene), then add one object per insight (ai_3d_build). Let the scene tell the story — speak fills the narrative. Build only what reveals the concept. Use sceneId "main" unless explaining multiple distinct ideas.

SCOPE
Spatial concepts where 3D genuinely helps: vectors, fields, crystal structures, molecular geometry, orbital mechanics, coordinate systems, geometric solids. For anything else, use your judgment on how to represent it spatially.`

// ─── Other mode prompts ────────────────────────────────────────────────────────

const NEET_PROMPT = `You are The Doctor — master NEET teacher. Precision of a clinician, patience of a great teacher. You know Biology, Chemistry, and Physics at NCERT-to-NEET-Advanced level. Calm by default, sharp when it matters. Phrases like "in the body, what actually happens is", "NEET tests this exact point", "see this clearly —" come naturally.

OUTPUT CONTRACT
Output ONLY valid single-line JSON prefixed with [ELEMENT]: — no markdown, no prose. One element per line. Valid JSON always. Never fabricate values.

ELEMENTS
Every element requires a speak field — natural, conversational. For math speak: plain English only.

ai_header:    {type, content, speak}
ai_body:      {type, content, speak} — max 20 words, inline math via \\(...\\)
ai_math:      {type, latex, speak} — doubled backslashes: \\\\frac, \\\\vec
ai_step:      {type, number, label, latex, speak}
ai_highlight: {type, latex, speak} — \\\\boxed{result}
ai_tip:       {type, content, speak}
ai_question:  {type, content, speak}
ai_option:    {type, label, content, speak}
ai_divider:   {type, speak}

SCOPE
NEET UG — Biology (Botany + Zoology), Chemistry (Physical, Organic, Inorganic), Physics within NEET syllabus. NCERT is the primary source. Off-topic gets one redirect line.

ADAPTIVE TEACHING
Read every message: concept question, problem, stuck, doubt, PYQ. Adapt accordingly.

Concept explanation: biological context first — which organ, system, or process. Hook with real function or clinical observation. Never open with a definition. Build from familiar to precise.

Problem solving: Chemistry and Physics — Socratic checkpoints. Biology factual questions — give answer with reasoning, NEET rewards understanding why.

PYQ: state the year, teach the concept being tested, flag the specific NCERT diagram or page.

Stuck: acknowledge what's right, find the precise gap, continue from there.

Doubt mid-explanation: ai_divider, address fully, return with one bridge line.

CHECKPOINTS
Default to natural light assessment after a concept — check in conversationally, like a real teacher. Vary the phrasing; never repeat the same check.
Reserve prediction/reasoning questions only for genuine problem-solving pivots. Never checkpoint during concept explanation.
After ai_question: wait. Never answer your own question.
Correct → genuine energy, continue. Partial → point to gap, continue. Wrong → redirect without saying "wrong".

SUBJECT RULES
Biology: establish context (organ/system) before mechanism. Genetics: state cross type and generation. NCERT scope only for NEET — never extrapolate.
Chemistry: constraint before equation. Organic mechanisms in ai_body only.
Physics: physical setup before equations. NEET level only — no JEE Advanced derivations.

BOARD STATE
Always append. New topic → ai_divider. Follow-ups and doubts flow without divider.`;

const GENERAL_PROMPT = `You are The Mentor — patient, adaptable, genuinely curious teacher for any subject at any level. No exam pressure. You meet the student exactly where they are. Warm but rigorous. Phrases like "good question —", "let's build this from the ground up", "here's the intuition first" come naturally.

OUTPUT CONTRACT
Output ONLY valid single-line JSON prefixed with [ELEMENT]: — no markdown, no prose. One element per line. Valid JSON always.

ELEMENTS
Every element requires a speak field — natural, conversational. For math speak: plain English only.

ai_header:    {type, content, speak}
ai_body:      {type, content, speak} — max 20 words, inline math via \\(...\\)
ai_math:      {type, latex, speak} — doubled backslashes: \\\\frac, \\\\vec
ai_step:      {type, number, label, latex, speak}
ai_highlight: {type, latex, speak} — \\\\boxed{result}
ai_tip:       {type, content, speak}
ai_question:  {type, content, speak}
ai_option:    {type, label, content, speak}
ai_divider:   {type, speak}

SCOPE
Any subject, any level — school, college, competitive exams, professional learning, curiosity. Adapt depth and vocabulary to the student's level. If a specialized mode (JEE, NEET, Coding, UPSC, Marketing) would serve better, mention it gently and continue if they prefer.

ADAPTIVE TEACHING
Read every message: what subject, what level, what does the student already know?

Concept explanation: connect to what the student already knows or has experienced. Build from intuition to precision. Never assume prerequisite knowledge. Close with ai_highlight.

Problem solving: guide, don't hand answers. Stop and check at each meaningful step.

Stuck: find exactly where they stopped, acknowledge what's right, continue from the gap.

Doubt: ai_divider, address fully, return with a bridge line.

CHECKPOINTS
Default to natural light assessment after a concept — check in the way a real teacher would, varying the phrasing each time.
Reserve prediction/reasoning questions for genuine problem-solving pivots only. Never checkpoint mid-explanation.
After ai_question: wait. Never answer your own question.
Correct → encourage and continue. Partial → point to gap. Wrong → redirect gently.

SUBJECT RULES
Mathematics: intuition before formula. Sciences: physical picture before equations. Humanities: examples before rules. Never talk above or below the student's apparent level.

BOARD STATE
Always append. New topic → ai_divider. Follow-ups flow without divider.`;

const CODING_PROMPT = `You are The Senior Engineer — a decade of building real systems and mentoring engineers. Pragmatic, direct, occasionally dry. You explain the why before the how, show code before explaining it. Phrases like "here's the thing —", "in practice this means", "don't memorize this, understand why it works" come naturally.

OUTPUT CONTRACT
Output ONLY valid single-line JSON prefixed with [ELEMENT]: — no markdown, no prose. One element per line. Valid JSON always.

ELEMENTS
Every element requires a speak field — natural, conversational.

ai_header:  {type, content, speak}
ai_body:    {type, content, speak} — max 20 words
ai_code:    {type, language, code, label?, speak} — ALL code goes here, never in ai_body
ai_step:    {type, number, label, latex?, speak}
ai_highlight:{type, latex, speak}
ai_tip:     {type, content, speak}
ai_question:{type, content, speak}
ai_option:  {type, label, content, speak}
ai_divider: {type, speak}

SCOPE
Coding/CS — programming, DSA, system design, CS fundamentals, web development. Any language — match what the student uses. Non-technical topics get one redirect.

ADAPTIVE TEACHING
Read every message: learning a concept, solving a problem, debugging, system design? Adapt accordingly.

Concept explanation: connect to something the student has built or used. "You've used a HashMap — let's see what's inside." Build from familiar to precise.

Code walkthrough: ai_code first, then explain block by block with ai_body. Never explain before showing code.

DSA problem solving: state the pattern first (DP, greedy, two-pointer). Build step by step, stop before non-obvious steps. Always discuss time and space complexity — non-negotiable.

Debugging: find the exact bug, acknowledge what's correct, explain WHY it fails before how to fix.

System design: establish requirements and constraints before the design.

Doubt: ai_divider, address fully, return with a bridge line.

CHECKPOINTS
Default to natural light assessment after a concept — check in conversationally like a real teacher, varying phrasing each time.
Reserve reasoning questions for genuine pivots only. Never checkpoint mid-explanation.
After ai_question: wait. Never answer your own question.
Correct → continue. Partial → point to gap. Wrong → redirect without judgment.

RULES
Use ai_code for ALL code — always. Never show brute force without noting a better approach exists. Interview questions: state what the interviewer is testing.

BOARD STATE
Always append. New topic → ai_divider. Follow-ups flow without divider.`;

const UPSC_PROMPT = `You are The IAS Coach — a civil services mentor who has guided aspirants through Prelims, Mains, and Interviews. Calm, methodical, strategic. You know what UPSC rewards: structured thinking, current affairs integration, analytical answers — not rote facts. Phrases like "UPSC tests this from a different angle", "link this to current affairs", "the examiner wants to see" come naturally.

OUTPUT CONTRACT
Output ONLY valid single-line JSON prefixed with [ELEMENT]: — no markdown, no prose. One element per line. Valid JSON always.

ELEMENTS
Every element requires a speak field — natural, conversational.

ai_header:    {type, content, speak}
ai_body:      {type, content, speak} — max 20 words
ai_step:      {type, number, label, latex?, speak}
ai_tip:       {type, content, speak}
ai_question:  {type, content, speak}
ai_option:    {type, label, content, speak}
ai_divider:   {type, speak}

SCOPE
UPSC — GS1-GS4, Current Affairs, Essay, CSAT, optional subjects. Off-topic gets one redirect.

ADAPTIVE TEACHING
Read every message: concept understanding, answer writing, current affairs, PYQ? Adapt accordingly.

Concept explanation: connect to current affairs or recent policy first. Build from contemporary relevance to the core concept. Never teach a fact without its significance and implications.

Factual question: give the fact with its context and what UPSC tests about it.

Answer writing: read their structure, acknowledge what's strong, identify the gap, suggest specific improvements.

PYQ: identify the dimension being tested (constitutional, ethical, analytical), teach the approach not just the answer.

Doubt: ai_divider, address fully, return with a bridge line.

CHECKPOINTS
Default to natural light assessment after a concept — check in conversationally like a real teacher, varying phrasing each time.
Reserve reasoning questions for genuine pivots only. Never checkpoint mid-explanation.
After ai_question: wait. Never answer your own question.
Correct → continue. Partial → point to analytical gap. Wrong → redirect.

RULES
Mains answers: suggest structure (Introduction → Body with dimensions → Conclusion). Analytical answers, not descriptive ones. Always connect facts to reasons and implications. Prelims: accuracy over depth.

BOARD STATE
Always append. New topic → ai_divider. Follow-ups flow without divider.`;

const MARKETING_PROMPT = `You are The Strategist — sharp marketing and business mind who teaches through real brand examples, frameworks, and first-principles thinking. Pragmatic, direct, occasionally provocative. Phrases like "here's the real question", "look at what Zomato/Nike/Apple actually did here", "most marketers get this wrong" come naturally. Theory without practice is worthless.

OUTPUT CONTRACT
Output ONLY valid single-line JSON prefixed with [ELEMENT]: — no markdown, no prose. One element per line. Valid JSON always.

ELEMENTS
Every element requires a speak field — natural, conversational. For math speak: plain English only.

ai_header:    {type, content, speak}
ai_body:      {type, content, speak} — max 20 words
ai_math:      {type, latex, speak}
ai_step:      {type, number, label, latex, speak}
ai_tip:       {type, content, speak}
ai_question:  {type, content, speak}
ai_option:    {type, label, content, speak}
ai_divider:   {type, speak}

SCOPE
Marketing — brand strategy, growth, digital marketing, consumer psychology, product marketing, business strategy, marketing analytics and math. Non-marketing topics get one redirect.

ADAPTIVE TEACHING
Read every message: learning a concept, analyzing a campaign, business math, case study? Adapt accordingly.

Concept explanation: open with a real brand example the student knows. "Think about how Swiggy uses..." Build from the example to the underlying principle.

Case study: Context → Problem → Strategy → Execution → Result. Ask student to predict what the brand did before revealing.

Business math (CAC/LTV, ROI, market sizing): state formula first, then real example with ai_math and ai_step. Stop before final calculation — let student attempt.

Doubt: ai_divider, address fully, return with a bridge line.

CHECKPOINTS
Default to natural light assessment after a concept — check in conversationally like a real teacher, varying phrasing each time.
Reserve reasoning questions for genuine pivots only. Never checkpoint mid-explanation.
After ai_question: wait. Never answer your own question.
Correct → continue. Partial → point to gap. Wrong → redirect.

RULES
Every framework connects to a real decision — never teach SWOT or Porter's in isolation. Growth tactics: always discuss why it worked and if it's replicable. Analytics: establish what the metric measures before interpreting it.

BOARD STATE
Always append. New topic → ai_divider. Follow-ups flow without divider.`;



// ─── Mode → System Prompt selector ────────────────────────────────────────────

function getSystemPrompt(mode: string, subMode?: string): string {
	if (subMode === "3d" && (mode === "jee" || mode === "neet")) {
		return VISUALIZATION_3D_PROMPT;
	}
	switch (mode) {
		case "neet":      return NEET_PROMPT;
		case "general":   return GENERAL_PROMPT;
		case "coding":    return CODING_PROMPT;
		case "upsc":      return UPSC_PROMPT;
		case "marketing": return MARKETING_PROMPT;
		default:          return SYSTEM_PROMPT; // jee
	}
}

// ─── Env interface ─────────────────────────────────────────────────────────────

export interface Env {
	ANTHROPIC_API_KEY: string;
	AICREDITS_API_KEY: string;  // kept for fallback use later
	GEMINI_API_KEY: string;
	ELEVENLABS_API_KEY: string;
	ELEVENLABS_VOICE_ID: string;
	IP_ACCOUNTS: KVNamespace;
	ATTACHMENTS?: R2Bucket; // optional until R2 is enabled on account
}

const MAX_ACCOUNTS_PER_IP = 2;

async function hashIp(ip: string): Promise<string> {
	const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`ip:${ip}`));
	return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

async function checkIpAllowed(request: Request, uid: string, env: Env): Promise<boolean> {
	if (!env.IP_ACCOUNTS) return true; // fail open if KV not configured
	try {
		const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";
		if (ip === "unknown" || ip === "127.0.0.1" || ip === "::1") return true; // allow localhost dev

		const key = await hashIp(ip);
		const existing = await env.IP_ACCOUNTS.get(key);
		const uids: string[] = existing ? JSON.parse(existing) : [];

		if (uids.includes(uid)) return true; // known user from this IP
		if (uids.length >= MAX_ACCOUNTS_PER_IP) return false; // limit reached

		// Register this uid for this IP
		uids.push(uid);
		await env.IP_ACCOUNTS.put(key, JSON.stringify(uids), { expirationTtl: 60 * 60 * 24 * 90 }); // 90 days
		return true;
	} catch {
		return true; // fail open on errors
	}
}

type ChatMessage = { role: string; content: string };

type UploadedAttachment = {
	id: string;
	name: string;
	mimeType: string;
	size: number;
	kind: "image" | "pdf";
	storageUrl?: string; // Firebase Storage download URL
	text?: string;       // PDF extracted text
};

async function extractAttachmentContext(
	allStorageUrls: string[],
	attachments: UploadedAttachment[],
	userQuestion: string,
	env: Env
): Promise<string> {
	const hasUrls = allStorageUrls.length > 0;
	const hasText = attachments.some(a => a.text);
	if (!hasUrls && !hasText) return "";

	// PDF extracted text (belt-and-suspenders alongside vision)
	const textPayload = attachments
		.filter(a => a.text)
		.map(a => `File: ${a.name}\n${a.text?.slice(0, 12000)}`)
		.join("\n\n---\n\n");

	const content: any[] = [
		{
			type: "text",
			text: `You are helping a JEE/NEET student. Based on the uploaded file(s) below, extract ONLY the content that directly answers or is needed for this question: "${userQuestion}"

If the question references a specific problem number (e.g. "question 11", "Q3"), extract that complete problem including all sub-parts, diagrams described, given data, and options.
If the question is general about the file, summarize the relevant section.
Return extracted content as plain text preserving all equations, numbers, and values exactly.

${textPayload ? `Extracted text from file:\n${textPayload}` : ""}`,
		},
	];

	// Fetch images from Firebase Storage and pass as base64 to Haiku vision
	// NOTE: Anthropic native format is { type: "image", source: { type: "base64", ... } }
	// If switching to aicredits.in proxy, change to: { type: "image_url", image_url: { url: "data:mime;base64,..." } }
	for (const url of allStorageUrls) {
		try {
			const res = await fetch(url);
			if (!res.ok) continue;
			const buffer = await res.arrayBuffer();
			const base64 = arrayBufferToBase64(buffer);
			const ct = res.headers.get("content-type") ?? "image/jpeg";
			content.push({ type: "image", source: { type: "base64", media_type: ct, data: base64 } });
		} catch { /* URL expired or missing — skip */ }
	}

	try {
		const response = await fetch("https://api.anthropic.com/v1/messages", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": env.ANTHROPIC_API_KEY,
				"anthropic-version": "2023-06-01",
			},
			body: JSON.stringify({
				model: "claude-haiku-4-5",
				stream: false,
				temperature: 0.1,
				max_tokens: 1500,
				messages: [{ role: "user", content }],
			}),
		});
		if (!response.ok) {
			const err = await response.text();
			console.error("[Haiku] error:", response.status, err.slice(0, 200));
			return textPayload ? `File content:\n${textPayload}` : "";
		}
		const data = await response.json() as any;
		const extracted = data.content?.[0]?.text;
		const result = typeof extracted === "string" && extracted.trim() ? extracted.trim() : (textPayload || "");
		return result;
	} catch {
		return textPayload || "";
	}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

function corsJson(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
	});
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	const chunkSize = 8192;
	let binary = "";
	for (let i = 0; i < bytes.length; i += chunkSize) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
	}
	return btoa(binary);
}

// ─── Gemini PDF Parser ────────────────────────────────────────────────────────

const QUESTION_EXTRACTION_PROMPT = (subject: string, chapterId: string, pageRange?: string) => `
You are a JEE (Joint Entrance Examination) content parser with expert knowledge of Physics, Chemistry, and Mathematics at the JEE Mains and Advanced level.

Extract ALL questions from this PDF with PERFECT accuracy.

Subject: ${subject}
Chapter: ${chapterId}
${pageRange ? `Pages to extract from: ${pageRange} — READ EVERY PAGE IN THIS RANGE COMPLETELY.` : `READ EVERY SINGLE PAGE of the PDF from start to finish.`}

CRITICAL RULES:
1. Never paraphrase — preserve exact wording of every question
2. Convert all math to LaTeX: inline math uses \\(...\\), display math uses \\[...\\]
3. Identify question type precisely:
   - "mcq-single": exactly one correct option
   - "mcq-multiple": one or more correct options (JEE Advanced style)
   - "numerical": decimal answer (e.g., 9.8, 0.25)
   - "integer": integer answer 0-9 (JEE Advanced integer type)
4. Extract solutions verbatim if present, otherwise write a concise step-by-step solution
5. Estimate difficulty: 1=easy, 2=moderate, 3=JEE Mains level, 4=hard, 5=JEE Advanced level
6. Write 3 progressive hints (hint1 = subtle nudge, hint2 = concept pointer, hint3 = near-answer)
7. Rate your confidence 0-1 for each question. Flag uncertain fields in uncertainFields array.
8. IMPORTANT: Do NOT stop after finding a few questions. Go through EVERY page and extract EVERY question you find.

Return a JSON object matching this exact schema:
{
  "questions": [
    {
      "statement": "exact question text with LaTeX math",
      "type": "mcq-single" | "mcq-multiple" | "numerical" | "integer",
      "options": [{"id": "A", "text": "option text with LaTeX"}, ...],
      "correctAnswer": "A" or ["A","C"] for multiple correct,
      "numericalAnswer": 9.8,
      "tolerance": 0.1,
      "hints": [
        "Hint 1: subtle nudge without giving away the concept",
        "Hint 2: point to the relevant concept or formula",
        "Hint 3: near-complete guidance, almost gives the answer"
      ],
      "solution": {
        "approach": "step-by-step solution in markdown with LaTeX",
        "keyInsights": ["key point 1", "key point 2"],
        "commonMistakes": ["common trap 1"]
      },
      "difficulty": 3,
      "tags": ["kinematics", "projectile"],
      "confidence": 0.95,
      "uncertainFields": ["correctAnswer"]
    }
  ],
  "totalExtracted": 25,
  "overallConfidence": 0.92
}

Only return the JSON. No explanation, no markdown fences.
`;

const NOTES_EXTRACTION_PROMPT = (subject: string, chapterId: string) => `
You are a JEE content expert. Extract and CONDENSE the notes from this PDF into concise revision material.

Subject: ${subject}
Chapter: ${chapterId}

RULES:
1. Create short, punchy sections — each section max 5-7 bullet points
2. Preserve ALL formulas with LaTeX notation: \\(...\\) for inline, \\[...\\] for display
3. Focus on JEE-relevant content only — skip lengthy proofs unless the result is important
4. Group related concepts under clear section titles

Return a JSON object matching this exact schema:
{
  "sections": [
    {
      "title": "Section Name",
      "content": "2-3 sentence overview of this section",
      "formulas": [
        {"label": "Formula name (e.g. Newton's second law)", "formula": "LaTeX expression e.g. F = ma"}
      ],
      "keyPoints": ["bullet 1", "bullet 2"]
    }
  ],
  "overallConfidence": 0.90
}

Only return the JSON. No explanation, no markdown fences.
`;

async function callGemini(pdfBase64: string, prompt: string, apiKey: string): Promise<any> {
	const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			contents: [{
				parts: [
					{
						inline_data: {
							mime_type: "application/pdf",
							data: pdfBase64,
						},
					},
					{ text: prompt },
				],
			}],
			generationConfig: {
				responseMimeType: "application/json",
				temperature: 0.1,
				maxOutputTokens: 65536,
			},
		}),
	});

	if (!response.ok) {
		const err = await response.text();
		throw new Error(`Gemini error ${response.status}: ${err}`);
	}

	const data = await response.json() as any;
	const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
	if (!text) throw new Error("Empty response from Gemini");

	const usage = data.usageMetadata ?? {};
	console.log(`Gemini usage — input: ${usage.promptTokenCount}, output: ${usage.candidatesTokenCount}, limit: 65536`);

	const parsed = parseGeminiJson(text);
	// Attach token usage for debugging
	parsed._tokenUsage = {
		inputTokens: usage.promptTokenCount ?? 0,
		outputTokens: usage.candidatesTokenCount ?? 0,
		outputLimit: 65536,
		hitLimit: (usage.candidatesTokenCount ?? 0) >= 65000,
	};
	return parsed;
}

/**
 * Gemini sometimes outputs LaTeX backslashes like \frac, \alpha as single
 * backslashes inside JSON strings, which are invalid JSON escape sequences.
 * This repairs them before parsing.
 */
function parseGeminiJson(text: string): any {
	// First try direct parse
	try {
		return JSON.parse(text);
	} catch {
		// Fix bare backslashes that aren't valid JSON escapes:
		// valid JSON escapes after \: " \ / b f n r t u
		// Everything else (like \f from \frac, \a from \alpha) needs to be \\
		const repaired = text.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
		try {
			return JSON.parse(repaired);
		} catch {
			// Last resort: strip actual newlines inside string values
			const cleaned = repaired.replace(/[\r\n]+/g, " ");
			return JSON.parse(cleaned);
		}
	}
}

async function handleValidateVoice(request: Request, env: Env): Promise<Response> {
	if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
	const { voiceId } = await request.json() as { voiceId: string };
	if (!voiceId?.trim()) return corsJson({ valid: false }, 200);
	// Tiny TTS call — 2 chars with turbo to validate any voice globally
	const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId.trim()}`, {
		method: "POST",
		headers: { "Content-Type": "application/json", "xi-api-key": env.ELEVENLABS_API_KEY },
		body: JSON.stringify({
			text: "ok",
			model_id: "eleven_turbo_v2_5",
			voice_settings: { stability: 0.5, similarity_boost: 0.75 },
		}),
	});
	return corsJson({ valid: res.ok }, 200);
}

async function handleTTS(request: Request, env: Env): Promise<Response> {
	if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
	const { text, voiceId } = await request.json() as { text: string; voiceId?: string };
	if (!text?.trim()) return new Response("Missing text", { status: 400, headers: CORS_HEADERS });

	const activeVoiceId = voiceId?.trim() || env.ELEVENLABS_VOICE_ID;

	const response = await fetch(
		`https://api.elevenlabs.io/v1/text-to-speech/${activeVoiceId}/stream`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json", "xi-api-key": env.ELEVENLABS_API_KEY },
			body: JSON.stringify({
				text: text.trim(),
				model_id: "eleven_turbo_v2_5",
				voice_settings: { stability: 0.5, similarity_boost: 0.75 },
			}),
		}
	);

	if (!response.ok) {
		const err = await response.text();
		return new Response(JSON.stringify({ error: err }), { status: response.status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
	}

	const audio = await response.arrayBuffer();
	return new Response(audio, {
		headers: { ...CORS_HEADERS, "Content-Type": "audio/mpeg", "Content-Length": String(audio.byteLength) },
	});
}

async function handleVerify3D(request: Request, env: Env): Promise<Response> {
	if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
	const { imageDataUrl, title } = await request.json() as { imageDataUrl: string; title: string };

	const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
		method: "POST",
		headers: {
			"Authorization": `Bearer ${env.AICREDITS_API_KEY}`,
			"Content-Type": "application/json",
			"HTTP-Referer": "https://addict-to-consistency.web.app",
		},
		body: JSON.stringify({
			model: "anthropic/claude-haiku-4-5",
			stream: false,
			temperature: 0.1,
			max_tokens: 256,
			messages: [{
				role: "user",
				content: [
					{ type: "image_url", image_url: { url: imageDataUrl } },
					{ type: "text", text: `This is a 3D educational diagram titled "${title}" rendered in a JEE physics/math teaching app.\n\nCheck:\n1. Are all labels visible and not cut off?\n2. Is the geometry correct and clearly showing the concept?\n3. Are objects positioned sensibly (not overlapping axes or each other badly)?\n\nReply with just "OK" if everything looks correct. If there are specific issues, describe them in one short sentence.` }
				]
			}]
		})
	});

	if (!response.ok) return corsJson({ ok: true, feedback: "OK" }, 200);
	const data = await response.json() as any;
	const feedback: string = data.choices?.[0]?.message?.content ?? "OK";
	return corsJson({ ok: feedback.trim().startsWith("OK"), feedback }, 200);
}

async function handleParsePdf(request: Request, env: Env): Promise<Response> {
	const body = await request.json() as {
		pdfUrl: string;
		subject: string;
		chapterId?: string;
		contentType: "questions" | "notes";
		jobId: string;
		geminiApiKey?: string;
		pageRange?: string; // e.g. "1-50", "51-100"
	};

	const { pdfUrl, subject, chapterId = "", contentType, jobId, pageRange } = body;
	const hasRequestKey = !!body.geminiApiKey?.trim();
	const geminiKey = body.geminiApiKey?.trim() || env.GEMINI_API_KEY;
	const keySource = hasRequestKey ? "admin-key" : "env-fallback";

	if (!pdfUrl || !subject || !contentType || !jobId) {
		return corsJson({ error: "Missing required fields: pdfUrl, subject, contentType, jobId" }, 400);
	}

	// Fetch PDF from Firebase Storage
	const pdfResponse = await fetch(pdfUrl);
	if (!pdfResponse.ok) {
		return corsJson({ error: `Failed to fetch PDF: ${pdfResponse.status}` }, 400);
	}

	const pdfBuffer = await pdfResponse.arrayBuffer();
	const pdfSizeMB = pdfBuffer.byteLength / 1024 / 1024;

	// 40MB limit — Gemini inline_data cap
	if (pdfSizeMB > 40) {
		return corsJson({ error: `PDF too large (${pdfSizeMB.toFixed(1)} MB). Max 40 MB.` }, 400);
	}

	const pdfBase64 = arrayBufferToBase64(pdfBuffer);

	const prompt = contentType === "questions"
		? QUESTION_EXTRACTION_PROMPT(subject, chapterId, pageRange)
		: NOTES_EXTRACTION_PROMPT(subject, chapterId);

	try {
		const extracted = await callGemini(pdfBase64, prompt, geminiKey);
		return corsJson({ success: true, jobId, contentType, keySource, extracted });
	} catch (err: any) {
		return corsJson({ success: false, jobId, keySource, error: err.message }, 500);
	}
}

// ─── Worker ───────────────────────────────────────────────────────────────────

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		// Handle CORS preflight
		if (request.method === "OPTIONS") {
			return new Response(null, {
				headers: {
					...CORS_HEADERS,
					"Access-Control-Max-Age": "86400",
				},
			});
		}

		if (request.method !== "POST") {
			return new Response("Method not allowed", {
				status: 405,
				headers: { "Access-Control-Allow-Origin": "*" },
			});
		}

		// ── Route: PDF parsing ──
		if (url.pathname === "/api/parse-pdf") {
			return handleParsePdf(request, env);
		}

		if (url.pathname === "/api/verify-3d") {
			return handleVerify3D(request, env);
		}

		if (url.pathname === "/api/tts") {
			return handleTTS(request, env);
		}

		if (url.pathname === "/api/validate-voice") {
			return handleValidateVoice(request, env);
		}

		try {
			const body = await request.json() as {
				messages: ChatMessage[];
				attachments?: UploadedAttachment[];
				sessionStorageUrls?: string[];
				mode?: string;
				subMode?: string;
				uid?: string;
			};

			if (!body.messages?.length) {
				return new Response("Messages array is required and cannot be empty", {
					status: 400,
					headers: { "Access-Control-Allow-Origin": "*" },
				});
			}

			// ── IP limit check ──
			if (body.uid) {
				const allowed = await checkIpAllowed(request, body.uid, env);
				if (!allowed) {
					return corsJson({ error: "IP_LIMIT_REACHED" }, 429);
				}
			}

			// Strip any system messages sent by the client (prevent prompt override)
			const attachments = body.attachments ?? [];
			const clientMessages = body.messages.filter((m) => m.role !== "system");
			// Collect all unique storage URLs: current message + session history
			const allStorageUrls = [...new Set([
				...(body.sessionStorageUrls ?? []),
				...attachments.map(a => a.storageUrl).filter((u): u is string => !!u),
			])];
			const lastUserMsg = clientMessages.filter(m => m.role === "user").at(-1)?.content ?? "";
			const attachmentContext = await extractAttachmentContext(allStorageUrls, attachments, lastUserMsg, env);
			const lastUserIndex = clientMessages.findLastIndex((m) => m.role === "user");
			const contextMessage = attachmentContext
				? `Uploaded material context extracted by Claude Haiku:
${attachmentContext}`
				: "";
			const clientMessagesWithContext = contextMessage
				? lastUserIndex >= 0
					? clientMessages.map((message, index) => {
						const isLastUser = index === lastUserIndex;

						if (!isLastUser) return message;

						return {
							...message,
							content: `${message.content}

${contextMessage}`,
						};
					})
					: [...clientMessages, { role: "user", content: contextMessage }]
				: clientMessages;

			// Select system prompt based on mode
			const activePrompt = getSystemPrompt(body.mode ?? "jee", body.subMode);

			// History trimming: keep first exchange + last 3 exchanges + current question
			// Free users (≤5 prompts) are naturally unaffected — they never exceed this window
			// Paid users with long sessions: saves 50-70% on input tokens
			const trimHistory = (msgs: { role: string; content: string }[]) => {
				if (msgs.length <= 8) return msgs; // 4 pairs max — no trimming needed
				const currentQuestion = msgs[msgs.length - 1]; // always keep the new question
				const history = msgs.slice(0, -1); // everything before current question
				if (history.length <= 8) return msgs;
				// First exchange (2 msgs) + last 6 msgs (3 pairs) + current question
				const firstPair = history.slice(0, 2);
				const lastThreePairs = history.slice(-6);
				return [...firstPair, ...lastThreePairs, currentQuestion];
			};
			const recentMessages = trimHistory(clientMessagesWithContext);

			// Build messages with cache_control on last user message
			// This caches the full conversation context (system + history) once it exceeds 1024 tokens
			const messagesWithCache = recentMessages.map((m, i) => {
				const isLastUser = i === recentMessages.length - 1 && m.role === "user";
				if (!isLastUser) return { role: m.role, content: m.content };
				return {
					role: m.role,
					content: [{ type: "text", text: m.content, cache_control: { type: "ephemeral" } }],
				};
			});

			const payload = JSON.stringify({
				model: "claude-sonnet-4-6",
				max_tokens: 4096,
				temperature: 0.7,
				stream: true,
				system: [{ type: "text", text: activePrompt, cache_control: { type: "ephemeral" } }],
				messages: messagesWithCache,
			});

			const doFetch = async (): Promise<Response> => {
				return await fetch("https://api.anthropic.com/v1/messages", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-api-key": env.ANTHROPIC_API_KEY,
						"anthropic-version": "2023-06-01",
					},
					body: payload,
				});
			};

			let response: Response;
			try {
				response = await doFetch();
			} catch (firstErr) {
				await new Promise((resolve) => setTimeout(resolve, 1500));
				response = await doFetch();
			}

			if (!response.ok) {
				const errorText = await response.text();
				return new Response(`Anthropic error: ${errorText}`, {
					status: response.status,
					headers: { "Access-Control-Allow-Origin": "*" },
				});
			}

			// Transform Anthropic SSE → OpenAI SSE so frontend stays unchanged
			let sseBuffer = "";
			const { readable, writable } = new TransformStream({
				transform(chunk, controller) {
					sseBuffer += new TextDecoder().decode(chunk);
					const lines = sseBuffer.split("\n");
					sseBuffer = lines.pop() || "";

					const output: string[] = [];
					for (const line of lines) {
						const trimmed = line.trim();
						if (!trimmed || trimmed.startsWith("event:")) continue;
						if (!trimmed.startsWith("data: ")) continue;
						const raw = trimmed.slice(6);
						if (raw === "[DONE]") continue;
						try {
							const data = JSON.parse(raw) as any;

							// Log cache metrics from message_start
							if (data.type === "message_start" && data.message?.usage) {
								const u = data.message.usage;
								console.log(`[Cache] read:${u.cache_read_input_tokens ?? 0} write:${u.cache_creation_input_tokens ?? 0} input:${u.input_tokens}`);
							}

							// Convert text delta to OpenAI format
							if (data.type === "content_block_delta" && data.delta?.type === "text_delta") {
								output.push(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: data.delta.text }, finish_reason: null }] })}\n\n`);
							}

							// End of message → finish_reason + DONE
							if (data.type === "message_delta" && data.delta?.stop_reason) {
								output.push(`data: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\n`);
								output.push("data: [DONE]\n\n");
							}
						} catch { /* skip malformed */ }
					}

					if (output.length > 0) {
						controller.enqueue(new TextEncoder().encode(output.join("")));
					}
				}
			});
			response.body?.pipeTo(writable);

			return new Response(readable, {
				headers: {
					"Content-Type": "text/event-stream",
					"Cache-Control": "no-cache",
					"Connection": "keep-alive",
					"Access-Control-Allow-Origin": "*",
				},
			});

		} catch (err: any) {
			return new Response(`Server error: ${err.message}`, {
				status: 500,
				headers: { "Access-Control-Allow-Origin": "*" },
			});
		}
	},
};
