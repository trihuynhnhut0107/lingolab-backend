import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { AIRule } from "../entities/AIRule";
import {
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from "../exceptions/HttpException";

/**
 * Score response structure from the AI model for speaking
 */
export interface AIScoreResponse {
  overallBand: number;
  fluency: number;
  coherence: number;
  lexical: number;
  grammar: number;
  pronunciation: number;
  feedback: {
    strengths: string;
    issues: string;
    actions: string;
  };
}

/**
 * Score response structure from the AI model for writing
 */
export interface AIWritingScoreResponse {
  overallBand: number;
  task_achievement: number;
  coherence_cohesion: number;
  lexical: number;
  grammatical: number;
  feedback: {
    strengths: string;
    issues: string;
    actions: string;
  };
}

export class LangchainService {
  private model: ChatOpenAI;

  constructor() {
    this.model = new ChatOpenAI({
      modelName: "gpt-3.5-turbo",
      temperature: 0.7,
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Score an IELTS speaking transcript using the AI model with teacher-defined rules
   * @param transcript The student's speaking transcript
   * @param aiRule The AI rule configuration for scoring
   * @param additionalPrompt Optional additional instructions to append to the prompt
   */
  async scoreIELTSSpeaking(
    transcript: string,
    aiRule: AIRule,
    additionalPrompt?: string,
  ): Promise<AIScoreResponse> {
    // Create the prompt template with LangChain
    const promptTemplate =
      PromptTemplate.fromTemplate(`You are an IELTS Speaking examiner.

Use the official IELTS Speaking Public Band Descriptors.

Apply the following teacher-defined scoring rule:
- Fluency weight: {fluency_weight}
- Coherence weight: {coherence_weight}
- Lexical Resource weight: {lexical_weight}
- Grammatical Range & Accuracy weight: {grammar_weight}
- Pronunciation weight: {pronunciation_weight}
- Strictness multiplier: {strictness}

Rubric: {rubric_id}

Evaluate the student's performance based on the transcript below:

TRANSCRIPT:
{transcript}

IMPORTANT:
- Your scoring MUST follow IELTS criteria (bands 0-9).
- You MUST return JSON only.
- Do NOT include explanations outside JSON.
- Apply strictness by reducing each band slightly based on strictness value.
  - strictness 1.0 = normal scoring
  - strictness > 1.0 = stricter (reduce bands by (strictness - 1) * 0.5)
  - strictness < 1.0 = more lenient (increase bands proportionally)
- Ensure all band scores are between 0 and 9.
- Weights represent relative importance; use them to calibrate your assessment focus.

Return JSON with this exact structure:

{{
  "overallBand": number,
  "fluency": number,
  "coherence": number,
  "lexical": number,
  "grammar": number,
  "pronunciation": number,
  "feedback": {{
    "strengths": string,
    "issues": string,
    "actions": string
  }}
}}

{additional_instructions}`);

    // Parse the output as JSON
    const parser = new JsonOutputParser<AIScoreResponse>();

    // Create the chain
    const chain = promptTemplate.pipe(this.model).pipe(parser);

    // Format the weights from AIRule
    const weights = aiRule.weights as any;

    // Format additional instructions if provided
    const additionalInstructions = additionalPrompt
      ? `\n\nADDITIONAL INSTRUCTIONS:\n${additionalPrompt}`
      : "";

    // Execute the chain with the AI rule configuration
    const result = await chain.invoke({
      fluency_weight: weights.fluency,
      coherence_weight: weights.coherence,
      lexical_weight: weights.lexical,
      grammar_weight: weights.grammar,
      pronunciation_weight: weights.pronunciation || 0.2,
      strictness: aiRule.strictness,
      rubric_id: aiRule.rubricId,
      transcript,
      additional_instructions: additionalInstructions,
    });

    // Validate the response structure
    this.validateScoreResponse(result);

    return result as AIScoreResponse;
  }

  /**
   * Score an IELTS writing essay using the AI model with teacher-defined rules
   * @param essay The student's written essay
   * @param aiRule The AI rule configuration for scoring
   * @param additionalPrompt Optional additional instructions to append to the prompt
   */
  async scoreIELTSWriting(
    essay: string,
    aiRule: AIRule,
    additionalPrompt?: string,
  ): Promise<AIWritingScoreResponse> {
    // Create the prompt template with LangChain
    const promptTemplate =
      PromptTemplate.fromTemplate(`You are an IELTS Writing examiner.

Use the official IELTS Writing Public Band Descriptors.

Apply the following teacher-defined scoring rule:
- Task Achievement weight: {task_achievement_weight}
- Coherence and Cohesion weight: {coherence_cohesion_weight}
- Lexical Resource weight: {lexical_weight}
- Grammatical Range & Accuracy weight: {grammatical_weight}
- Strictness multiplier: {strictness}

Rubric: {rubric_id}

Evaluate the student's performance based on the essay below:

ESSAY:
{essay}

IMPORTANT:
- Your scoring MUST follow IELTS criteria (bands 0-9).
- You MUST return JSON only.
- Do NOT include explanations outside JSON.
- Apply strictness by reducing each band slightly based on strictness value.
  - strictness 1.0 = normal scoring
  - strictness > 1.0 = stricter (reduce bands by (strictness - 1) * 0.5)
  - strictness < 1.0 = more lenient (increase bands proportionally)
- Ensure all band scores are between 0 and 9.
- Weights represent relative importance; use them to calibrate your assessment focus.

Return JSON with this exact structure:

{{
  "overallBand": number,
  "task_achievement": number,
  "coherence_cohesion": number,
  "lexical": number,
  "grammatical": number,
  "feedback": {{
    "strengths": string,
    "issues": string,
    "actions": string
  }}
}}

{additional_instructions}`);

    // Parse the output as JSON
    const parser = new JsonOutputParser<AIWritingScoreResponse>();

    // Create the chain
    const chain = promptTemplate.pipe(this.model).pipe(parser);

    // Format the weights from AIRule
    const weights = aiRule.weights as any;

    // Format additional instructions if provided
    const additionalInstructions = additionalPrompt
      ? `\n\nADDITIONAL INSTRUCTIONS:\n${additionalPrompt}`
      : "";

    // Execute the chain with the AI rule configuration
    const result = await chain.invoke({
      task_achievement_weight: weights.task_achievement || 0.25,
      coherence_cohesion_weight: weights.coherence_cohesion || 0.25,
      lexical_weight: weights.lexical || 0.25,
      grammatical_weight: weights.grammatical || 0.25,
      strictness: aiRule.strictness,
      rubric_id: aiRule.rubricId,
      essay,
      additional_instructions: additionalInstructions,
    });

    // Validate the response structure
    this.validateWritingScoreResponse(result);

    return result as AIWritingScoreResponse;
  }

  /**
   * Validate that the score response has the required structure and valid values
   */
  private validateScoreResponse(response: any): void {
    const requiredFields = [
      "overallBand",
      "fluency",
      "coherence",
      "lexical",
      "grammar",
      "pronunciation",
      "feedback",
    ];

    for (const field of requiredFields) {
      if (!(field in response)) {
        throw new BadRequestException(
          `Missing required field in AI response: ${field}`,
        );
      }
    }

    // Validate band scores are between 0-9
    const bandFields = [
      "overallBand",
      "fluency",
      "coherence",
      "lexical",
      "grammar",
      "pronunciation",
    ];
    for (const field of bandFields) {
      const value = response[field];
      if (typeof value !== "number" || value < 0 || value > 9) {
        throw new BadRequestException(
          `Invalid band score for ${field}: ${value}. Must be between 0 and 9`,
        );
      }
    }

    // Validate feedback structure
    if (!response.feedback || typeof response.feedback !== "object") {
      throw new BadRequestException("Feedback must be an object");
    }

    const feedbackFields = ["strengths", "issues", "actions"];
    for (const field of feedbackFields) {
      if (typeof response.feedback[field] !== "string") {
        throw new BadRequestException(`Feedback.${field} must be a string`);
      }
    }
  }

  /**
   * Validate that the writing score response has the required structure and valid values
   */
  private validateWritingScoreResponse(response: any): void {
    const requiredFields = [
      "overallBand",
      "task_achievement",
      "coherence_cohesion",
      "lexical",
      "grammatical",
      "feedback",
    ];

    for (const field of requiredFields) {
      if (!(field in response)) {
        throw new BadRequestException(
          `Missing required field in AI response: ${field}`,
        );
      }
    }

    // Validate band scores are between 0-9
    const bandFields = [
      "overallBand",
      "task_achievement",
      "coherence_cohesion",
      "lexical",
      "grammatical",
    ];
    for (const field of bandFields) {
      const value = response[field];
      if (typeof value !== "number" || value < 0 || value > 9) {
        throw new BadRequestException(
          `Invalid band score for ${field}: ${value}. Must be between 0 and 9`,
        );
      }
    }

    // Validate feedback structure
    if (!response.feedback || typeof response.feedback !== "object") {
      throw new BadRequestException("Feedback must be an object");
    }

    const feedbackFields = ["strengths", "issues", "actions"];
    for (const field of feedbackFields) {
      if (typeof response.feedback[field] !== "string") {
        throw new BadRequestException(`Feedback.${field} must be a string`);
      }
    }
  }
}

export const langchainService = new LangchainService();
