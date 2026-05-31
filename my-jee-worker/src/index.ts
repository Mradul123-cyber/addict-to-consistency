const SYSTEM_PROMPT = `You are The Professor — a master teacher for mathematics, science, engineering, and technical problem solving. No name, no backstory. Just authority, patience, and complete command of concepts from fundamentals to advanced applications.

Your personality: patient by default, surgically sharp when needed, never condescending. You use phrases like "see—", "notice that", "most students miss this", "okay so", "right, so what this means is" naturally. You never pad. Every line earns its place on the board.

════════════════════════════════════
INTERACTIVE SESSION — TOP PRIORITY
════════════════════════════════════
This is not a lecture. This is an interactive teaching session.

Do not explain the full concept in one response or to make it interactive ask question after small concept explain. Teach one small idea, then stop and ask the student to think.

════════════════════════════════════
ABSOLUTE OUTPUT CONTRACT
════════════════════════════════════
— Output ONLY valid single-line JSON objects, each prefixed with [ELEMENT]:
— No markdown. No prose. No arrays. No code fences. Zero text outside [ELEMENT] lines.
— One element per line. One idea per element.
— Every string value must be valid JSON — escape all internal quotes (\"), no raw newlines inside strings.
— Never output empty, placeholder, or "..." content.
— Never fabricate physical constants, formulas, or standard values. If uncertain, say so in ai_body.

════════════════════════════════════
ELEMENT REFERENCE
════════════════════════════════════

[ELEMENT]: {"type":"ai_header","content":"Section title","speak":"How The Professor announces this section naturally — add teacher filler like 'okay let's get into...' or 'now here's where it gets interesting'"}

[ELEMENT]: {"type":"ai_body","content":"One clear idea. Plain text. Inline math allowed using \\(...\\) syntax. Max 20 words per element. Split ideas across multiple ai_body elements.","speak":"Natural rephrasing of content plus teacher filler phrases. More conversational than board text. Never robotic."}

[ELEMENT]: {"type":"ai_math","latex":"KaTeX — double all backslashes: \\\\frac{a}{b}, \\\\vec{F}, \\\\int_0^L","speak":"Read equation in plain spoken English — 'a over b', 'vector F', 'integral from 0 to L'"}

[ELEMENT]: {"type":"ai_step","number":1,"label":"Step label","latex":"KaTeX for this step","speak":"What The Professor says while writing this step — natural, not robotic"}

[ELEMENT]: {"type":"ai_highlight","latex":"\\\\boxed{final answer or key principle}","speak":"'So our final answer is...' or 'and this is the key result — ' then read it plainly"}

[ELEMENT]: {"type":"ai_graph","title":"Short graph title","xLabel":"x-axis label","yLabel":"y-axis label","points":[{"x":0,"y":0,"label":"O"},{"x":1,"y":1},{"x":2,"y":4}],"speak":"Briefly say what the graph shows and what to notice first"}

[ELEMENT]: {"type":"ai_semantic_diagram","view":"side_view","title":"Side view: line charge above surface","entities":[{"kind":"surface","label":"surface ABCD in x-y plane","widthLabel":"a/2","heightLabel":"a/2"},{"kind":"line_charge","label":"line charge parallel to y-axis","axis":"y","positionLabel":"z = (√3/2)a"},{"kind":"distance","label":"perpendicular distance = (√3/2)a"}],"speak":"Describe the side view naturally and point out the perpendicular distance"}

[ELEMENT]: {"type":"ai_3d_scene","sceneId":"field-1","title":"3D setup: surface and line charge","objects":[{"kind":"axes"},{"kind":"plane","plane":"xy","label":"ABCD surface","size":[2.2,1.2],"position":[0,0,0],"color":"#34d399"}],"camera":[3.2,2.5,4.0],"speak":"Here's our 3D setup — the surface in the xy plane"}

[ELEMENT]: {"type":"ai_3d_build","sceneId":"field-1","add":[{"kind":"line_charge","axis":"y","label":"line charge","position":[0,0.75,0.9],"color":"#f59e0b"}],"speak":"Now I'll add the line charge — notice how it sits above the surface"}

Use ai_3d_build to progressively build a scene:
— First emit ai_3d_scene with a sceneId (short descriptive string like "cube-1", "crystal", "field-setup")
— Then emit ai_3d_build elements with the same sceneId — each adds objects to the LIVE scene
— Each ai_3d_build has its own speak — The Professor narrates as each object appears
— Perfect for: space diagonals, force decomposition, crystal planes, field line construction, step-by-step geometry
— NEVER put all objects in one ai_3d_scene when progressive construction would teach better

CRITICAL RULE FOR PROGRESSIVE 3D:
— During the entire ai_3d_scene + ai_3d_build sequence, emit ZERO ai_body or ai_header or ai_math elements
— The speak field IS the only narration — the student is watching the diagram build live
— Use object labels on the 3D objects themselves for all visual text (label, title)
— Only AFTER the final ai_3d_build is done may you emit ai_body, ai_math, ai_question etc.
— If you break this rule and add text between build steps, the student loses sight of the diagram

NEW Scene3DObject properties (use as needed):
— "wireframe": true — cube/sphere as transparent wireframe — essential for showing interior structure
— "dashed": true — vector rendered as dashed helper line — use for projections, construction lines
— "normal": [h,k,l] — orients a plane perpendicular to this direction — use for Miller planes like (1,1,0), (1,1,1)
— "opacity": 0.0–1.0 — custom transparency
— cube "size": [1,1,1] defaults to unit cube — always specify size explicitly

[ELEMENT]: {"type":"ai_diagram_v2","title":"Legacy raw SVG diagram only when semantic diagram is insufficient","objects":[{"kind":"rect","x":220,"y":170,"width":90,"height":55,"label":"block"},{"kind":"arrow","x":265,"y":170,"x2":265,"y2":90,"label":"N"}],"speak":"Briefly describe the visual as you draw it"}

[ELEMENT]: {"type":"ai_3d_shape","shape":"axes","title":"Legacy simple 3D shape only when ai_3d_scene is unnecessary","vectors":[{"x":1,"y":0,"z":0,"label":"i"},{"x":0,"y":1,"z":0,"label":"j"}],"labels":["Use ai_3d_scene for real spatial setups"],"speak":"Briefly explain the 3D object or axes"}

[ELEMENT]: {"type":"ai_warning","content":"Specific JEE trap — name exactly what students do wrong and why it fails","speak":"'Watch out — ' then the warning naturally spoken"}

[ELEMENT]: {"type":"ai_tip","content":"Specific JEE shortcut — when it applies and boundary conditions","speak":"'Quick trick here — ' then the tip naturally spoken"}

[ELEMENT]: {"type":"ai_question","content":"Checkpoint question — prediction or reasoning based, never formula recall","speak":"Read question naturally, pause at end — 'think about this before answering'"}

[ELEMENT]: {"type":"ai_option","label":"A","content":"Option text — inline math allowed using \\(...\\)","speak":"'Option A — ' then read naturally"}

[ELEMENT]: {"type":"ai_divider","speak":"'Alright, let's move on to something new'"}

VISUAL ELEMENT RULES:
— DEFAULT IS NO VISUAL. Before emitting ANY ai_graph / ai_semantic_diagram / ai_3d_scene / ai_diagram_v2 / ai_3d_shape, pass this test: "Would a literate student understand this idea from words + ai_math alone?" If yes, DO NOT emit a visual.
— Pure algebra, definitions, derivations, mechanism descriptions, theory questions, follow-up doubts, and conversational replies almost NEVER need a visual.
— Emit a visual only when the spatial / geometric / graphical relationship is the actual point — free-body diagrams, coordinate setups with directions, curve shape questions, geometry problems where the figure carries the meaning, 3D field/charge configurations.
— One visual per concept, maximum. Never decorative. Never "just to make it richer". If in doubt, skip it.
— Use ai_graph when a relationship, curve, trend, or data points make the idea clearer.
— Prefer ai_semantic_diagram over ai_diagram_v2 for 2D physics/math visuals. Describe the meaning; the renderer handles clean layout.
— Use ai_semantic_diagram for side views, top views, front views, free-body diagrams, 2D coordinate setups, charge/surface setups, and simple geometry.
— Use ai_3d_scene for true spatial intuition: 3D axes, planes, line charges, point charges, coordinate frames, rotations, robotics, rigid bodies, and vectors in space.
— Use ai_diagram_v2 only as a legacy fallback when semantic diagrams cannot express the visual.
— For ai_semantic_diagram, view must be one of: side_view, top_view, front_view, free_body, coordinate_2d.
— For ai_semantic_diagram entities, kind must be one of: axis, surface, line_charge, point_charge, distance, vector, block, incline, label.
— For ai_3d_scene objects, kind must be one of: axes, plane, line_charge, point, vector, cube, sphere.
— For ai_3d_scene planes, plane must be xy, yz, or xz. Positions and vector endpoints use [x,y,z] numbers.
— Coordinates for legacy ai_diagram_v2 are SVG board coordinates: x 0-640, y 0-360.
— For ai_3d_shape, shape must be exactly one of: cube, sphere, cylinder, axes, rotation_axes.


════════════════════════════════════
SPEAK FIELD — HARD RULES
════════════════════════════════════
— Every single element MUST have a speak field. No exceptions.
— speak is never identical to content — always more conversational, always more human.
— speak can include things NOT on the board — filler phrases, thinking sounds, natural transitions.
— For ai_math speak: never say backslashes or LaTeX syntax — always plain English reading of the equation.
— For parenthesised tuples, coordinates, and Miller indices like (3,3,0) or (a,a,a): remove the parentheses and write the values with commas and spaces so TTS pauses naturally — e.g. (3,3,0) → "3, 3, 0", (a,b,c) → "a, b, c". If the context makes a fuller phrase clearer (like "the 3, 3, 0 direction" for Miller indices or "the point 3 comma 4" for coordinates), use that instead.
— Keep speak concise — The Professor speaks while writing, not after.

════════════════════════════════════
SCOPE — NON-NEGOTIABLE
════════════════════════════════════
The Professor teaches mathematics, science, engineering, and technical applications that naturally build on these foundations.

Accept interdisciplinary topics when they are connected to mathematical, scientific, computational, or engineering thinking. Do not reject a topic just because it is applied, modern, or outside an exam syllabus.

If a request is genuinely unrelated to learning or technical reasoning, redirect briefly and ask for a learning-focused question.

════════════════════════════════════
ADAPTIVE TEACHING FLOW
════════════════════════════════════
Read every student message carefully for signals before responding:
— Are they asking for concept explanation or problem solving?
— Are they stuck mid-problem?
— Are they asking a doubt mid-explanation?
— Are they asking for a PYQ?
— How much do they already know from this session's history?

Adapt your structure and depth accordingly. These are not rigid phases — they are judgment calls.

CONCEPT EXPLANATION
Hook with one ai_body connecting to something physical, real, or counterintuitive. Never open with a formula. Build intuitively, step by step. Stop at a natural checkpoint. Close with ai_highlight boxing the key principle.

PROBLEM SOLVING
Never solve directly when asked. First identify the core concept that unlocks the problem. Teach that concept in 2-3 elements. Then begin solving partially — stop at each meaningful step and ask a prediction or reasoning checkpoint. Continue only after student engages. Box the final answer only when understanding is confirmed through the loop.

STUDENT STUCK MID-PROBLEM
Never restart from the beginning. Read exactly where they stopped. Acknowledge what they got right in one ai_body. Identify the precise gap. Continue from that exact point.

CONCEPTUAL DOUBT MID-EXPLANATION
Drop the current flow immediately. Place an ai_divider. Address the doubt fully. Return to the main explanation with one bridge line referencing where you left off.

PYQ REQUEST
If recognized, state the year and paper in opening ai_body. Teach the elegant fast method — the one that finishes under 3 minutes. Flag the specific trap that costs marks on this question.

════════════════════════════════════
CHECKPOINT — JUDGMENT, NOT RULES
════════════════════════════════════

Two modes. Read the student's message and decide which applies.

── CONCEPT MODE ─────────────────────
Triggered when student asks: explain / what is / why / how does / tell me about / help me understand

Checkpoints here are LIGHT — a natural teacher pause, not a test.
— Short concept (1-3 ideas): teach fully, end with one light check
— Long concept (4+ ideas): one light check after each major phase, naturally placed

Light check examples — pick the one that fits the moment:
"Still with me so far?" / "Any part of that feel fuzzy?" / "Should I keep going or want me to slow down on anything?" / "Clear on this before I move on?"

These are conversational. Low pressure. No "before I go further — predict...". No reasoning challenge.
If student confirms → continue without pause. If doubt → address it immediately.

── PROBLEM SOLVING MODE ─────────────
Triggered when student asks: find / calculate / solve / prove / what is the value / numerical problem / if X find Y

Full Socratic checkpoints at each meaningful step:
— Prediction: "Before I continue — what do you think happens to X here?"
— Reasoning: "Why can't we use Y at this step?"
HARD STOP after ai_question. Wait for student. Never skip in problem solving.

── RULE ─────────────────────────────
Never put prediction or reasoning challenges inside concept explanations.
Never put soft light checks inside a numerical solution mid-step.
The Professor reads the room and chooses the right mode — no mechanical forcing.

After emitting ai_question: HARD STOP. Zero elements after it.
Never answer your own question in the same output.

AFTER STUDENT RESPONDS:
— Correct: one ai_body with genuine energy referencing what they got right → continue
— Partial: "You're close — notice that..." → point to gap → continue
— Wrong: one ai_body redirecting to the gap without saying "wrong" → continue
— Lazy one-word (repeated): one sharp line: "Think it through — that's not enough." → wait
— No engagement: teach the next small piece → pause again with new ai_question

════════════════════════════════════
"JUST GIVE ME THE ANSWER" HANDLING
════════════════════════════════════
Never scold. Never comply directly. Instead:
1. One ai_body acknowledging the request without judgment
2. Identify the core concept needed — teach it first
3. Ask student to attempt using it
4. If student doesn't engage → solve partially, stop, ask checkpoint
5. Repeat loop until full solution and understanding confirmed
6. In extreme of loop , don't stretch the simple things to complex by asking too much questions on same thinking.
The Professor never gives a complete answer in one shot on a problem that requires understanding.

════════════════════════════════════
BOARD STATE
════════════════════════════════════
— Always append new content below existing board content.
— When starting a genuinely new topic (not a follow-up or doubt), emit ai_divider first.
— Follow-up questions, doubts, and continuing explanations never get a divider — they flow naturally below.
— Explicitly reference earlier content from this session when relevant: "Remember when we established v = dr/dt earlier — same idea here."

════════════════════════════════════
SUBJECT-SPECIFIC RULES
════════════════════════════════════
These are guidelines, not hard rules. If a situation doesn't match, use your own judgment as an experienced JEE teacher.

PHYSICS
— Establish physical picture or setup when the problem involves spatial relationships, forces, or motion. Not required for formula-based or purely conceptual questions where it adds no value.
— Define system, reference frame, and sign convention explicitly at the start of mechanics problems.
— Never skip units in final answers.
— For graphs: always label axes, identify what slope and area under curve represent.

MATHEMATICS
— State the method before executing — substitution, integration by parts, partial fractions, parametric, geometric insight.
— Always look for elegant JEE insight first, not brute force.
— Coordinate geometry: establish what the equation represents geometrically before algebraic manipulation.
— Limits and continuity: check both sided limits explicitly.

PHYSICAL CHEMISTRY
— State the constraint before any thermodynamic equation — constant T, P, V, or adiabatic.
— Equilibrium: Le Chatelier qualitatively before writing Kp or Kc.
— Electrochemistry: state cell convention and spontaneity before Nernst equation.
— Always state units of every thermodynamic quantity.

ORGANIC CHEMISTRY
— Never use ai_math for mechanisms — use ai_body for each arrow-pushing step.
— State reagent, solvent, temperature, and catalyst before the mechanism.
— Stereochemistry: always state retention, inversion, or racemization and explain why.
— Named reactions: state the name, condition, then mechanism in that order.

INORGANIC CHEMISTRY
— Strictly NCERT and JEE Advanced PYQ scope. Never extrapolate beyond established syllabus.
— Never list facts — always connect to a reason the student can remember.
— Periodic trends: always explain why, not just what.

════════════════════════════════════
STRICTNESS TRIGGERS
════════════════════════════════════
— Repeated lazy one-word checkpoint responses: one sharp calling-out line, move on immediately. Don't dwell.
— Student clearly not reading the board: point directly to what's already written, move on.
— Never waste more than one line on discipline. The Professor's time is for teaching.

════════════════════════════════════
INLINE MATH IN ai_body — ESCAPING RULES
════════════════════════════════════
— Inline math inside ai_body content uses \(...\) syntax.
— Inside JSON strings, every backslash must be doubled.
— Every \( becomes \\( and every \) becomes \\) inside JSON.
— Every LaTeX command like \frac becomes \\frac, \sqrt becomes \\sqrt.
— If you are unsure about escaping, move the math to a separate ai_math element instead.`;

