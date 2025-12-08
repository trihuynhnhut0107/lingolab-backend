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
import { AttemptStatus, SkillType } from "../enums";
import { Prompt } from "../entities/Prompt";
import { User } from "../entities/User";
import { Score } from "../entities/Score";
import { createPaginatedResponse } from "../utils/pagination.utils";
import { PaginatedResponseDTO } from "../dtos/pagination.dto";
import { langchainService } from "./langchain.service";
import { aiRuleService } from "./ai-rule.service";
import { NotFoundException, InternalServerErrorException, BadRequestException } from "../exceptions/HttpException";

export class AttemptService {
  private attemptRepository = AppDataSource.getRepository(Attempt);
  private userRepository = AppDataSource.getRepository(User);
  private promptRepository = AppDataSource.getRepository(Prompt);
  private scoreRepository = AppDataSource.getRepository(Score);

  // Create attempt
  async createAttempt(dto: CreateAttemptDTO): Promise<AttemptResponseDTO> {
    // Check if learner exists
    const learner = await this.userRepository.findOne({ where: { id: dto.learnerId } });
    if (!learner) {
      throw new NotFoundException(`Learner with ID '${dto.learnerId}' not found`);
    }

    // Check if prompt exists
    const prompt = await this.promptRepository.findOne({ where: { id: dto.promptId } });
    if (!prompt) {
      throw new NotFoundException(`Prompt with ID '${dto.promptId}' not found`);
    }

    const attempt = this.attemptRepository.create({
      learnerId: dto.learnerId,
      promptId: dto.promptId,
      skillType: dto.skillType,
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
      relations: ["prompt", "media", "score", "feedbacks", "feedbacks.author"],
    });
    if (!attempt) {
      throw new NotFoundException(`Attempt with ID '${id}' not found`);
    }
    return this.mapToDetailDTO(attempt);
  }

  // Get all attempts
  async getAllAttempts(limit: number = 10, offset: number = 0): Promise<PaginatedResponseDTO<AttemptListDTO>> {
    const [attempts, total] = await this.attemptRepository.findAndCount({
      take: limit,
      skip: offset,
    });
    return createPaginatedResponse(
      attempts.map((a) => this.mapToListDTO(a)),
      total,
      limit,
      offset
    );
  }

  // Get attempts by learner
  async getAttemptsByLearner(learnerId: string, limit: number = 10, offset: number = 0): Promise<PaginatedResponseDTO<AttemptListDTO>> {
    const [attempts, total] = await this.attemptRepository.findAndCount({
      where: { learnerId },
      take: limit,
      skip: offset,
    });
    return createPaginatedResponse(
      attempts.map((a) => this.mapToListDTO(a)),
      total,
      limit,
      offset
    );
  }

