import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { rawNotes, image } = await req.json()

    if (!rawNotes && !image) {
      throw new Error('rawNotes or an image report is required.')
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured in Edge Function secrets.')
    }

    const systemPrompt = `You are an expert Medical AI Scribe. 
Your task is to take unstructured doctor dictation AND/OR an attached medical report (prescription/lab results) and convert it into a structured, formal clinical note.
Extract the following:
1. Chief Complaint (a concise summary of why they are visiting)
2. Clinical Observations (list of symptoms or key findings mentioned)
3. Provisional Diagnosis (if implied or explicitly stated)
4. Medications (An array of objects: { medicine, dosage, duration, instructions })
5. Advice & Follow-up (General advice, tests ordered, or follow-up timelines)

OUTPUT FORMAT: Return ONLY valid JSON matching this exact structure:
{
  "chiefComplaint": "...",
  "observations": ["...", "..."],
  "diagnosis": "...",
  "medications": [
    { "medicine": "...", "dosage": "...", "duration": "...", "instructions": "..." }
  ],
  "advice": "...",
  "followup": "..."
}
Do not include any markdown formatting or extra text.`;

    const contents = [{
        role: "user",
        parts: []
    }];

    if (image && image.base64 && image.mimeType) {
        contents[0].parts.push({
            inlineData: {
                mimeType: image.mimeType,
                data: image.base64
            }
        });
    }

    contents[0].parts.push({
        text: systemPrompt + "\n\nDoctor Dictation / Raw Notes: " + (rawNotes || "[No dictation provided]")
    });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: contents,
            generationConfig: {
                responseMimeType: "application/json"
            }
        })
    });

    const llmData = await response.json();
    if (!llmData.candidates || llmData.candidates.length === 0) {
        console.error("LLM API Error:", llmData);
        throw new Error('Failed to generate structured notes from LLM.');
    }

    const aiResponseText = llmData.candidates[0].content.parts[0].text;
    const parsedResponse = JSON.parse(aiResponseText);

    return new Response(
      JSON.stringify(parsedResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in doctor-notes function:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
