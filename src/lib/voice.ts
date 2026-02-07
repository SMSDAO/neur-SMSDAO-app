/**
 * Real-time Voice Conversation System
 * Enables voice interactions with the AI agent
 */

export interface VoiceConfig {
  language: string;
  voice?: string;
  speed?: number;
  pitch?: number;
}

export interface VoiceTranscription {
  text: string;
  confidence: number;
  language: string;
  duration: number;
}

export interface VoiceResponse {
  text: string;
  audioUrl?: string;
  duration?: number;
}

/**
 * Convert speech to text using Web Speech API or external service
 */
export async function speechToText(
  audioBlob: Blob,
  config: VoiceConfig = { language: 'en-US' },
): Promise<VoiceTranscription | null> {
  try {
    // Check if using OpenAI Whisper
    if (process.env.OPENAI_API_KEY) {
      return await transcribeWithWhisper(audioBlob, config);
    }

    // Fallback to browser's Web Speech API (handled on client side)
    return {
      text: '',
      confidence: 0,
      language: config.language,
      duration: 0,
    };
  } catch (error) {
    console.error('Error converting speech to text:', error);
    return null;
  }
}

/**
 * Transcribe audio using OpenAI Whisper
 */
async function transcribeWithWhisper(
  audioBlob: Blob,
  config: VoiceConfig,
): Promise<VoiceTranscription | null> {
  try {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', config.language.split('-')[0]); // e.g., 'en' from 'en-US'

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Whisper API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      text: data.text,
      confidence: 1.0, // Whisper doesn't provide confidence scores
      language: config.language,
      duration: data.duration || 0,
    };
  } catch (error) {
    console.error('Error transcribing with Whisper:', error);
    return null;
  }
}

/**
 * Convert text to speech using OpenAI TTS or browser API
 */
export async function textToSpeech(
  text: string,
  config: VoiceConfig = { language: 'en-US', voice: 'alloy' },
): Promise<VoiceResponse> {
  try {
    // Check if using OpenAI TTS
    if (process.env.OPENAI_API_KEY) {
      return await synthesizeWithOpenAI(text, config);
    }

    // Fallback to browser's Speech Synthesis API (handled on client side)
    return {
      text,
    };
  } catch (error) {
    console.error('Error converting text to speech:', error);
    return {
      text,
    };
  }
}

/**
 * Synthesize speech using OpenAI TTS
 * Returns the blob directly to allow caller to manage cleanup
 */
async function synthesizeWithOpenAI(
  text: string,
  config: VoiceConfig,
): Promise<VoiceResponse> {
  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: config.voice || 'alloy', // alloy, echo, fable, onyx, nova, shimmer
        speed: config.speed || 1.0,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI TTS error: ${response.status}`);
    }

    // Get audio blob
    const audioBlob = await response.blob();
    
    // Create object URL - caller is responsible for cleanup
    // Remember to call URL.revokeObjectURL(url) when done
    const audioUrl = URL.createObjectURL(audioBlob);

    return {
      text,
      audioUrl,
    };
  } catch (error) {
    console.error('Error synthesizing with OpenAI:', error);
    return {
      text,
    };
  }
}

/**
 * Start a real-time voice conversation session
 */
export class VoiceConversationSession {
  private isListening: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private config: VoiceConfig;

  constructor(config: VoiceConfig = { language: 'en-US' }) {
    this.config = config;
  }

  /**
   * Start listening for voice input
   */
  async startListening(
    onTranscription: (transcription: VoiceTranscription) => void,
  ): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const transcription = await speechToText(audioBlob, this.config);
        
        if (transcription) {
          onTranscription(transcription);
        }
      };

      this.mediaRecorder.start();
      this.isListening = true;
    } catch (error) {
      console.error('Error starting voice listening:', error);
      throw error;
    }
  }

  /**
   * Stop listening for voice input
   */
  stopListening(): void {
    if (this.mediaRecorder && this.isListening) {
      this.mediaRecorder.stop();
      this.isListening = false;
      
      // Stop all audio tracks
      this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
  }

  /**
   * Speak a response
   */
  async speak(text: string): Promise<void> {
    const response = await textToSpeech(text, this.config);
    
    if (response.audioUrl) {
      try {
        // Play the audio
        const audio = new Audio(response.audioUrl);
        
        // Handle playback errors (e.g., autoplay blocked)
        await audio.play().catch((error) => {
          console.error('Audio playback failed:', error);
          throw error;
        });
        
        // Clean up object URL after playback
        audio.addEventListener('ended', () => {
          URL.revokeObjectURL(response.audioUrl!);
        });
        
        // Also clean up if there's an error
        audio.addEventListener('error', () => {
          URL.revokeObjectURL(response.audioUrl!);
        });
      } catch (error) {
        // Clean up on error
        if (response.audioUrl) {
          URL.revokeObjectURL(response.audioUrl);
        }
        throw error;
      }
    }
  }

  /**
   * Check if currently listening
   */
  isActive(): boolean {
    return this.isListening;
  }
}

/**
 * Process a voice command
 */
export async function processVoiceCommand(
  transcription: string,
): Promise<{ success: boolean; response: string; action?: any }> {
  try {
    // Parse the transcription to identify intent
    // Execute the appropriate action
    // Generate a response

    return {
      success: true,
      response: 'Voice command processing requires integration with the chat system',
    };
  } catch (error) {
    console.error('Error processing voice command:', error);
    return {
      success: false,
      response: 'Failed to process voice command',
    };
  }
}
