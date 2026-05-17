/**
 * AI Service Module
 * Handles interactions between the frontend and the AI logic layer.
 *
 * NOTE: To prevent exposing API keys (Sarvam AI, Gemini, etc.), these functions 
 * are designed to call Supabase Edge Functions. The Edge Functions will securely 
 * hold the API keys and perform the actual LLM and Speech-to-Text calls.
 */

import { supabase } from './supabase.js';

export const AIService = {

  /**
   * Converts patient voice audio (Blob) to text using Sarvam AI via Edge Function.
   * Supports Hindi, Punjabi, and English.
   * 
   * @param {Blob} audioBlob - The WebM audio blob from MediaRecorder
   * @returns {Promise<string>} - The transcribed text
   */
  async processAudioToText(audioBlob) {
    console.log('[AI Service] Sending audio to Speech-to-Text service...');

    try {
      const base64Audio = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      // Calls Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('sarvam-speech-to-text', {
        body: { audio_base64: base64Audio }
      });

      if (error) throw error;

      console.log('[AI Service] Transcription success:', data.transcript);
      return data.transcript;
    } catch (err) {
      console.error('AIService Transcription Error:', err);
      throw err;
    }
  },

  /**
   * Analyzes patient symptoms and returns structured healthcare guidance or a follow-up question.
   * 
   * @param {string} symptomText - The transcribed or typed symptom description
   * @param {string} userCity - (Optional) Patient's city to filter nearby hospitals
   * @param {Array} chatHistory - (Optional) The conversation history array
   * @param {Object} imagePayload - (Optional) Image attachment {base64, mimeType}
   * @returns {Promise<Object>} - Structured JSON containing guidance or question
   */
  async analyzeSymptoms(symptomText, userCity = null, chatHistory = [], imagePayload = null) {
    console.log('[AI Service] Analyzing symptoms:', symptomText);

    try {
      const { data, error } = await supabase.functions.invoke('health-assistant-logic', {
        body: {
          symptoms: symptomText,
          location: userCity,
          chatHistory: chatHistory,
          imagePayload: imagePayload
        }
      });

      if (error) throw error;

      /* Expected structured response from the Edge Function:
        {
          isEmergency: boolean,
          emergencyMessage: string | null,
          suggestedOpd: string,
          explanation: string,
          matchedHospitals: [
            {
              id: 'uuid',
              name: 'Demo Hospital',
              doctor: 'Dr. Suresh Kumar',
              availableSlots: 3
            }
          ]
        }
      */
      return data;
    } catch (err) {
      console.error('[AI Service] Analysis error:', err);
      throw new Error('Our AI assistant is temporarily unavailable. Please browse hospitals manually.');
    }
  },

  /**
   * Phase 2 & 3: Doctor AI Assistant
   * Sends unstructured doctor dictation and/or lab reports to the LLM to get structured clinical notes.
   * @param {string} rawNotes - The unstructured dictation
   * @param {Object} image - Optional base64 image object {base64, mimeType}
   * @returns {Promise<Object>} - The structured JSON notes
   */
  async generateDoctorNotes(rawNotes, image = null) {
    try {
      const { data, error } = await supabase.functions.invoke('doctor-notes', {
        body: { rawNotes, image }
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('AIService Doctor Notes Error:', err);
      throw err;
    }
  }
};
