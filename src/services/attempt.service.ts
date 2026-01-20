import { AppDataSource } from "../data-source";
import {
  CreateAttemptDTO,
  UpdateAttemptDTO,
  SubmitAttemptDTO,
  AttemptResponseDTO,
  AttemptListDTO,
  AttemptDetailDTO,
  AttemptFilterDTO,
} from "../dtos/attempt.dto";
import { Attempt } from "../entities/Attempt";
import { AttemptStatus, SkillType, ScoringJobStatus } from "../enums";
import { Prompt } from "../entities/Prompt";
import { User } from "../entities/User";
import { Score } from "../entities/Score";
import { Assignment } from "../entities/Assignment";
import { ScoringJob } from "../entities/ScoringJob";
import { Class } from "../entities/Class";
import { createPaginatedResponse } from "../utils/pagination.utils";
import { PaginatedResponseDTO } from "../dtos/pagination.dto";
import { queueService } from "./queue.service";
import {
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  ForbiddenException,
} from "../exceptions/HttpException";

export class AttemptService {
  private attemptRepository = AppDataSource.getRepository(Attempt);
  private userRepository = AppDataSource.getRepository(User);
  private promptRepository = AppDataSource.getRepository(Prompt);
  private scoreRepository = AppDataSource.getRepository(Score);
  private assignmentRepository = AppDataSource.getRepository(Assignment);
  private scoringJobRepository = AppDataSource.getRepository(ScoringJob);
  private classRepository = AppDataSource.getRepository(Class);

  // Create attempt
  async createAttempt(dto: CreateAttemptDTO): Promise<AttemptResponseDTO> {
    // Check if learner exists
    const learner = await this.userRepository.findOne({
      where: { id: dto.learnerId },
    });
    if (!learner) {
      throw new NotFoundException(
        `Learner with ID '${dto.learnerId}' not found`,
      );
    }

    // Check if assignment exists and get its details
    const assignment = await this.assignmentRepository.findOne({
      where: { id: dto.assignmentId },
      relations: ["prompt", "class"],
    });
    if (!assignment) {
      throw new NotFoundException(
        `Assignment with ID '${dto.assignmentId}' not found`,
      );
    }

    // Validate learner is enrolled in the assignment's class
    const classEntity = await this.classRepository.findOne({
      where: { id: assignment.classId },
      relations: ["learners"],
    });
    if (!classEntity) {
      throw new NotFoundException(
        `Class with ID '${assignment.classId}' not found`,
      );
    }

    const isEnrolled = classEntity.learners?.some(
      (l) => l.id === dto.learnerId,
    );
    if (!isEnrolled) {
      throw new ForbiddenException(
        `Learner with ID '${dto.learnerId}' is not enrolled in the class for this assignment`,
      );
    }

    // Derive skillType from the assignment's prompt
    const skillType = assignment.prompt?.skillType;
    console.log("Assignment:::", assignment);
    if (!skillType) {
      throw new BadRequestException(
        `Assignment's prompt does not have a skill type defined`,
      );
    }

    const attempt = this.attemptRepository.create({
      learnerId: dto.learnerId,
      assignmentId: dto.assignmentId,
      skillType,
      status: AttemptStatus.IN_PROGRESS,
      startedAt: new Date(),
    });

    const saved = await this.attemptRepository.save(attempt);
    return this.mapToResponseDTO(saved);
  }

  // Get attempt by ID
  async getAttemptById(id: string): Promise<AttemptDetailDTO> {
    const attempt = await this.attemptRepository.findOne({
      where: { id },
      relations: [
        "assignment",
        "assignment.prompt",
        "media",
        "score",
        "feedbacks",
        "feedbacks.author",
      ],
    });
    if (!attempt) {
      throw new NotFoundException(`Attempt with ID '${id}' not found`);
    }
    return this.mapToDetailDTO(attempt);
  }

  // Get all attempts
  async getAllAttempts(
    limit: number = 10,
    offset: number = 0,
  ): Promise<PaginatedResponseDTO<AttemptListDTO>> {
    const [attempts, total] = await this.attemptRepository.findAndCount({
      take: limit,
      skip: offset,
    });
    return createPaginatedResponse(
      attempts.map((a) => this.mapToListDTO(a)),
      total,
      limit,
      offset,
    );
  }