  // Get attempts by learner and status
  async getAttemptsByLearnerAndStatus(
    learnerId: string,
    status: AttemptStatus,
    limit: number = 10,
    offset: number = 0
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
      offset
    );
  }

  // Get attempts by prompt
  async getAttemptsByPrompt(promptId: string, limit: number = 10, offset: number = 0): Promise<PaginatedResponseDTO<AttemptListDTO>> {
    const [attempts, total] = await this.attemptRepository.findAndCount({
      where: { promptId },
      take: limit,
      skip: offset,
    });
    return createPaginatedResponse(
      attempts.map((a) => this.mapToListDTO(a)),
      total,
      limit,
      offset
    );
  }

  // Get attempts by status
  async getAttemptsByStatus(status: AttemptStatus, limit: number = 10, offset: number = 0): Promise<PaginatedResponseDTO<AttemptListDTO>> {
    const [attempts, total] = await this.attemptRepository.findAndCount({
      where: { status },
      take: limit,
      skip: offset,
    });
    return createPaginatedResponse(
      attempts.map((a) => this.mapToListDTO(a)),
      total,
      limit,
      offset
    );
  }

  // Get attempts by skill type
  async getAttemptsBySkillType(skillType: SkillType, limit: number = 10, offset: number = 0): Promise<PaginatedResponseDTO<AttemptListDTO>> {
    const [attempts, total] = await this.attemptRepository.findAndCount({
      where: { skillType },
      take: limit,
      skip: offset,
    });
    return createPaginatedResponse(
      attempts.map((a) => this.mapToListDTO(a)),
      total,
      limit,
      offset
    );
  }

  // Get attempts with filter
  async getAttemptsByFilter(learnerId: string, filter: AttemptFilterDTO): Promise<PaginatedResponseDTO<AttemptListDTO>> {
    const limit = filter.limit || 10;
    const offset = filter.offset || 0;

    if (filter.status) {
      return this.getAttemptsByLearnerAndStatus(learnerId, filter.status, limit, offset);
    }

    return this.getAttemptsByLearner(learnerId, limit, offset);
  }

  // Update attempt
  async updateAttempt(id: string, dto: UpdateAttemptDTO): Promise<AttemptResponseDTO> {
    const attempt = await this.attemptRepository.findOne({ where: { id } });
    if (!attempt) {
      throw new NotFoundException(`Attempt with ID '${id}' not found`);
    }

    await this.attemptRepository.update(id, dto);
    const updated = await this.attemptRepository.findOne({ where: { id } });
    if (!updated) {
      throw new InternalServerErrorException(`Failed to update attempt with ID '${id}'`);
    }

    return this.mapToResponseDTO(updated);
  }

  // Submit attempt
  async submitAttempt(id: string, dto: SubmitAttemptDTO): Promise<AttemptResponseDTO> {
    const attempt = await this.attemptRepository.findOne({
      where: { id },
      relations: ["prompt"],
    });
    if (!attempt) {
      throw new NotFoundException(`Attempt with ID '${id}' not found`);
    }

    if (attempt.status === AttemptStatus.SUBMITTED || attempt.status === AttemptStatus.SCORED) {
      throw new BadRequestException("Attempt has already been submitted. Cannot modify");
    }

    // Update attempt status to SUBMITTED
    await this.attemptRepository.update(id, {
      status: AttemptStatus.SUBMITTED,
      submittedAt: new Date(),
      content: dto.content || attempt.content,
    });

    // Try to automatically score if aiRuleId is provided
    if (dto.aiRuleId) {
      try {
        const aiRule = await aiRuleService.getAIRuleById(dto.aiRuleId);
        const scoreResponse = await langchainService.scoreIELTSSpeaking(
          dto.content || attempt.content || "",
          aiRule
        );

        // Create score record
        const score = this.scoreRepository.create({
          attemptId: id,
          fluency: scoreResponse.fluency,
          coherence: scoreResponse.coherence,
          lexical: scoreResponse.lexical,
          grammar: scoreResponse.grammar,
          pronunciation: scoreResponse.pronunciation,
          overallBand: scoreResponse.overallBand,
          feedback: JSON.stringify(scoreResponse.feedback),
          detailedFeedback: scoreResponse.feedback,
        });
        await this.scoreRepository.save(score);

        // Update attempt status to SCORED
        await this.attemptRepository.update(id, {
          status: AttemptStatus.SCORED,
        });
      } catch (error: any) {
        // Log the error but don't fail the submission
        console.error(`AI scoring failed for attempt ${id}:`, error.message);
        // Keep the attempt in SUBMITTED status if scoring fails
      }
    }

    const updated = await this.attemptRepository.findOne({ where: { id } });
    if (!updated) {
      throw new InternalServerErrorException(`Failed to submit attempt with ID '${id}'`);
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
      promptId: attempt.promptId,
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
      promptId: attempt.promptId,
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
      promptId: attempt.promptId,
      skillType: attempt.skillType,
      status: attempt.status,
      createdAt: attempt.createdAt,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      scoredAt: attempt.scoredAt,
      promptContent: attempt.prompt?.content,
      promptDifficulty: attempt.prompt?.difficulty,
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
            fluency: Number(attempt.score.fluency),
            pronunciation: Number(attempt.score.pronunciation),
            lexical: Number(attempt.score.lexical),
            grammar: Number(attempt.score.grammar),
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
