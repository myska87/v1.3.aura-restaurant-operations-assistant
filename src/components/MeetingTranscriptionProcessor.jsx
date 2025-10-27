/**
 * AURA Meeting Transcription Processor
 * AI-powered transcription, summarization, and action extraction
 */

import { base44 } from '@/api/base44Client';
import CoreDB from './CoreDB';

class MeetingTranscriptionProcessor {
  constructor() {
    this.processingQueue = [];
  }

  /**
   * Process a meeting recording end-to-end
   */
  async processMeeting(meetingId) {
    console.log('[TranscriptionProcessor] Starting processing for meeting:', meetingId);

    try {
      // Get meeting record
      const meetings = await base44.entities.MeetingRecording.list();
      const meeting = meetings.find(m => m.id === meetingId);
      
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      // Step 1: Transcribe audio
      await this.updateStatus(meetingId, 'transcribing', 10);
      const transcription = await this.transcribeAudio(meeting.audio_url);
      
      await base44.entities.MeetingRecording.update(meetingId, {
        transcribed_text: transcription.text,
        speaker_diarization: transcription.speakers || [],
        processing_progress: 40
      });

      // Step 2: Generate summary
      await this.updateStatus(meetingId, 'summarizing', 50);
      const summary = await this.generateSummary(transcription.text);
      
      await base44.entities.MeetingRecording.update(meetingId, {
        summary: summary.summary,
        key_topics: summary.topics,
        decisions_made: summary.decisions,
        sentiment: summary.sentiment,
        processing_progress: 70
      });

      // Step 3: Extract action items
      await this.updateStatus(meetingId, 'summarizing', 80);
      const actions = await this.extractActionItems(transcription.text, meeting);
      
      await base44.entities.MeetingRecording.update(meetingId, {
        action_items: actions,
        processing_progress: 90
      });

      // Step 4: Create action records and integrate with modules
      await this.createActionRecords(meetingId, actions, meeting);

      // Step 5: Detect attendees (if speaker diarization available)
      if (transcription.speakers && transcription.speakers.length > 0) {
        await this.detectAttendees(meetingId, transcription.speakers, meeting);
      }

      // Step 6: Mark as complete
      await this.updateStatus(meetingId, 'review_pending', 100);

      // Send notification to creator
      await this.notifyManagerReviewReady(meeting);

      console.log('[TranscriptionProcessor] Meeting processing complete:', meetingId);

      return {
        success: true,
        meeting_id: meetingId,
        actions_created: actions.length
      };

    } catch (error) {
      console.error('[TranscriptionProcessor] Error processing meeting:', error);
      
      await base44.entities.MeetingRecording.update(meetingId, {
        status: 'review_pending',
        processing_progress: 0,
        notes: `Processing error: ${error.message}`
      });

      throw error;
    }
  }

  /**
   * Transcribe audio using AI
   */
  async transcribeAudio(audioUrl) {
    try {
      console.log('[TranscriptionProcessor] Transcribing audio:', audioUrl);

      // Use LLM with file input for transcription
      // In production, you'd use Whisper API or Deepgram
      const prompt = `
You are an expert meeting transcriptionist. 
Transcribe the following audio file into a clear, structured format.

Include:
- Full transcription with timestamps
- Speaker identification if multiple voices detected
- Key discussion points

Audio file: ${audioUrl}
      `.trim();

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: audioUrl,
        response_json_schema: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            speakers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  speaker_id: { type: 'string' },
                  speaker_name: { type: 'string' },
                  segments: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        start_time: { type: 'number' },
                        end_time: { type: 'number' },
                        text: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      return result;

    } catch (error) {
      console.error('[TranscriptionProcessor] Transcription error:', error);
      
      // Fallback: return placeholder
      return {
        text: 'Transcription processing...',
        speakers: []
      };
    }
  }

