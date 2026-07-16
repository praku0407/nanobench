import Groq from "groq-sdk";
import { NextResponse } from 'next/server';

// Initialize the new Groq Engine
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cpu, gpu, overall } = body;

    const prompt = `
  You are 'NANO-OS', a highly advanced, serene, and professional AI telemetry analyst. 
  The user just ran a computer hardware benchmark. 
  CPU Score: ${cpu}
  GPU Score: ${gpu}
  
  Write a short, 3-sentence analysis of their hardware. Speak in a calming, reassuring, and clinical tone. If their CPU score is very low compared to the GPU, gently explain that there is a bottleneck and offer supportive, constructive advice on how they might balance their system. Do not use sarcasm.
`;

    // Connect to Meta's Llama 3 model running on Groq silicon
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
    });

    const text = completion.choices[0]?.message?.content || "Analysis failed.";

    return NextResponse.json({ analysis: text });
  } catch (error) {
    console.error("Groq Engine Error:", error);
    return NextResponse.json({ error: "AI core offline." }, { status: 500 });
  }
}