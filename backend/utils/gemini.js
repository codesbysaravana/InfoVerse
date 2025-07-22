import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from parent directory's .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateStreamingResponse(query, context = [], conversationHistory = []) {
  try {
    const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-pro-latest" });
    
    // Create chat history context
    const historyContext = conversationHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    // Prepare prompt with context and history
    const prompt = `You are an AI assistant analyzing real-time data from various sources.
    Provide concise, informative responses based on the available context.
    If asked about recent events or trends, focus on the provided source data.
    
    Previous conversation:
    ${historyContext}

    Current sources:
    ${context.join('\n')}

    User query: ${query}

    Response (be natural and conversational):`;

    // Log the stream request details
    console.log('\n=== Chat Stream Request Log ===');
    console.log('Query:', query);
    console.log('Context:', context);
    console.log('History:', conversationHistory);
    console.log('Stream started at:', new Date().toISOString());
    console.log('=============================\n');

    const result = await model.generateContentStream([
      {
        role: 'user',
        parts: [{ text: prompt }],
      }
    ]);
    
    console.log('Stream generation successful');
    return result;
  } catch (error) {
    console.error('Gemini API streaming error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      details: error.details || 'No additional details'
    });
    throw error; // Throw the original error to preserve the stack trace
  }
}

export async function generateResponse(query, context = [], conversationHistory = []) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    // Create chat history context
    const historyContext = conversationHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    // Prepare prompt with context and history
    const prompt = `You are an AI assistant analyzing real-time data from various sources.
    Provide concise, informative responses based on the available context.
    If asked about recent events or trends, focus on the provided source data.
    
    Previous conversation:
    ${historyContext}

    Current sources:
    ${context.join('\n')}

    User query: ${query}

    Response (be natural and conversational):`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    
    // Log the full chat context and response
    console.log('\n=== Chat Response Log ===');
    console.log('Query:', query);
    console.log('Context:', context);
    console.log('History:', conversationHistory);
    console.log('Response:', responseText);
    console.log('=======================\n');
    
    return responseText;
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to generate response: ' + error.message);
  }
}

export async function analyzeSourceRelevance(source, query) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `Given the following source content and user query, rate the relevance from 0 to 1:
    
    Source: ${source}
    Query: ${query}
    
    Return only a number between 0 and 1.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const relevance = parseFloat(response.text());
    
    return isNaN(relevance) ? 0 : relevance;
  } catch (error) {
    console.error('Relevance analysis error:', error);
    return 0;
  }
}

export default {
  generateResponse,
  analyzeSourceRelevance
};