  /**
   * Generate AI summary
   */
  async generateSummary(transcription) {
    const prompt = `
Analyze this meeting transcription and provide:

1. **Summary** (2-3 concise paragraphs covering main discussion points)
2. **Key Topics** (list of 3-5 main topics discussed: hygiene, staffing, supplies, training, etc.)
3. **Decisions Made** (list of concrete decisions)
4. **Sentiment** (overall tone: positive, neutral, urgent, or concerned)

Transcription:
${transcription}
    `.trim();

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          topics: {
            type: 'array',
            items: { type: 'string' }
          },
          decisions: {
            type: 'array',
            items: { type: 'string' }
          },
          sentiment: {
            type: 'string',
            enum: ['positive', 'neutral', 'urgent', 'concerned']
          }
        }
      }
    });

    return result;
  }

  /**
   * Extract action items from transcription
   */
  async extractActionItems(transcription, meeting) {
    const prompt = `
Extract action items from this meeting transcription.

For each action item, provide:
- description: what needs to be done
- assigned_to: person responsible (if mentioned, otherwise "Manager" or "Team")
- due_date: when it's due (if mentioned, estimate based on urgency)
- priority: low, medium, high, or urgent
- linked_module: which system it relates to (tasks, hygiene, forms, inventory, maintenance, training, compliance, or none)

Current date: ${new Date().toISOString().split('T')[0]}
Meeting type: ${meeting.meeting_type}
Department: ${meeting.department || 'General'}

Transcription:
${transcription}
    `.trim();

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          actions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                assigned_to: { type: 'string' },
                due_date: { type: 'string', format: 'date' },
                priority: {
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'urgent']
                },
                linked_module: {
                  type: 'string',
                  enum: ['tasks', 'hygiene', 'forms', 'inventory', 'maintenance', 'training', 'compliance', 'none']
                }
              }
            }
          }
        }
      }
    });

    return result.actions || [];
  }

  /**
   * Create MeetingAction records and integrate with modules
   */
  async createActionRecords(meetingId, actions, meeting) {
    for (const action of actions) {
      try {
        // Find staff member by name
        const allStaff = await base44.entities.User.list();
        const assignedStaff = allStaff.find(s => 
          s.full_name?.toLowerCase().includes(action.assigned_to?.toLowerCase())
        );

        const actionRecord = await base44.entities.MeetingAction.create({
          meeting_id: meetingId,
          meeting_title: meeting.title,
          action_description: action.description,
          action_type: 'task',
          assigned_to_email: assignedStaff?.email || meeting.created_by,
          assigned_to_name: assignedStaff?.full_name || action.assigned_to,
          due_date: action.due_date,
          priority: action.priority,
          status: 'pending',
          linked_module: action.linked_module,
          auto_created: true,
          confidence_score: 85
        });

        // Create task in relevant module via DataBridge
        if (action.linked_module === 'tasks') {
          await base44.entities.AutoGeneratedTask.create({
            task_name: action.description,
            description: `From meeting: ${meeting.title}`,
            assigned_to_email: assignedStaff?.email || meeting.created_by,
            assigned_to_name: assignedStaff?.full_name || action.assigned_to,
            role: assignedStaff?.position || 'staff',
            department: meeting.department || 'general',
            shift_date: action.due_date,
            priority: action.priority,
            status: 'pending',
            created_automatically: true,
            task_type: 'daily',
            notes: `Action item from meeting: ${meeting.title}`
          });

          // Update action with link
          await base44.entities.MeetingAction.update(actionRecord.id, {
            linked_record_id: actionRecord.id
          });
        }

        // Send notification to assigned staff
        await base44.entities.TaskNotification.create({
          notification_type: 'task_completed',
          recipient_email: assignedStaff?.email || meeting.created_by,
          recipient_name: assignedStaff?.full_name || action.assigned_to,
          title: 'New Action from Meeting',
          message: `You've been assigned: ${action.description}`,
          priority: action.priority === 'urgent' ? 'urgent' : 'info'
        });

      } catch (error) {
        console.error('[TranscriptionProcessor] Error creating action:', error);
      }
    }
  }

  /**
   * Detect attendees from speaker diarization
   */
  async detectAttendees(meetingId, speakers, meeting) {
    const allStaff = await base44.entities.User.list();

    for (const speaker of speakers) {
      // Try to match speaker name to staff
      const matchedStaff = allStaff.find(s => 
        speaker.speaker_name && 
        s.full_name?.toLowerCase().includes(speaker.speaker_name.toLowerCase())
      );

      if (matchedStaff) {
        await base44.entities.MeetingAttendee.create({
          meeting_id: meetingId,
          meeting_title: meeting.title,
          staff_id: matchedStaff.id,
          staff_email: matchedStaff.email,
          staff_name: matchedStaff.full_name,
          role: matchedStaff.position,
          department: matchedStaff.department,
          attendance_status: 'present',
          detected_by_voice: true,
          contribution_count: speaker.segments?.length || 0
        });
      }
    }
  }

  /**
   * Update meeting status
   */
  async updateStatus(meetingId, status, progress) {
    await base44.entities.MeetingRecording.update(meetingId, {
      status,
      processing_progress: progress
    });
  }

  /**
   * Notify manager that notes are ready for review
   */
  async notifyManagerReviewReady(meeting) {
    await base44.entities.TaskNotification.create({
      notification_type: 'task_completed',
      recipient_email: meeting.created_by,
      recipient_name: meeting.created_by_name,
      title: 'Meeting Notes Ready',
      message: `Your meeting "${meeting.title}" has been transcribed and summarized. Please review and approve.`,
      priority: 'info'
    });
  }
}

// Export singleton instance
const transcriptionProcessor = new MeetingTranscriptionProcessor();
export default transcriptionProcessor;