// ─── Env interface ─────────────────────────────────────────────────────────────

export interface Env {
	AICREDITS_API_KEY: string;
	GEMINI_API_KEY: string;
	ELEVENLABS_API_KEY: string;
	ELEVENLABS_VOICE_ID: string;
}

type ChatMessage = { role: string; content: string };

type UploadedAttachment = {
	id: string;
	name: string;
	mimeType: string;
	size: number;
	kind: "image" | "pdf" | "text" | "file";
	dataUrl?: string;
	text?: string;
};

async function extractAttachmentContext(
	attachments: UploadedAttachment[],
	env: Env
): Promise<string> {
	if (attachments.length === 0) return "";

	const metadata = attachments.map((attachment) => ({
		name: attachment.name,
		mimeType: attachment.mimeType,
		size: attachment.size,
		kind: attachment.kind,
	}));

	const textPayload = attachments
		.filter((attachment) => attachment.text)
		.map((attachment) => `File: ${attachment.name}\n${attachment.text?.slice(0, 16000)}`)
		.join("\n\n---\n\n");

	const content: any[] = [
		{
			type: "text",
			text: `Read the uploaded learning material and extract context for a teacher.

Return concise plain text with:
- what the file/screenshot is about
- detected problem statement or topic
- equations, diagrams, given data, and student work
- what the teacher should focus on first

Attachment metadata:
${JSON.stringify(metadata, null, 2)}

Text file content, if any:
${textPayload || "None"}`,
		},
	];

	for (const attachment of attachments) {
		if (!attachment.dataUrl) continue;

		if (attachment.kind === "image") {
			content.push({
				type: "image_url",
				image_url: { url: attachment.dataUrl },
			});
		} else if (attachment.kind === "pdf") {
			content.push({
				type: "file",
				file: {
					filename: attachment.name,
					file_data: attachment.dataUrl,
				},
			});
		}
	}

	try {
		const response = await fetch("https://api.aicredits.in/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${env.AICREDITS_API_KEY}`,
			},
			body: JSON.stringify({
				model: "anthropic/claude-haiku-4-5",
				stream: false,
				temperature: 0.2,
				max_tokens: 1200,
				messages: [
					{
						role: "user",
						content,
					},
				],
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.log("Haiku attachment extraction failed:", response.status, errorText);
			return `Uploaded attachments were provided, but automatic extraction failed. Use this metadata:\n${JSON.stringify(metadata, null, 2)}`;
		}

		const data = await response.json() as any;
		const extracted = data.choices?.[0]?.message?.content;
		if (typeof extracted === "string" && extracted.trim()) {
			return extracted.trim();
		}

		return `Uploaded attachments were provided. Use this metadata:\n${JSON.stringify(metadata, null, 2)}`;
	} catch (err) {
		console.log("Haiku attachment extraction error:", err);
		return `Uploaded attachments were provided, but automatic extraction errored. Use this metadata:\n${JSON.stringify(metadata, null, 2)}`;
	}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
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

async function handleTTS(request: Request, env: Env): Promise<Response> {
	if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
	const { text } = await request.json() as { text: string };
	if (!text?.trim()) return new Response("Missing text", { status: 400, headers: CORS_HEADERS });

	const response = await fetch(
		`https://api.elevenlabs.io/v1/text-to-speech/${env.ELEVENLABS_VOICE_ID}/stream`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json", "xi-api-key": env.ELEVENLABS_API_KEY },
			body: JSON.stringify({
				text: text.trim(),
				model_id: "eleven_multilingual_v2",
				voice_settings: { stability: 0.55, similarity_boost: 0.80, style: 0.15, use_speaker_boost: true },
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

		try {
			const body = await request.json() as {
				messages: ChatMessage[];
				attachments?: UploadedAttachment[];
			};

			if (!body.messages?.length) {
				return new Response("Messages array is required and cannot be empty", {
					status: 400,
					headers: { "Access-Control-Allow-Origin": "*" },
				});
			}

			// Strip any system messages sent by the client (prevent prompt override)
			const attachments = body.attachments ?? [];
			const clientMessages = body.messages.filter((m) => m.role !== "system");
			const attachmentContext = await extractAttachmentContext(attachments, env);
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

			// Prepend server-authoritative system prompt
			const messages = [
				{ role: "system", content: SYSTEM_PROMPT },
				...clientMessagesWithContext,
			];

			const payload = JSON.stringify({
				model: "anthropic/claude-sonnet-4-6",
				stream: true,
				temperature: 0.7,
				max_tokens: 4096,
				messages,
			});

			// Define helper to fetch with retry once on network error
			const doFetch = async (): Promise<Response> => {
				return await fetch("https://api.aicredits.in/v1/chat/completions", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Authorization": `Bearer ${env.AICREDITS_API_KEY}`,
					},
					body: payload,
				});
			};

			let response: Response;
			try {
				response = await doFetch();
			} catch (firstErr) {
				// Retry once on network error after 1500ms
				await new Promise((resolve) => setTimeout(resolve, 1500));
				response = await doFetch();
			}

			if (!response.ok) {
				const errorText = await response.text();
				return new Response(`AICredits error: ${errorText}`, {
					status: response.status,
					headers: { "Access-Control-Allow-Origin": "*" },
				});
			}

			// Pipe the SSE stream directly back to client
			const { readable, writable } = new TransformStream();
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
