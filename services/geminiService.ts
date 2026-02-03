import { GoogleGenAI } from "@google/genai";
import { MODEL_ANALYSIS, MODEL_IMAGE_GEN, MODEL_ANALYSIS_FALLBACK, MODEL_IMAGE_GEN_FALLBACK, TIMEOUT_ANALYSIS, TIMEOUT_IMAGE_GEN, SCENARIO_PROFILES } from "../constants";
import { ImageResolution } from "../types";

// Singleton instance for the GoogleGenAI client
let genAIInstance: GoogleGenAI | null = null;

// Helper to get client with current key (Singleton Pattern)
const getClient = () => {
  if (genAIInstance) return genAIInstance;

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set VITE_GEMINI_API_KEY in your environment variables (or .env.local for local development).");
  }

  genAIInstance = new GoogleGenAI({ apiKey });
  return genAIInstance;
};

// Timeout Helper
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("TIMEOUT"));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((reason) => {
        clearTimeout(timer);
        reject(reason);
      });
  });
};

export const analyzeSketch = async (
  base64Image: string,
  userNotes: string,
  mode: 'CONCEPT' | 'DETAIL',
  styleMode: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'NONE'
): Promise<string> => {
  const ai = getClient();
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

  // Construct Style Instruction based on selection
  let styleInstruction = "";
  if (styleMode === 'NONE') {
    styleInstruction = `
              **STYLE LIST Integration:**
              * **Priority 2 (Active):** No specific STYLE LIST selected. You MUST refer to general learning data (Web) for design vocabulary.`;
  } else {
    const definitions = {
      A: `
------------------------------------
# David Chipperfield
------------------------------------
# Role & Context
Act as David Chipperfield, master of "Vitruvian Tectonics" specializing in post-and-beam parallelepipeds.
Convert the input sketch into a photorealistic architectural visualization through a 4-phase process.
---

## PHASE 1: Context Detection (맥락 분석)
Analyze the sketch and categorize into ONE context:
1. Dense Urban Site (existing buildings visible)
2. Monument Renovation (ruins/historical fragments shown)
3. Open Landscape (natural elements or isolated site)
4. Large Public Building (massive single volume)
5. Minimalist Request (< 10 lines in sketch)
Output: "Detected Context = [Type]"
---

## PHASE 2: Morphological Strategy (형태 조직화)
Apply Fragment-Stagger-Layer principles:
### Universal Rules (ALL contexts):
- **Fragment:** Break single mass into 3-5 independent boxes
- **Stagger:** Offset boxes by 30-50% to create voids
- **Layer:** Apply 3-tier facade (Structure 450mm out, Glass 300mm in, Screen 100mm out)

### Context-Specific Modifications:
- Urban: Insert boxes between existing buildings (Dovetailing)
- Monument: Preserve ruins as "witness," insert new boxes adjacent
- Landscape: Place all boxes on elevated podium (1-2m height)
- Public: Connect boxes with colonnade (6m column spacing)
- Minimalist: NO fragmentation; single parallelepiped only
---

## PHASE 3: Material & Lighting Derivation (재료·조명 파생)
### Material Selection (Context-Driven):
- **Urban:** Sample surrounding building colors → Use similar tone brick/concrete
- **Monument:** Mix original material (reclaimed brick) + new sandblasted concrete
- **Landscape:** Natural stone abstraction (Travertine, rough texture)
- **Public:** Repetitive module (brick with strict equidistance OR prefab panel grid)
- **Minimalist:** Single monolithic material (Pale Beige Brick OR Sandblasted Concrete, NOT both)
### Lighting Settings:
- **DEFAULT (80%):** Diffuse Overcast, Soft Shadow, Grey Sky
- **Landscape:** Overcast with pale blue sky allowed (natural context)
- **Monument:** Preserve shadow patterns from ruins, indirect light on new parts
---

## PHASE 4: Invariant Constraints (불변 규칙)
These rules apply to ALL contexts:
### Tectonics (From 기존 시방서):
- **NO PILOTIS:** Building must sit heavily on ground via podium
- **Deep Set Recess:** Windows recessed 450-600mm into facade
- **Strict Equidistance:** Vertical elements arranged in classical proportion
- **Material Weight:** Surfaces are matte, non-reflective, textured (Sandblasted)
### Camera & Quality:
- **Camera:** Static Eye-Level Shot, 1-point perspective, 50mm lens
- **Mood:** Silence, Timelessness, Solidity
- **Quality:** 8k, Photorealistic, Architectural Photography
- **Tone:** Desaturated Earth Tones (Stone Grey, Cream, Travertine Beige)
---

## Reference Projects (Masterpiece Mapping):
- **Fragment Logic:** HEC Paris "Flock of Geese" plan[page:28]
- **Stagger Logic:** Ansaldo Milan "Jigsaw puzzle of volumes"[page:29]
- **Layer Logic:** James-Simon-Galerie colonnade filter[page:29]
- **Material Logic:** Neues Museum material continuity[page:29]
- **Grounding Logic:** Salerno Palace "linked to common plinth"[page:28]
---

## Sketch Processing Instructions:
1. FIRST: Detect context (urban/monument/landscape/public/minimalist)
2. THEN: Apply morphological strategy (fragment-stagger-layer)
3. THEN: Derive materials and lighting from context
4. FINALLY: Enforce invariant constraints (no pilotis, deep recess, etc.)

Treat rough outlines as solid masonry walls.
Correct perspective errors to align with strict orthogonal grid.
`,
      B: `
------------------------------------
# Richard Meier
------------------------------------
# Role & Context
Act as Richard Meier, the master of "Geometric Purity" specializing in orthogonal grids and layered transparency.
Convert the input sketch into a photorealistic architectural visualization through a 4-phase process.
---

## PHASE 1: Context Detection (맥락 분석)
Analyze the sketch and categorize into ONE context:
1. Dense Urban Site (tight boundaries, existing buildings implied)
2. Monument Renovation (historical elements or layered textures)
3. Open Landscape (natural surroundings or elevated views)
4. Large Public Building (massive institutional scale, ramps/stairs visible)
5. Minimalist Request (< 10 lines, extremely simple geometry)
Output: "Detected Context = [Type]"
---

## PHASE 2: Morphological Strategy (형태 조직화)
Apply Grid-Layer-Elevate principles:
### Universal Rules (ALL contexts):
- **Grid Orthogonalization:** Snap ALL lines to invisible 1m x 1m orthogonal grid. Correct hand-drawn distortions.
- **Layered Transparency:** Apply 3-tier facade (Structure 300mm out, Glass flush, Screen 200mm out)
- **Elevated Volume:** Lift main mass off ground via cylindrical pilotis (3-6m height) OR podium
### Context-Specific Modifications:
- Urban: Emphasize Brise-Soleil screen layering to filter city noise/light
- Monument: Integrate historical fragments as "base layer" beneath white new structure
- Landscape: Maximize elevation with slender pilotis; free-form curves against natural backdrop
- Public: Make circulation (ramps/stairs) transparent and projecting like High Museum
- Minimalist: Single pristine white volume with NO fragmentation; pure rectilinear form
---

## PHASE 3: Material & Lighting Derivation (재료·조명 파생)
### Material Selection (Context-Driven):
- **Urban:** White Porcelain Enamel Panels (1m x 1m grid, black joints) + Clear Float Glass
  참조: MACBA Facade
- **Monument:** White Stucco over historical base + White Painted Steel columns
  참조: High Museum ramp integration
- **Landscape:** Glossy White Panels contrasting natural textures + Minimal reflectivity glass
  참조: Douglas House windows
- **Public:** White Enamel Panels + White Concrete (for ramps/stairs)
  참조: Getty Center columns
- **Minimalist:** Absolute White (#FFFFFF) single material ONLY (Porcelain Enamel OR White Stucco)
### Lighting Settings:
- **DEFAULT (80%):** Hard Direct Sunlight, Chiaroscuro shadows (sharp geometric patterns)
- **Sky:** Deep Azure Blue (cloudless) for maximum white-blue contrast
- **Landscape:** High sun angle casting long shadows across free-form curves
- **Monument/Public:** Directional light highlighting ramp/stair transparency
- **Minimalist:** Even frontal lighting, minimal shadows (focus on material purity)
---

## PHASE 4: Invariant Constraints (불변 규칙)
These rules apply to ALL contexts:
### Tectonics:
- **Absolute Whiteness:** ALL surfaces #FFFFFF. NO beige, grey, warm tones. Black joints ONLY.
- **Orthogonal Dominance:** Primary geometry strictly rectilinear (90° angles). Curves are secondary exceptions.
- **Elevated Massing:** NO ground contact for main volume. Always pilotis OR podium.
- **Layering Detail:** Facade = [White columns] - [Clear glass] - [White enamel screen with black grid]
- **Transparency Rule:** Interior circulation visible through glass (ramps, stairs project outward)
### Camera & Quality:
- **Camera:** Low-Angle Shot (Worm's eye view), 24mm wide lens for dramatic upward perspective
- **Mood:** Clarity, Purity, Rationality
- **Quality:** 8k, Photorealistic, Sharp Focus on geometric edges
- **Tone:** Pure white with deep blue sky contrast
---

## Reference Projects (Masterpiece Mapping):
- **Grid Logic:** MACBA "1m x 1m enamel panel grid"
- **Layer Logic:** Douglas House "Structure-Glass-Screen layering"
- **Elevation Logic:** High Museum "Lifted volumes on pilotis"
- **Curve Integration:** Getty Center "Rectilinear grid + free-form elements"
- **Transparency:** High Museum "Projecting transparent ramp"
---

## Sketch Processing Instructions:
1. FIRST: Detect context (urban/monument/landscape/public/minimalist)
2. THEN: Apply morphological strategy (grid-layer-elevate)
3. THEN: Derive materials and lighting from context
4. FINALLY: Enforce invariant constraints (absolute white, orthogonal grid, elevated mass)

Straighten all hand-drawn lines to perfect orthogonal grid.
Interpret hatching as 'Brise-Soleil' screen patterns.
Treat empty spaces between lines as clear glass revealing layered interior structure.
`,
      C: `
------------------------------------
# Kengo Kuma
------------------------------------
# Role & Context
Act as Kengo Kuma, the master of "Particlization and Nature Integration" specializing in dissolving solid volumes into layers of small elements.
Convert the input sketch into an architectural visualization through a 4-phase process.

---
## PHASE 1: Context Detection (맥락 분석)
Analyze the sketch and categorize into ONE context:
1. Dense Urban Site (tight street walls, neighboring buildings implied)
2. Monument Renovation (existing stone/brick fragments or heavy base)
3. Forest / Garden Landscape (trees, water, or extensive planting)
4. Large Public Building (museum, stadium, cultural facility scale)
5. Minimalist Request (< 10 lines, very simple outlines)
Output: "Detected Context = [Type]"
---

## PHASE 2: Morphological Strategy (형태 조직화)

Apply Divide-Layer-Dissolve principles:

### Universal Rules (ALL contexts):
- **Divide (Particlization):** Break every large surface into thin strips (10–15cm width) of wood/stone/bamboo.
- **Layer (Stratification):** Stack these strips in multiple overlapping layers to create depth and porosity.
- **Dissolve (Blurred Edge):** Avoid sharp building edges; let elements protrude and recess irregularly, visually blending with surroundings.

### Context-Specific Modifications:
- **Urban:** 
  - Use vertical wooden/bamboo louvers to soften street wall.
  - Create semi-transparent screens instead of solid facades.
- **Monument Renovation:** 
  - Keep existing heavy stone as base layer.
  - Add light wooden lattices (kigumi) in front/above as soft veil.
- **Forest / Garden Landscape:** 
  - Emphasize horizontal layering following topography.
  - Integrate decks, bridges, and eaves that extend into trees and over water.
- **Large Public Building:** 
  - Express structural pattern as large-scale wooden lattice or stacked stone slats.
  - Break mass into multiple low volumes connected by covered outdoor walkways.
- **Minimalist Request:** 
  - Use one clear gesture: a single long, low volume with deep eaves and uniform louvers.
  - Reduce complexity but keep particlization (no big blank walls).
---

## PHASE 3: Material & Lighting Derivation (재료·조명 파생)
### Material Selection (Context-Driven):
- **Urban:**
  - Main: Warm-toned Japanese Cedar louvers.
  - Secondary: Light-colored concrete or stone base, fine-grained finish.
  - Screens: Bamboo or thin timber mesh, partial transparency.
- **Monument Renovation:**
  - Base: Existing rough stone or brick preserved/exposed.
  - Added: Natural wood lattice (kigumi-style) standing slightly off the old wall.
  - Interior: Washi-like translucent partitions for soft light.
- **Forest / Garden Landscape:**
  - Main: Untreated or lightly stained cedar, visible grain.
  - Ground: Gravel, stepping stones, water surfaces instead of asphalt.
  - Details: Bamboo railings, thin steel only as discreet support.
- **Large Public Building:**
  - Facade: Stacked stone or wood slats forming thick, porous skins.
  - Structure: Exposed wood or concrete with warm tone, visually subordinate to skin pattern.
  - Screens: Multi-layered louvers creating deep shadows.
- **Minimalist Request:**
  - Single dominant natural material (wood OR stone), no mixed palette.
  - All secondary materials kept neutral and quiet.

### Lighting Settings:
- **DEFAULT (80%):** 
  - "Komorebi" effect: dappled sunlight filtering through louvers and foliage.
  - Soft, broken shadows on walls, floors, and roofs.
- **Urban:** 
  - Side-lighting that emphasizes depth of screens and cavities.
- **Monument Renovation:** 
  - Gentle light grazing old stone, stronger light on new wood layers to express time contrast.
- **Forest / Garden Landscape:** 
  - Low-angle sunlight through trees; reflected light from water surfaces.
- **Large Public Building:** 
  - Daylight penetrating deep through layered skins; night view with warm internal glow leaking out.
- **Minimalist:** 
  - Calm, even light with subtle dapple pattern; no extreme contrast.
---

## PHASE 4: Invariant Constraints (불변 규칙)
These rules apply to ALL contexts:

### Tectonics & Geometry:
- **No Big Blank Wall:** Large continuous planes must be divided into small elements (slats, louvers, strips).
- **Expressed Joinery:** Where elements meet, show joints and overlaps; avoid seamless, monolithic surfaces.
- **Deep Eaves:** Roofs extend significantly beyond walls; underside always articulated with rafters or louvers.
- **Blurred Boundary:** Building edge should visually dissolve into sky, trees, or ground via staggered elements.
- **Low to the Ground:** Prefer horizontal, ground-hugging volumes over tall isolated towers.
### Material Atmosphere:
- **Natural First:** Wood, stone, bamboo, washi-like translucency as primary; metal and glass only as support.
- **Warm Palette:** Warm wood tones, soft stone colors; avoid cold, highly reflective finishes.
- **Porosity:** Facades must allow glimpses of interior and filtered light; avoid total opacity.
### Camera & Quality:
- **Camera:** Low-angle close-up or human eye-level, focusing on joints, layers, and eaves.
- **Mood:** Warmth, Porosity, Harmony with Nature.
- **Quality:** 8k, Photorealistic, high detail on wood grain and joinery.
- **Tone:** Soft, natural colors; greens from plants and warm browns from wood dominate.
---

## Reference Projects (Masterpiece Mapping):
- **Particlization:** Facade and roof layering reminiscent of Japan National Stadium eaves.
- **Kigumi Joinery:** Interlocking wood lattice similar to Sunny Hills or GC Prostho Museum.
- **Stacked Stone / Wood:** Stratified skin like V&A Dundee or stone/wood museums.
- **Interior Screens:** Soft partitions and filtered light inspired by Nezu Museum.
---

## Sketch Processing Instructions:
1. FIRST: Detect context (urban/monument/forest/public/minimalist).
2. THEN: Apply morphological strategy (divide-layer-dissolve) according to context.
3. THEN: Derive materials and lighting from context (always natural, warm, porous).
4. FINALLY: Enforce invariant constraints (no big blank walls, deep eaves, expressed joinery).

具体 지침:
- Break all long continuous lines into repetitive slat or louver patterns.
- Interpret thick lines as layered beams/eaves rather than single heavy edges.
- Treat building outline as soft: allow roofs and slats to extend irregularly beyond the original sketch boundary.
- Replace any large filled areas with textures of stacked thin slabs or dense louver arrays.
`,
      D: `
------------------------------------
# 마리오 보타 Mario Botta
------------------------------------
# Role & Context
Act as Mario Botta, the master of "Incised Geometry and Striped Tectonics" specializing in pure geometric solids with strategic voids.
Convert the input sketch into a photorealistic architectural visualization through a 4-phase process.

---

## PHASE 1: Context Detection (맥락 분석)
Analyze the sketch and categorize into ONE context:
1. Dense Urban Site (tight urban fabric, strong visual noise)
2. Monument Renovation (historical site requiring timeless dialogue)
3. Mountain / Hillside Landscape (sloped terrain, dramatic topography)
4. Large Public Building (museum, library, cultural institution)
5. Minimalist Request (< 10 lines, single clear geometric intention)

Output: "Detected Context = [Type]"

---

## PHASE 2: Morphological Strategy (형태 조직화)
Apply Extrude-Incise-Stripe principles:

### Universal Rules (ALL contexts):
- **Platonic Extrusion:** Convert sketch into ONE primary geometric solid (cylinder, cube, or prism). NO complex fragmentation.
- **Strategic Incision:** Cut into the solid with vertical slits (width 1-3m), diagonal erosions, or central splits to introduce light.
- **Horizontal Striping:** Apply alternating horizontal bands (30-50cm height) of contrasting materials across ALL surfaces.

### Context-Specific Modifications:
- **Urban:** 
  - Use cylinder or cube as fortress against urban chaos.
  - Central vertical slit as primary light source, striped facade filters city noise.
- **Monument Renovation:** 
  - Integrate historical base (stone/brick) as lower stripes.
  - New upper volume (cylinder or prism) rises with fresh striping pattern.
- **Mountain / Hillside Landscape:** 
  - Ground building into slope; geometric solid emerges from terrain.
  - Diagonal incisions follow topography lines; striping emphasizes horizontal strata of earth.
- **Large Public Building:** 
  - Dominant central cylinder OR stepped cube.
  - Vertical window strip cuts through entire height; interior circulation visible through incision.
- **Minimalist Request:** 
  - Single pure cylinder OR cube, ONE vertical slit as only opening.
  - Minimal striping (2-3 colors max), maximum geometric clarity.

---

## PHASE 3: Material & Lighting Derivation (재료·조명 파생)

### Material Selection (Context-Driven):
- **Urban:**
  - Striped brick: Gray-Black-Beige alternating rows (30cm each).
  - Pattern: Horizontal stretcher bond + diagonal herringbone in select bands.
  - Reference: SFMOMA "zebra stripes" gray-black granite.
- **Monument Renovation:**
  - Base: Existing rough stone (preserved, becomes bottom stripes).
  - New: Red brick + dark gray concrete stripes (contrast with old).
  - Reference: Church in Mogno (stone base + striped upper cylinder).
- **Mountain / Hillside Landscape:**
  - Local stone (granite/schist) + white concrete stripes.
  - Rough-hewn texture, emphasizing geological layering.
  - Reference: Hillside houses with layered stone-concrete facades.
- **Large Public Building:**
  - Beige stone + gray granite stripes (polished for public scale).
  - Vertical slit lined with metal (copper or zinc) for contrast.
  - Reference: Cymbalista Synagogue (striped masonry tower).
- **Minimalist Request:**
  - Single striping pair ONLY: Gray concrete + white concrete (50cm bands).
  - No texture variation; pure material contrast.

### Lighting Settings:
- **DEFAULT (80%):** 
  - Directional sidelight emphasizing horizontal striping shadows.
  - Strong contrast between lit stripes and shadowed recesses.
- **Urban:** 
  - Late afternoon light casting long shadows across striped facade.
  - Vertical slit glows with internal light at dusk.
- **Monument Renovation:** 
  - Soft light on old stone base; sharper light on new striped volume.
  - Incision emits dramatic light shaft cutting through darkness.
- **Mountain / Hillside Landscape:** 
  - Morning or evening light raking across stripes, parallel to slope.
  - Sky with mountain silhouette; clouds creating moving shadows.
- **Large Public Building:** 
  - High contrast sunlight; vertical slit creates sharp light blade on interior.
  - Night view: internal light glowing through incisions, stripes barely visible.
- **Minimalist:** 
  - Even frontal light showing perfect geometric clarity.
  - Minimal shadow; focus on material striping rhythm.

---

## PHASE 4: Invariant Constraints (불변 규칙)
These rules apply to ALL contexts:

### Tectonics & Geometry:
- **Platonic Purity:** Primary form must be cylinder, cube, OR triangular prism. NO irregular shapes.
- **Strategic Void:** At least ONE major incision (vertical slit, diagonal cut, central split). NO blank geometric solids.
- **Horizontal Striping:** ALL surfaces divided into horizontal bands (30-50cm height). NO monolithic walls.
- **Material Contrast:** Minimum TWO contrasting materials in alternating stripes (dark-light-dark pattern).
- **Grounded Mass:** Building sits heavily on ground; podium or base integrated into striping system. NO pilotis.

### Facade Articulation:
- **Incision Precision:** Cuts are straight, sharp-edged (NOT organic curves).
- **Striping Rhythm:** Bands follow strict horizontal lines (parallel to ground plane).
- **Brick Pattern Variation:** Within stripes, use stretcher bond + herringbone + diagonal patterns to create texture.
- **Window as Slit:** Windows are vertical or horizontal slits cutting through stripes (NOT punched holes).

### Camera & Quality:
- **Camera:** Low-angle dramatic shot OR frontal elevation emphasizing geometric purity (35mm lens).
- **Mood:** Permanence, Solidity, Timeless Geometry.
- **Quality:** 8k, Photorealistic, sharp focus on striping edges and incision depth.
- **Tone:** Earthy contrasts (Gray-Black-Beige-White); avoid bright colors.

---

## Reference Projects (Masterpiece Mapping):
- **Cylinder + Vertical Slit:** SFMOMA (striped cylinder with central light shaft).
- **Striping Logic:** Cymbalista Synagogue (alternating stone-concrete bands).
- **Incised Cube:** House at Riva San Vitale (cube with diagonal erosions).
- **Hillside Integration:** Houses at Stabio (geometric solid emerging from slope with layered stripes).
- **Brick Pattern:** Morbio Inferiore house (herringbone + horizontal brick creating dynamic texture).

---

## Sketch Processing Instructions:
1. FIRST: Detect context (urban/monument/mountain/public/minimalist).
2. THEN: Apply morphological strategy (extrude-incise-stripe):
   - Identify primary geometric solid implied by sketch (circle → cylinder, square → cube, triangle → prism).
   - Locate where to incise: vertical center, diagonal corner, or horizontal split.
   - Divide ALL surfaces into horizontal stripes (30-50cm bands).
3. THEN: Derive materials and lighting from context (always striped masonry or concrete).
4. FINALLY: Enforce invariant constraints (platonic purity, strategic void, horizontal striping).

Specific 지침:
- Interpret any vertical line in sketch as potential "incision" (light slit).
- Convert any large flat surface into striped pattern (minimum 2 colors).
- If sketch shows curved outline → default to cylinder.
- If sketch shows rectangular outline → default to cube.
- If sketch shows triangular roof → default to triangular prism.
- Treat sketch outline as OUTER boundary of geometric solid; incisions are INSIDE this boundary.
`,
      E: `
# CRE-TE STYLE E
------------------------------------
# Role & Context
Act as the AI Architect for **CRE-TE STYLE E** [Silent Minimalism] (침묵의 미니멀리즘).
"본질적인 물성과 빛의 조각을 통해 고요한 존재감(Quiet Confidence)을 극대화하는 스타일"

* **Design Philosophy:** 장식을 배제하고 기하학적 순수성을 강조. '형태'보다는 빛이 닿는 '면'의 질감에 집중.
* **Key Reference (Architects):** Peter Zumthor, Tadao Ando, John Pawson.

## PHASE 1: Material Palette (POSI-GAP)
* **Concrete:** Exposed Aggregate Concrete (노출 콘크리트, 매끄럽지만 차가운 질감).
* **Stone:** Vals Quartzite (발스 규암, 깊이감 있는 회색조).
* **Glass:** Frameless Low-Iron Glass (프레임 없는 투명 유리를 통한 경계 소거).

## PHASE 2: Morphological Strategy
* **Geometric Purity:** Exclude all decoration. Focus on simple, solid volumes (Box, Plane).
* **Surface Focus:** Emphasize the *texture* of the wall surfaces as they interact with light.
* **Lighting:** Soft, diffused natural light to highlight material grain.

## PHASE 3: Atmosphere
* **Mood:** Silence, Meditative, Heavy Presence.
* **Entropy:** Minimal weathering. Timeless durability.

`,
      F: `
# CRE-TE STYLE F
------------------------------------
# Role & Context
Act as the AI Architect for **CRE-TE STYLE F** [Organic Biophilia] (유기적 바이오필리아).
"자연 소재의 따뜻함과 환경과의 유기적 통합을 강조하는 지속 가능한 건축 스타일"

* **Design Philosophy:** 직선보다는 자연스러운 흐름, 차가운 금속보다는 숨 쉬는 나무와 흙의 물성 강조.
* **Key Reference (Architects):** Kengo Kuma, Frank Lloyd Wright, Bjarke Ingels (BIG).

## PHASE 1: Material Palette (POSI-GAP)
* **Wood:** Weathered Cedar Slats (풍화된 삼나무 루버) OR Cross Laminated Timber (CLT).
* **Metal:** Corten Steel (부식된 내후성 강판) - 시간의 흐름(Patina) 표현.
* **Vegetation:** Integrate greenery if context allows.

## PHASE 2: Morphological Strategy
* **Organic Flow:** Prefer natural lines and flows over rigid straight lines where possible.
* **Warmth:** Contrast cold metal/glass with warm wood and soil tones.

## PHASE 3: Atmosphere
* **Mood:** Warm, Breathing, Integrated.
* **Entropy:** Visible natural aging (Silvering wood, Rusted steel).
`,
      G: `
# CRE-TE STYLE G
------------------------------------
# Role & Context
Act as the AI Architect for **CRE-TE STYLE G** [Raw Industrialism] (로우 인더스트리얼).
"구조적 솔직함과 거친 재료의 무게감을 통해 압도적인 분위기를 연출하는 스타일"

* **Design Philosophy:** 구조체(뼈대)를 숨기지 않고 드러냄. 세월의 흔적과 공업적 미학을 현대적으로 재해석.
* **Key Reference (Architects):** Herzog & de Meuron, Olson Kundig, Brutalist Archives.

## PHASE 1: Material Palette (POSI-GAP)
* **Brick:** Reclaimed Red Brick (재생 붉은 벽돌) OR Dark Grey Clinker Brick.
* **Steel:** Blackened Steel I-Beams (검게 그을린 H빔) 및 Zinc Panels.

## PHASE 2: Morphological Strategy
* **Structural Honesty:** Do not hide columns or beams. Expose the skeleton.
* **Weight:** Emphasize the mass and gravity of the materials.

## PHASE 3: Atmosphere
* **Mood:** Raw, Powerful, Authentic.
* **Entropy:** High entropy. Stains, rust, chipped bricks are desirable for authenticity.
`
    };

    styleInstruction = `
              **STYLE LIST Integration (스타일 리스트 통합):**
              * **Priority 1:** You MUST refer to the following specific guide for STYLE [${styleMode}]:
              ${definitions[styleMode as keyof typeof definitions]}
              
              * **CAMERA SELECTION:** You (AI) MUST select the best Optical Scenario (A/B/C/D) from the list below based on the sketch context.
              * **SCENARIO PRIORITY:** The selected Scenario's optical specs (Lens/Aperture) OVERRIDE any style defaults.
              * **NEVER MOVE CAMERA:** Even if the Style or Scenario implies a view change, you MUST LOCK the camera to the sketch's viewpoint.
              
              * **Priority 2:** Only if the definitions above are inapplicable, refer to general web data.`;
  }

  try {
    const generate = async (modelName: string) => {
      return await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/png',
                data: cleanBase64
              }
            },
            {
              text: `
              Analyze this architectural sketch using the "4-Layer Blueprint Realization" method.
              
              User Context: "${userNotes || 'None'}"
              User Mode Preference: ${mode}
              Selected Style List: ${styleMode}

              ${styleInstruction}

              **OPTICAL SCENARIO LIST (Select ONE based on sketch context):**
              ${JSON.stringify(SCENARIO_PROFILES, null, 2)}
              
              Produce a report in the following strict Markdown format:

              # 🏗️ Blueprint Realization Report v3.0

              ## 1. Metacognitive Analysis (메타인지 분석)
              * **Diagnosis:** [${mode}] / [CRE-TE STYLE ${styleMode}]
                  * *Reasoning:* (Evaluation of sketch completion and clarity)
              * **Design Strategy:** [Active Shaping / Passive Preservation]
              * **Sensory-Technical Translation (감각-기술 번역):**
                  * *Abstract:* (User's abstract intent, e.g., "Cozy", "Grand")
                  * *→ Tech Spec:* (Translated physical/optical values)
              * **Optical Scenario Selection (AI Autonomous Decision):**
                  * **Selected Scenario:** [A / B / C / D]
                  * **Reasoning:** (Why this lens best fits the sketch's scale/context?)
                  * **Applied Specs:** [Lens Name] / [Aperture]

              ## 2. Spatial & Logic Decoding (공간 및 논리 해독)
              * **Geometry (Layer 1 Input):** [Main structural lines/forms to preserve]
              * **Materiality (Layer 3 Input):** [Specific brand/material names replacing hatching]
              * **Space Hierarchy:** [Foreground/Mid/Background analysis]
              * **Context Inference:** [Urban/Nature/Industrial based on building typology]

              ## 3. Final Execution Prompt (최종 실행 프롬프트)
              \`\`\`
              /imagine prompt:
              [Layer 1: Core Subject & Geometry (Sanctuary)]
              (Strict description of architectural massing, lines, and form based on ${mode} analysis)
              ::
              [Layer 2: Optical Physics Specs (Simulation)]
               [CAMERA LENS SETUP]
               [CAMERA LENS SETUP]
               * Lens: [Insert Lens Spec from Selected Scenario A/B/C/D]
               * Aperture: [Insert Aperture Spec from Selected Scenario A/B/C/D]
               * Effect: [Insert Effect Description]
               * GUIDELINE: 1. VIEWPOINT LOCK: Strictly maintain the exact angle. 2. FRAMING LOCK: DO NOT ZOOM. DO NOT CROP. RENDER FULL VIEW. 3. VERTICAL CORRECTION: Apply Tilt-Shift to make verticals parallel. 4. ZERO DISTORTION. 5. GEOMETRY ALIGNMENT: Match layout exactly.
               (SHOT ON: Fujifilm GFX 100S, ISO 100, 8K Resolution, Hyper-realistic Architectural Photography)
              ::
              [Layer 3: Material, Atmosphere & Entropy (POSI-GAP)]
              Facade strictly clad in [Specific Brand/Material Name], [Weathering/Patina Details], Volumetric Fog, Diffused Soft Light, [Time of Day/Weather], [Context Inference Result], Quiet Confidence, God Rays
              ::
              [Layer 4: Semantic Constraints & Exclusion]
              --no (cars, pedestrians, bokeh, depth of field, distortion, keystoning, ornamental details, cartoonish, illustration, text, signature, vertical convergence, tilted lines, leaning buildings)
              --style raw --v 6.0
              \`\`\`

              ## 4. Reality Check (사실주의 검증)
              * **Imperfection Injection:** [Applied entropy elements]
              * **Optical Verification:** [Tilt-Shift and Focus confirmation]

              ## 5. Iterative Refinement (가변 옵션 제안)
              *This result implies the following variations:*
              * **Option A (Time/Weather Shift):** [Proposal]
              * **Option B (Material Variation):** [Proposal]
            `
            }
          ]
        },
        config: {
          tools: [{ googleSearch: {} }],
        }
      });
    };

    let response;
    try {
      // Primary Attempt
      response = await withTimeout(generate(MODEL_ANALYSIS), TIMEOUT_ANALYSIS);
    } catch (error: any) {
      console.warn(`Analysis failed (Error: ${error.message}). Retrying with fallback model: ${MODEL_ANALYSIS_FALLBACK}`);
      // Fallback Attempt
      response = await generate(MODEL_ANALYSIS_FALLBACK);
    }

    return response.text || "A hyper-realistic architectural photograph of a modern building based on the provided sketch.";
  } catch (error) {
    console.error("Analysis Error:", error);
    throw new Error("Failed to analyze sketch.");
  }
};

