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
    const SARVAM_API_KEY = Deno.env.get('SARVAM_API_KEY')
    
    // Web Speech API fallback mockup if no key is configured
    if (!SARVAM_API_KEY) {
      return new Response(
        JSON.stringify({ transcript: "Simulated Sarvam AI Transcript - No API Key provided in Edge Functions." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { audio_base64 } = await req.json()

    if (!audio_base64) {
      throw new Error('audio_base64 is required.')
    }

    // Convert Base64 back to binary Buffer
    const binaryString = atob(audio_base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    let postDataStart = '--' + boundary + '\r\n';
    postDataStart += 'Content-Disposition: form-data; name="file"; filename="audio.webm"\r\n';
    postDataStart += 'Content-Type: audio/webm\r\n\r\n';
    
    const postDataEnd = '\r\n--' + boundary + '--\r\n';

    const startBytes = new TextEncoder().encode(postDataStart);
    const endBytes = new TextEncoder().encode(postDataEnd);

    const finalBuffer = new Uint8Array(startBytes.length + bytes.length + endBytes.length);
    finalBuffer.set(startBytes, 0);
    finalBuffer.set(bytes, startBytes.length);
    finalBuffer.set(endBytes, startBytes.length + bytes.length);

    const response = await fetch('https://api.sarvam.ai/speech-to-text-translate', {
        method: 'POST',
        headers: {
            'api-subscription-key': SARVAM_API_KEY,
            'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: finalBuffer
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Sarvam API Error: ${errorText}`);
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify({ transcript: data.transcript }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Sarvam STT Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
