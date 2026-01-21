import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import axios from "axios";
import { InternalServerErrorException } from "../exceptions/HttpException";

export interface AIScoreResponse {
  overallBand: number;
  fluency: number;
  coherence: number;
  lexical: number;
  grammar: number;
  pronunciation: number;
  transcript: string;
  feedback: {
    strengths: string;
    issues: string;
    actions: string;
  };
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set");
    }
    this.genAI = new GoogleGenerativeAI(apiKey || "");
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            overallBand: { type: SchemaType.NUMBER },
            fluency: { type: SchemaType.NUMBER },
            coherence: { type: SchemaType.NUMBER },
            lexical: { type: SchemaType.NUMBER },
            grammar: { type: SchemaType.NUMBER },
            pronunciation: { type: SchemaType.NUMBER },
            transcript: { type: SchemaType.STRING },
            feedback: {
              type: SchemaType.OBJECT,
              properties: {
                strengths: { type: SchemaType.STRING },
                issues: { type: SchemaType.STRING },
                actions: { type: SchemaType.STRING },
              },
              required: ["strengths", "issues", "actions"],
            },
          },
          required: [
            "overallBand",
            "fluency",
            "coherence",
            "lexical",
            "grammar",
            "pronunciation",
            "transcript",
            "feedback",
          ],
        },
      },
    });
  }

  async evaluateAudio(audioUrl: string, promptText?: string): Promise<AIScoreResponse> {
    try {
      // 1. Fetch audio buffer from URL
      const response = await axios.get(audioUrl, { responseType: "arraybuffer" });
      const audioBuffer = Buffer.from(response.data);
      const base64Audio = audioBuffer.toString("base64");

      // 2. Prepare Part
      const audioPart = {
        inlineData: {
          data: base64Audio,
          mimeType: "audio/mp3", // Assuming MP3, but Gemini is flexible. Ideally detect mime type.
        },
      };

      // 3. Prompt
      const prompt = `
        You are an expert IELTS Speaking examiner. Initialize strict grading.
        Listen to the student's response carefully.
        ${promptText ? `\nTask/Topic: "${promptText}"\n` : ""}
        Task:
        1. Transcribe the audio verbatim.
        2. Evaluate the speaking performance based on official IELTS Speaking criteria (Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation).
        3. Provide detailed feedback.
        
        Output must be strictly JSON matching the schema provided.
        Score from 0.0 to 9.0 (0.5 increments allowed).
      `;

      // 4. Generate Content
      const result = await this.model.generateContent([prompt, audioPart]);
      const responseText = result.response.text();
      
      const parsed = JSON.parse(responseText);
      return parsed as AIScoreResponse;
    } catch (error) {
      console.error("Gemini Evaluation Failed:", error);
      throw new InternalServerErrorException("Failed to evaluate audio with AI");
    }
  }
  async evaluateWriting(text: string, promptText: string): Promise<AIWritingScoreResponse> {
    try {
      const writingModel = this.genAI.getGenerativeModel({
        model: "gemini-flash-latest",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              overallBand: { type: SchemaType.NUMBER },
              taskResponse: { type: SchemaType.NUMBER },
              coherence: { type: SchemaType.NUMBER },
              lexical: { type: SchemaType.NUMBER },
              grammar: { type: SchemaType.NUMBER },
              feedback: {
                type: SchemaType.OBJECT,
                properties: {
                  strengths: { type: SchemaType.STRING },
                  issues: { type: SchemaType.STRING },
                  actions: { type: SchemaType.STRING },
                },
                required: ["strengths", "issues", "actions"],
              },
            },
            required: [
              "overallBand",
              "taskResponse",
              "coherence",
              "lexical",
              "grammar",
              "feedback",
            ],
          },
        },
      });

      const prompt = `
        You are an expert IELTS Writing examiner. Initialize strict grading.
        
        Topic/Prompt: "${promptText}"
        
        Student Submission:
        "${text}"
        
        Task:
        1. Evaluate the writing performance based on official IELTS Writing criteria (Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy).
        2. Provide detailed feedback.
        
        Output must be strictly JSON matching the schema provided.
        Score from 0.0 to 9.0 (0.5 increments allowed).
      `;

      const result = await writingModel.generateContent(prompt);
      const responseText = result.response.text();
      
      const parsed = JSON.parse(responseText);
      return parsed as AIWritingScoreResponse;
    } catch (error) {
      console.error("Gemini Writing Evaluation Failed:", error);
      throw new InternalServerErrorException("Failed to evaluate writing with AI");
    }
  }
}

export interface AIWritingScoreResponse {
  overallBand: number;
  taskResponse: number;
  coherence: number;
  lexical: number;
  grammar: number;
  feedback: {
    strengths: string;
    issues: string;
    actions: string;
  };
}

export const geminiService = new GeminiService();