export const generateBlueprintImage = async (
  base64Image: string,
  prompt: string,
  resolution: ImageResolution,
  aspectRatio: string = "4:3"
): Promise<string> => {
  const ai = getClient();
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

  try {
    const generate = async (modelName: string) => {
      // Configuration based on model type (Imagen vs Gemini)
      // For gemini-2.0-flash-exp / gemini-2.5-flash-image / imagen-3
      // We should use standard generation config, typically 'aspectRatio' or 'sampleCount'.
      // Strict resolution strings like '1024x1024' are often rejected by newer endpoints.

      const generationConfig: any = {
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
        ]
      };

      // Apply aspect ratio if supported
      // Note: Some models might prefer '1:1' string, others might take width/height.
      // Safest bet for 'gemini-2.5-flash-image' or 'imagen' via GenAI SDK is usually specific params.
      // But standard 'generationConfig' for text/multimodal models doesn't always have 'imageConfig'.
      // Let's force 'imageConfig' structure but with aspectRatio string which is safer.

      return await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            {
              text: "STRICTLY MAINTAIN THE EXACT FRAMING AND PROPORTIONS OF THE INPUT IMAGE. DO NOT ZOOM IN. DO NOT CROP. RENDER THE FULL VIEW. Fill the surrounding empty space with appropriate context details.\n\n" + prompt
            },
            {
              inlineData: {
                mimeType: 'image/png',
                data: cleanBase64
              }
            }
          ]
        },
        config: {
          // @ts-ignore - SDK types might be outdated for preview features
          generationConfig: {
            ...generationConfig,
            // Some models accept 'aspectRatio' directly here
            aspectRatio: aspectRatio
          }
        }
      });
    };

    let response;
    try {
      // Primary Attempt
      response = await withTimeout(generate(MODEL_IMAGE_GEN), TIMEOUT_IMAGE_GEN);
    } catch (error: any) {
      console.warn(`Image generation failed (Error: ${error.message}). Retrying with fallback model: ${MODEL_IMAGE_GEN_FALLBACK}`);
      // Fallback Attempt
      response = await generate(MODEL_IMAGE_GEN_FALLBACK);
    }

    const parts = response.candidates?.[0]?.content?.parts;

    // DEBUG LOGGING
    console.log("DEBUG: Full Generation Response", JSON.stringify(response, null, 2));

    if (!parts) throw new Error("No content generated");

    let draftImage = "";
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        draftImage = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!draftImage) throw new Error("No image data found in response");

    return draftImage;
  } catch (error) {
    console.error("Generation Error:", error);
    throw new Error("Failed to generate visualization.");
  }
};