  // Get attempts by learner
  async getAttemptsByLearner(
    learnerId: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<PaginatedResponseDTO<AttemptListDTO>> {
    const [attempts, total] = await this.attemptRepository.findAndCount({
      where: { learnerId },
      take: limit,
      skip: offset,
    });
    return createPaginatedResponse(
      attempts.map((a) => this.mapToListDTO(a)),
      total,
      limit,
      offset,
    );
  }

  // Get attempts by learner and status
  async getAttemptsByLearnerAndStatus(
    learnerId: string,
    status: AttemptStatus,
    limit: number = 10,
    offset: number = 0,
  ): Promise<PaginatedResponseDTO<AttemptListDTO>> {
    const [attempts, total] = await this.attemptRepository.findAndCount({
      where: { learnerId, status },
      take: limit,
      skip: offset,
    });
    return createPaginatedResponse(
      attempts.map((a) => this.mapToListDTO(a)),
      total,
      limit,
      offset,
    );
  }

  // Get attempts by assignment
  async getAttemptsByAssignment(
    assignmentId: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<PaginatedResponseDTO<AttemptListDTO>> {
    const [attempts, total] = await this.attemptRepository.findAndCount({
      where: { assignmentId },
      take: limit,
      skip: offset,
    });
    return createPaginatedResponse(
      attempts.map((a) => this.mapToListDTO(a)),
      total,
      limit,
      offset,
    );
  }

  // Get attempts by status
  async getAttemptsByStatus(
    status: AttemptStatus,
    limit: number = 10,
    offset: number = 0,
  ): Promise<PaginatedResponseDTO<AttemptListDTO>> {
    const [attempts, total] = await this.attemptRepository.findAndCount({
      where: { status },
      take: limit,
      skip: offset,
    });
    return createPaginatedResponse(
      attempts.map((a) => this.mapToListDTO(a)),
      total,
      limit,
      offset,
    );
  }

  // Get attempts by skill type
  async getAttemptsBySkillType(
    skillType: SkillType,
    limit: number = 10,
    offset: number = 0,
  ): Promise<PaginatedResponseDTO<AttemptListDTO>> {
    const [attempts, total] = await this.attemptRepository.findAndCount({
      where: { skillType },
      take: limit,
      skip: offset,
    });
    return createPaginatedResponse(
      attempts.map((a) => this.mapToListDTO(a)),
      total,
      limit,
      offset,
    );
  }

  // Get attempts with filter
  async getAttemptsByFilter(
    learnerId: string,
    filter: AttemptFilterDTO,
  ): Promise<PaginatedResponseDTO<AttemptListDTO>> {
    const limit = filter.limit || 10;
    const offset = filter.offset || 0;

    if (filter.status) {
      return this.getAttemptsByLearnerAndStatus(
        learnerId,
        filter.status,
        limit,
        offset,
      );
    }

    return this.getAttemptsByLearner(learnerId, limit, offset);
  }

  // Update attempt
  async updateAttempt(
    id: string,
    dto: UpdateAttemptDTO,
  ): Promise<AttemptResponseDTO> {
    const attempt = await this.attemptRepository.findOne({ where: { id } });
    if (!attempt) {
      throw new NotFoundException(`Attempt with ID '${id}' not found`);
    }

    await this.attemptRepository.update(id, dto);
    const updated = await this.attemptRepository.findOne({ where: { id } });
    if (!updated) {
      throw new InternalServerErrorException(
        `Failed to update attempt with ID '${id}'`,
      );
    }

    return this.mapToResponseDTO(updated);
  }

  // Submit attempt
  async submitAttempt(
    id: string,
    dto: SubmitAttemptDTO,
  ): Promise<AttemptResponseDTO> {
    const attempt = await this.attemptRepository.findOne({
      where: { id },
      relations: ["assignment", "assignment.prompt"],
    });
    if (!attempt) {
      throw new NotFoundException(`Attempt with ID '${id}' not found`);
    }

    if (
      attempt.status === AttemptStatus.SUBMITTED ||
      attempt.status === AttemptStatus.SCORED
    ) {
      throw new BadRequestException(
        "Attempt has already been submitted. Cannot modify",
      );
    }

    // Update attempt status to SUBMITTED
    await this.attemptRepository.update(id, {
      status: AttemptStatus.SUBMITTED,
      submittedAt: new Date(),
      content: dto.content || attempt.content,
    });

    // Use AI Rule from the assignment (students cannot override this)
    const aiRuleId = attempt.assignment?.aiRuleId;
    const enableAIScoring = attempt.assignment?.enableAIScoring ?? false;

    // Queue scoring job if assignment has AI rule configured and AI scoring is enabled
    if (aiRuleId && enableAIScoring) {
      try {
        const transcript = dto.content || attempt.content || "";

        // Get the Prompt content (AI scoring instructions) from the assignment
        const promptContent = attempt.assignment?.prompt?.content;

        // Create a scoring job record in the database
        const scoringJob = this.scoringJobRepository.create({
          attemptId: id,
          status: ScoringJobStatus.QUEUED,
          retryCount: 0,
        });
        await this.scoringJobRepository.save(scoringJob);

        // Add job to the queue for async processing
        await queueService.addScoringJob({
          attemptId: id,
          transcript,
          aiRuleId,
          promptContent,
          skillType: attempt.skillType,
        });

        console.log(`[AttemptService] Queued scoring job for attempt ${id}`);
      } catch (error: any) {
        // Log the error but don't fail the submission
        console.error(
          `Failed to queue scoring job for attempt ${id}:`,
          error.message,
        );
        // Keep the attempt in SUBMITTED status if queueing fails
      }
    }

    const updated = await this.attemptRepository.findOne({ where: { id } });
    if (!updated) {
      throw new InternalServerErrorException(
        `Failed to submit attempt with ID '${id}'`,
      );
    }

    return this.mapToResponseDTO(updated);
  }

  // Delete attempt
  async deleteAttempt(id: string): Promise<boolean> {
    const attempt = await this.attemptRepository.findOne({ where: { id } });
    if (!attempt) {
      throw new NotFoundException(`Attempt with ID '${id}' not found`);
    }
    const result = await this.attemptRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  // Get attempt statistics
  async getAttemptCountByLearner(learnerId: string): Promise<number> {
    return await this.attemptRepository.count({ where: { learnerId } });
  }

  async getSubmittedAttemptsCount(learnerId: string): Promise<number> {
    return await this.attemptRepository.count({
      where: { learnerId, status: AttemptStatus.SUBMITTED },
    });
  }

  async getScoredAttemptsCount(learnerId: string): Promise<number> {
    return await this.attemptRepository.count({
      where: { learnerId, status: AttemptStatus.SCORED },
    });
  }

  // Mappers
  private mapToResponseDTO(attempt: Attempt): AttemptResponseDTO {
    return {
      id: attempt.id,
      learnerId: attempt.learnerId,
      assignmentId: attempt.assignmentId,
      skillType: attempt.skillType,
      status: attempt.status,
      createdAt: attempt.createdAt,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      scoredAt: attempt.scoredAt,
    };
  }

  private mapToListDTO(attempt: Attempt): AttemptListDTO {
    return {
      id: attempt.id,
      assignmentId: attempt.assignmentId,
      skillType: attempt.skillType,
      status: attempt.status,
      createdAt: attempt.createdAt,
      submittedAt: attempt.submittedAt,
    };
  }

  private mapToDetailDTO(attempt: Attempt): AttemptDetailDTO {
    return {
      id: attempt.id,
      learnerId: attempt.learnerId,
      assignmentId: attempt.assignmentId,
      skillType: attempt.skillType,
      status: attempt.status,
      createdAt: attempt.createdAt,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      scoredAt: attempt.scoredAt,
      assignmentTitle: attempt.assignment?.title,
      assignmentDescription: attempt.assignment?.description,
      media: attempt.media?.map((m) => ({
        id: m.id,
        mediaType: m.mediaType,
        storageUrl: m.storageUrl,
        fileName: m.fileName,
        duration: m.duration,
        fileSize: m.fileSize,
        mimeType: m.mimeType,
        uploadedAt: m.uploadedAt,
      })),
      score: attempt.score
        ? {
            id: attempt.score.id,
            scoreMetadata: attempt.score.scoreMetadata,
            overallBand: attempt.score.overallBand,
            feedback: attempt.score.feedback,
          }
        : undefined,
      feedbacks: attempt.feedbacks?.map((f) => ({
        id: f.id,
        type: f.type,
        content: f.content,
        visibility: f.visibility,
        authorEmail: f.author?.email,
        createdAt: f.createdAt,
      })),
    };
  }
}
