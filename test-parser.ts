import { parseAnalysisReport } from './utils/reportParser.ts';

const mockMarkdownIdeal = `
# 🏗️ Blueprint Realization Report v3.0

## 1. Metacognitive Analysis (메타인지 분석)
* **Diagnosis:** [Mode A: Concept]
    * *Reasoning:* Sketch is rough.
* **Design Strategy:** [Active Shaping]
* **Sensory-Technical Translation (감각-기술 번역):**
    * *Abstract:* Cozy
    * *→ Tech Spec:* Warm light

## 2. Spatial & Logic Decoding (공간 및 논리 해독)
* **Geometry (Layer 1 Input):** [Vertical lines]
* **Materiality (Layer 3 Input):** [Concrete]
* **Space Hierarchy:** [Mid-range]

## 3. Final Execution Prompt (최종 실행 프롬프트)
\`\`\`
/imagine prompt:
Test Prompt
\`\`\`

## 4. Reality Check (사실주의 검증)
* **Imperfection Injection:** [Rust]
* **Optical Verification:** [Tilt-shift]

## 5. Iterative Refinement (가변 옵션 제안)
*This result implies the following variations:*
* **Option A (Time/Weather Shift):** [Night]
* **Option B (Material Variation):** [Brick]
`;

const mockMarkdownVariant = `
# 🏗️ Blueprint Realization Report v3.0

## 2. Spatial & Logic Decoding (공간 및 논리 해독)
* **Geometry (Layer 1 Input):** Vertical lines
* **Materiality (Layer 3 Input):** Concrete
* **Space Hierarchy:** Mid-range

## 4. Reality Check (사실주의 검증)
* **Imperfection Injection:** Rust
* **Optical Verification:** Tilt-shift

## 5. Iterative Refinement
* **Option A (Time/Weather Shift):** Night
* **Option B (Material Variation):** Brick
`;

console.log("--- Ideal Output ---");
console.log(JSON.stringify(parseAnalysisReport(mockMarkdownIdeal), null, 2));

console.log("\n--- Variant Output (Missing brackets) ---");
console.log(JSON.stringify(parseAnalysisReport(mockMarkdownVariant), null, 2));
