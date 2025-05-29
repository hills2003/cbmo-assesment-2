import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const runtime = 'edge'; // or remove this line if using node runtime

export async function POST(req) {
  const { message } = await req.json();

  try{
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.7,
      },
    });

    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: message }] }],
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          controller.enqueue(encoder.encode(`data: ${text}\n\n`));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Gemini API Error:', error?.message || error);
    return new Response(JSON.stringify({ error: 'Sorry, our AI assistant is currently unavailable. Please try again shortly.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
