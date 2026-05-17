import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests from the browser
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { symptoms, location } = await req.json()

    if (!symptoms) {
      throw new Error('Symptoms description is required.')
    }

    // Securely retrieve the API key from Supabase Secrets
    // This key is invisible to the frontend and GitHub
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

    if (!GEMINI_API_KEY) {
      throw new Error('LLM API key not configured in Edge Function secrets.')
    }

    // ==========================================
    // 1. SAFETY LAYER: Hardcoded Emergency Check
    // ==========================================
    const emergencyKeywords = ['chest pain', 'heart attack', 'breathing', 'saans', 'stroke', 'bleeding', 'unconscious', 'paralysis'];
    const isEmergency = emergencyKeywords.some(kw => symptoms.toLowerCase().includes(kw));
    
    if (isEmergency) {
      return new Response(
        JSON.stringify({
          isEmergency: true,
          emergencyMessage: "⚠️ EMERGENCY DETECTED: These symptoms may require urgent medical attention. Please call emergency services (112) or visit the nearest hospital immediately.",
          suggestedOpd: null,
          explanation: null,
          matchedHospitals: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ==========================================
    // 2. PREPARE THE LLM PROMPT
    // ==========================================
    const systemPrompt = `
You are the Curaah AI Health Assistant. Your goal is to guide patients to the correct OPD (Outpatient Department) based on their symptoms.
You MUST NOT diagnose. You MUST NOT prescribe medicine. 
If the patient input is in Hindi or Punjabi, your explanation MUST be in that same language.

Based on the patient's symptoms, output a JSON response matching EXACTLY this schema without markdown formatting:
{
  "isEmergency": boolean,
  "suggestedOpd": string (e.g., "General Medicine", "Eye (Ophthalmology)", "Orthopaedics", "Cardiology", "Neurology", "Pediatrics", "Gynecology", "ENT"),
  "urgencyLevel": string ("Routine", "Urgent", "Emergency"),
  "explanation": string (A very brief, simple explanation of why this OPD is suggested. Keep it under 2 sentences.)
}
`

    // ==========================================
    // 3. CALL THE LLM API (Google Gemini)
    // ==========================================
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: systemPrompt + "\n\nPatient Symptoms: " + symptoms }]
        }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    })

    const llmData = await response.json()
    
    if (!llmData.candidates || llmData.candidates.length === 0) {
      console.error("LLM API Error:", llmData)
      throw new Error('Failed to generate response from LLM.')
    }

    const aiResponseText = llmData.candidates[0].content.parts[0].text
    const parsedResponse = JSON.parse(aiResponseText)

    // Secondary safety check triggered by LLM evaluation
    if (parsedResponse.isEmergency || parsedResponse.urgencyLevel === 'Emergency') {
      return new Response(
        JSON.stringify({
          isEmergency: true,
          emergencyMessage: "⚠️ EMERGENCY DETECTED: These symptoms may require urgent medical attention. Please call emergency services (112) or visit the nearest hospital immediately.",
          suggestedOpd: null,
          explanation: null,
          matchedHospitals: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ==========================================
    // 4. DATABASE LOOKUP (Hospitals)
    // ==========================================
    // In a full production scenario, we would initialize the Supabase client here 
    // and query the 'hospitals' and 'appointment_slots' tables based on 'suggestedOpd' and 'location'.
    // For now, we mock the database return format expected by the frontend.
    const mockHospitals = [
      {
        id: 'mock-uuid-1',
        name: 'Curaah Demo Hospital',
        doctor: 'Dr. Available Specialist',
        availableSlots: 5
      }
    ];

    // ==========================================
    // 5. RETURN STRUCTURED OUTPUT TO FRONTEND
    // ==========================================
    const finalResult = {
      isEmergency: false,
      emergencyMessage: null,
      suggestedOpd: parsedResponse.suggestedOpd || 'General Medicine',
      explanation: parsedResponse.explanation || 'Please consult General Medicine for an initial checkup.',
      matchedHospitals: mockHospitals
    }

    return new Response(
      JSON.stringify(finalResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in health-assistant-logic:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
