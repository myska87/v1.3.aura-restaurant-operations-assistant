/**
 * AURA Transcription Processor
 * Handles AI transcription and analysis
 */

import { base44 } from '@/api/base44Client';

class TranscriptionProcessor {
  async processAudio(audioFile, meetingId) {
    console.log('[TranscriptionProcessor] Starting transcription for meeting:', meetingId);

    try {
      // Step 1: Upload audio file
      let audioUrl;
      if (typeof audioFile === 'string') {
        audioUrl = audioFile; // Already uploaded
      } else {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: audioFile });
        audioUrl = file_url;
      }

      // Update meeting status
      await base44.entities.MeetingRecording.update(meetingId, {
        audio_url: audioUrl,
        status: 'transcribing',
        processing_progress: 10
      });

      // Step 2: Transcribe audio using AI
      const transcription = await this.transcribeAudio(audioUrl);
      
      await base44.entities.MeetingRecording.update(meetingId, {
        transcribed_text: transcription.full_text,
        speaker_segments: transcription.segments,
        status: 'summarizing',
        processing_progress: 50
      });

      // Step 3: Generate summary and extract insights
      const analysis = await this.analyzeTranscription(transcription.full_text);
      
      await base44.entities.MeetingRecording.update(meetingId, {
        summary: analysis.summary,
        key_points: analysis.key_points,
        topics_discussed: analysis.topics,
        sentiment: analysis.sentiment,
        status: 'pending_review',
        processing_progress: 80
      });

      // Step 4: Extract action items
      const actions = await this.extractActions(transcription.full_text, meetingId);
      
      await base44.entities.MeetingRecording.update(meetingId, {
        action_items: actions,
        status: 'pending_review',
        processing_progress: 100
      });

      console.log('[TranscriptionProcessor] Transcription complete');
      
      return {
        success: true,
        transcription,
        analysis,
        actions
      };
      
    } catch (error) {
      console.error('[TranscriptionProcessor] Error:', error);
      
      await base44.entities.MeetingRecording.update(meetingId, {
        status: 'processing_failed',
        processing_progress: 0
      });
      
      throw error;
    }
  }

  async transcribeAudio(audioUrl) {
    // Use AI to transcribe audio
    const prompt = `
Transcribe the following audio file. Include speaker diarization if possible.
Return the transcript in JSON format with:
- full_text: complete transcription
- segments: array of {speaker_id, speaker_name (if detected), start_time, end_time, text}
`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [audioUrl],
      response_json_schema: {
        type: "object",
        properties: {
          full_text: { type: "string" },
          segments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                speaker_id: { type: "string" },
                speaker_name: { type: "string" },
                start_time: { type: "number" },
                end_time: { type: "number" },
                text: { type: "string" }
              }
            }
          }
        }
      }
    });

    return result;
  }

  async analyzeTranscription(text) {
    const prompt = `
Analyze this meeting transcript and provide:

1. A concise summary (2-3 paragraphs)
2. Key discussion points (5-8 bullet points)
3. Topics discussed (categorize into: hygiene, hr, shift, supplies, menu, safety, training, compliance, other)
4. Overall sentiment (positive, neutral, concerned, urgent)

Transcript:
${text}

Return your analysis in JSON format.
`;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          key_points: { type: "array", items: { type: "string" } },
          topics: { type: "array", items: { type: "string" } },
          sentiment: { type: "string", enum: ["positive", "neutral", "concerned", "urgent"] }
        }
      }
    });

    return analysis;
  }

  async extractActions(text, meetingId) {
    const prompt = `
Extract all action items from this meeting transcript.
For each action, identify:
- description: what needs to be done
- assigned_to: who should do it (if mentioned, else "unassigned")
- due_date: when it should be done (if mentioned)
- priority: low/medium/high/urgent (based on language used)
- category: task/follow_up/decision/reminder/training/purchase/other

Transcript:
${text}

Return action items as JSON array.
`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          actions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: { type: "string" },
                assigned_to: { type: "string" },
                due_date: { type: "string" },
                priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                category: { type: "string" },
                confidence: { type: "number" }
              }
            }
          }
        }
      }
    });

    // Create MeetingAction records for each detected action
    const createdActions = [];
    
    for (const action of result.actions || []) {
      try {
        const actionRecord = await base44.entities.MeetingAction.create({
          meeting_id: meetingId,
          action_description: action.description,
          action_type: action.category || 'other',
          assigned_to_email: action.assigned_to === 'unassigned' ? null : action.assigned_to,
          due_date: action.due_date,
          priority: action.priority || 'medium',
          status: 'pending',
          auto_created: true,
          confidence_score: action.confidence || 75,
          verified_by_manager: false
        });
        
        createdActions.push(actionRecord);
      } catch (error) {
        console.error('Error creating action:', error);
      }
    }

    return createdActions;
  }

  async detectAttendees(segments) {
    // Extract unique speakers from segments
    const speakers = new Set();
    
    segments.forEach(segment => {
      if (segment.speaker_id) {
        speakers.add(segment.speaker_id);
      }
    });

    return Array.from(speakers).map((speakerId, index) => ({
      speaker_id: speakerId,
      speaker_label: `Speaker ${index + 1}`,
      total_speaking_time: this.calculateSpeakingTime(speakerId, segments)
    }));
  }

  calculateSpeakingTime(speakerId, segments) {
    return segments
      .filter(s => s.speaker_id === speakerId)
      .reduce((total, s) => total + (s.end_time - s.start_time), 0);
  }
}

export default new TranscriptionProcessor();