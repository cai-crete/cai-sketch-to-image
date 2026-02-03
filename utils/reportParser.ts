import { AnalysisReport } from '../types';

export const parseAnalysisReport = (markdown: string): AnalysisReport => {
    const report: AnalysisReport = {
        metacognitive: {
            diagnosis: '',
            reasoning: '',
            designStrategy: '',
            sensorySpec: { abstract: '', techSpec: '' }
        },
        spatial: {
            geometry: '',
            materiality: '',
            spaceHierarchy: ''
        },
        execution: {
            prompt: ''
        },
        verification: {
            imperfection: '',
            optical: ''
        },
        refinement: {
            optionA: '',
            optionB: ''
        }
    };

    try {
        const extract = (patterns: RegExp[], defaultVal = '') => {
            for (const pattern of patterns) {
                const match = markdown.match(pattern);
                if (match && match.index !== undefined) {
                    const startIndex = match.index + match[0].length;
                    let content = markdown.slice(startIndex).trim();

                    const lines = content.split('\n');
                    const cleanLines: string[] = [];

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed.startsWith('##')) break;

                        if ((trimmed.startsWith('*') || trimmed.startsWith('-') || trimmed.match(/^\d+\./)) && trimmed.includes('**')) {
                            if (trimmed.includes(':') && !trimmed.startsWith('(') && !trimmed.includes('[STYLE:')) break;
                        }
                        if ((trimmed.startsWith('*') || trimmed.startsWith('-')) && trimmed.includes('*')) {
                            if (trimmed.includes(':') && cleanLines.length > 0) break;
                        }

                        cleanLines.push(line);
                    }

                    content = cleanLines.join('\n').trim();

                    content = content.replace(/^[:*]+/, '').trim();

                    if (content.startsWith('(')) {
                        const closeParen = content.indexOf('):');
                        if (closeParen !== -1) {
                            content = content.slice(closeParen + 2).trim();
                        }
                    }

                    content = content.replace(/^[:*]+/, '').trim();

                    if (content.startsWith('[') && content.endsWith(']')) {
                        // Don't strip brackets if it's the [DETAIL] / [STYLE: A] format
                        if (!content.includes(' / ')) {
                            content = content.slice(1, -1).trim();
                        }
                    }
                    return content;
                }
            }
            return defaultVal;
        };

        // 1. Metacognitive
        report.metacognitive.diagnosis = extract([
            /(?:^|\n)\s*(?:[*+-]|\d\.)\s*\**Diagnosis/i,
        ]);
        report.metacognitive.reasoning = extract([
            /(?:^|\n)\s*(?:[*+-]|\d\.)\s*\**Reasoning/i,
        ]);
        report.metacognitive.designStrategy = extract([
            /(?:^|\n)\s*(?:[*+-]|\d\.)\s*\**Design Strategy/i,
        ]);
        report.metacognitive.sensorySpec.abstract = extract([
            /(?:^|\n)\s*(?:[*+-]|\d\.)\s*\**Abstract/i,
        ]);
        report.metacognitive.sensorySpec.techSpec = extract([
            /(?:^|\n)\s*(?:[*+-]|\d\.)\s*\**(?:→\s*)?(?:Tech Spec|Technical Spec)/i,
        ]);

        // 2. Spatial
        report.spatial.geometry = extract([
            /Geom(?:etry)?/i,
        ]);
        report.spatial.materiality = extract([
            /Material(?:ity)?/i,
        ]);
        report.spatial.spaceHierarchy = extract([
            /Space(?: Hierarchy)?/i,
        ]);

        // 3. Execution Prompt
        const promptMatch = markdown.match(/```(?:\w+)?\n([\s\S]*?)\n```/);
        if (promptMatch) {
            report.execution.prompt = promptMatch[1].trim();
        } else {
            const sectionMatch = markdown.match(/## 3. Final Execution Prompt.*?\n([\s\S]*?)(?=##|$)/);
            report.execution.prompt = sectionMatch ? sectionMatch[1].trim() : '';
        }

        // 4. Verification
        report.verification.imperfection = extract([
            /(?:^|\n)\s*(?:[*+-]|\d\.)\s*\**Imperfection(?: Injection)?/i,
        ]);
        report.verification.optical = extract([
            /(?:^|\n)\s*(?:[*+-]|\d\.)\s*\**Optical Verification/i,
        ]);

        // 5. Refinement
        report.refinement.optionA = extract([
            /(?:^|\n)\s*(?:[*+-]|\d\.)\s*\**Option A/i,
        ]);
        report.refinement.optionB = extract([
            /(?:^|\n)\s*(?:[*+-]|\d\.)\s*\**Option B/i,
        ]);

    } catch (e) {
        console.error("Failed to parse report:", e);
    }

    return report;
};
