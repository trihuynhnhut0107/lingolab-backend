import { SkillType, AttemptStatus } from "../enums";

/**
 * Attempt DTOs
 */

/**
 * @example {
 *   "learnerId": "learner-1",
 *   "assignmentId": "assignment-123"
 * }
 */
export class CreateAttemptDTO {
  /**
   * ID of the learner (must be enrolled in the assignment's class)
   */
  learnerId!: string;

  /**
   * ID of the assignment to attempt
   */
  assignmentId!: string;
}

/**
 * @example {
 *   "status": "SUBMITTED",
 *   "submittedAt": "2024-11-14T12:30:00Z"
 * }
 */
export class UpdateAttemptDTO {
  status?: AttemptStatus;
  startedAt?: Date;
  submittedAt?: Date;
}

/**
 * @example {
 *   "content": "This is my written response to the prompt..."
 * }
 */
export class SubmitAttemptDTO {
  /**
   * Content/transcript to be scored (text for writing, transcript for speaking)
   */
  content?: string;
}

/**
 * @example {
 *   "id": "attempt-123",
 *   "learnerId": "learner-1",
 *   "assignmentId": "assignment-123",
 *   "skillType": "SPEAKING",
 *   "status": "SUBMITTED",
 *   "createdAt": "2024-11-14T10:00:00Z",
 *   "startedAt": "2024-11-14T10:05:00Z",
 *   "submittedAt": "2024-11-14T10:10:00Z"
 * }
 */
export class AttemptResponseDTO {
  id!: string;
  learnerId!: string;
  assignmentId!: string;
  skillType!: SkillType;
  status!: AttemptStatus;
  createdAt!: Date;
  startedAt?: Date;
  submittedAt?: Date;
  scoredAt?: Date;
}

/**
 * @example {
 *   "id": "attempt-123",
 *   "assignmentId": "assignment-123",
 *   "skillType": "SPEAKING",
 *   "status": "SUBMITTED",
 *   "createdAt": "2024-11-14T10:00:00Z",
 *   "submittedAt": "2024-11-14T10:10:00Z"
 * }
 */
export class AttemptListDTO {
  id!: string;
  assignmentId!: string;
  skillType!: SkillType;
  status!: AttemptStatus;
  createdAt!: Date;
  submittedAt?: Date;
}

/**
 * Attempt with associated media, scores and feedback
 * @example {
 *   "id": "attempt-123",
 *   "learnerId": "learner-1",
 *   "assignmentId": "assignment-123",
 *   "skillType": "SPEAKING",
 *   "status": "SCORED",
 *   "assignmentTitle": "Speaking Practice: Memorable Journey",
 *   "assignmentDescription": "Describe a memorable journey...",
 *   "createdAt": "2024-11-14T10:00:00Z",
 *   "startedAt": "2024-11-14T10:05:00Z",
 *   "submittedAt": "2024-11-14T10:10:00Z",
 *   "scoredAt": "2024-11-14T11:00:00Z"
 * }
 */
export class AttemptDetailDTO extends AttemptResponseDTO {
  assignmentTitle?: string;
  assignmentDescription?: string;
  media?: AttemptMediaResponseDTO[];
  score?: AttemptScoreResponseDTO;
  feedbacks?: AttemptFeedbackResponseDTO[];
}

/**
 * Nested DTO for media files
 * @example {
 *   "id": "media-1",
 *   "mediaType": "AUDIO",
 *   "storageUrl": "https://storage.example.com/audio-123.mp3",
 *   "fileName": "audio-123.mp3",
 *   "duration": 120,
 *   "fileSize": 1024000,
 *   "mimeType": "audio/mpeg",
 *   "uploadedAt": "2024-11-14T10:05:00Z"
 * }
 */
export class AttemptMediaResponseDTO {
  id!: string;
  mediaType!: string;
  storageUrl!: string;
  fileName!: string;
  duration?: number;
  fileSize?: number;
  mimeType?: string;
  uploadedAt!: Date;
}

/**
 * Nested DTO for scores
 * @example {
 *   "id": "score-1",
 *   "scoreMetadata": {"fluency": 7, "pronunciation": 6.5, "lexical": 7.5, "grammar": 7},
 *   "overallBand": 7,
 *   "feedback": "Good fluency but needs pronunciation improvement"
 * }
 */
export class AttemptScoreResponseDTO {
  id!: string;
  scoreMetadata!: Record<string, number>;
  overallBand!: number;
  feedback!: string;
}

/**
 * Nested DTO for feedback
 * @example {
 *   "id": "feedback-1",
 *   "type": "TEACHER",
 *   "content": "Excellent pronunciation with minor grammar issues",
 *   "visibility": "PUBLIC",
 *   "authorEmail": "teacher@example.com",
 *   "createdAt": "2024-11-14T11:00:00Z"
 * }
 */
export class AttemptFeedbackResponseDTO {
  id!: string;
  type!: string;
  content!: string;
  visibility!: string;
  authorEmail?: string;
  createdAt!: Date;
}

/**
 * Query filter for attempts
 * @example {
 *   "status": "SUBMITTED",
 *   "skillType": "SPEAKING",
 *   "limit": 20,
 *   "offset": 0
 * }
 */
export class AttemptFilterDTO {
  status?: AttemptStatus;
  skillType?: SkillType;
  limit?: number;
  offset?: number;
}
