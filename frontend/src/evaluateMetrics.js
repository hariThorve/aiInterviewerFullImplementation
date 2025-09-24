/**
 * AI Interview Evaluation Module
 * 
 * This module handles the evaluation of interview transcripts using AI.
 * It uses the Groq API with Llama 3.3 70B model to analyze candidate responses
 * and provide structured feedback across multiple dimensions.
 * 
 * Evaluation Criteria:
 * - Clarity: How clear and understandable the responses are
 * - Problem Solving: Ability to approach and solve problems
 * - Communication: Effectiveness of communication skills
 * - Confidence: Level of confidence in responses
 * - Technical Correctness: Accuracy of technical knowledge
 * 
 * @param {string} transcript - Formatted interview transcript
 * @returns {Promise<Object>} Evaluation results with scores and feedback
 * 
 * @author AI Interview Platform Team
 * @version 1.0.0
 */

import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

/**
 * Evaluates interview transcript using AI
 * @param {string} transcript - The formatted interview transcript
 * @returns {Promise<string>} JSON string containing evaluation results
 */
export default async function evaluateInterview(transcript) {
  // System instructions for the AI evaluator
  const systemInstructions = `
    You are an expert interview evaluator. You will be given an array of messages from an interview transcript. Each message has a "role" (either "user" for candidate or "assistant" for interviewer) and a "text".

Your task:
1. Read the transcript carefully.
2. Focus only on the candidate's answers (role: "user").
3. Evaluate the candidate on these dimensions:
   - Clarity (1–10)
   - Problem Solving Ability (1–10)
   - Communication Skills (1–10)
   - Confidence (1–10)
   - Technical Correctness (1–10)
4. Provide a short summary of overall performance, strengths, and areas for improvement.
5. Output strictly in JSON format:

{
  "clarity": number,
  "problemSolving": number,
  "communication": number,
  "confidence": number,
  "technical": number,
  "overallFeedback": "string"
}

Do not include any text outside of the JSON.
`;

  // User prompt with the actual transcript
  const prompt = `
Here is the interview transcript:
---
${transcript}
---

// Evaluate it.

Criteria:
1. clarity
2. problem solving
3. communication skills
4. confidence
5. technical correctness

Give numeric scores from 1 (poor) to 10 (excellent) for each.

Provide overall feedback summarizing strengths and areas for improvement.
`;

  // Initialize Groq model with Llama 3.3 70B
  const model = new ChatGroq({
    apiKey: import.meta.env.VITE_GROQ_API, // API key from environment variables
    model: "llama-3.3-70b-versatile", // Using Llama 3.3 70B for high-quality evaluation
    temperature: 0, // Low temperature for consistent, deterministic results
  });

  // Prepare messages for the AI model
  const messages = [
    new SystemMessage(systemInstructions), // System prompt with evaluation criteria
    new HumanMessage(prompt), // User prompt with transcript
  ];

  // Invoke the AI model and get evaluation results
  const result = await model.invoke(messages);
  console.log(result.content); // Log results for debugging
  return result.content; // Return the evaluation results
}
