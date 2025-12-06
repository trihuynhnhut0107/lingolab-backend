import { Controller, Get, Post, Put, Delete, Route, Body, Path, Query, Response, Tags } from "tsoa";
import {
  CreateAttemptDTO,
  UpdateAttemptDTO,
  SubmitAttemptDTO,
  AttemptResponseDTO,
  AttemptListDTO,
  AttemptDetailDTO,
  AttemptFilterDTO,
} from "../dtos/attempt.dto";
import { AttemptService } from "../services/attempt.service";
import { SkillType } from "../entities/Prompt";
import { AttemptStatus } from "../entities/Attempt";
import { PaginatedResponseDTO } from "../dtos/pagination.dto";

@Route("/api/attempts")
@Tags("Attempt")
export class AttemptController extends Controller {
  private attemptService = new AttemptService();

  /**
   * Create a new attempt
   */
  @Post()
  @Response(201, "Attempt created successfully")
  async createAttempt(@Body() dto: CreateAttemptDTO): Promise<AttemptResponseDTO> {
    return await this.attemptService.createAttempt(dto);
  }

  /**
   * Get attempt by ID
   */
  @Get("{id}")
  @Response(200, "Attempt found")
  @Response(404, "Attempt not found")
  async getAttemptById(@Path() id: string): Promise<AttemptDetailDTO> {
    return await this.attemptService.getAttemptById(id);
  }

  /**
   * Get all attempts with pagination
   */
  @Get()
  async getAllAttempts(
    @Query() limit: number = 10,
    @Query() offset: number = 0
  ): Promise<PaginatedResponseDTO<AttemptListDTO>> {
    return await this.attemptService.getAllAttempts(limit, offset);
  }

  /**
   * Get attempts by learner
   */
  @Get("learner/{learnerId}")
  async getAttemptsByLearner(
    @Path() learnerId: string,
    @Query() limit: number = 10,
    @Query() offset: number = 0
  ): Promise<PaginatedResponseDTO<AttemptListDTO>> {
    return await this.attemptService.getAttemptsByLearner(learnerId, limit, offset);
  }

  /**
   * Get attempts by learner and status
   */
  @Get("learner/{learnerId}/status/{status}")
  async getAttemptsByLearnerAndStatus(
    @Path() learnerId: string,
    @Path() status: AttemptStatus,
    @Query() limit: number = 10,
    @Query() offset: number = 0
  ): Promise<PaginatedResponseDTO<AttemptListDTO>> {
    return await this.attemptService.getAttemptsByLearnerAndStatus(learnerId, status, limit, offset);
  }

  /**
   * Get attempts by prompt
   */
  @Get("prompt/{promptId}")
  async getAttemptsByPrompt(
    @Path() promptId: string,
    @Query() limit: number = 10,
    @Query() offset: number = 0
  ): Promise<PaginatedResponseDTO<AttemptListDTO>> {
    return await this.attemptService.getAttemptsByPrompt(promptId, limit, offset);
  }

  /**
   * Get attempts by status
   */
  @Get("by-status/{status}")
  async getAttemptsByStatus(
    @Path() status: AttemptStatus,
    @Query() limit: number = 10,
    @Query() offset: number = 0
  ): Promise<PaginatedResponseDTO<AttemptListDTO>> {
    return await this.attemptService.getAttemptsByStatus(status, limit, offset);
  }

  /**
   * Get attempts by skill type
   */
  @Get("by-skill/{skillType}")
  async getAttemptsBySkillType(
    @Path() skillType: SkillType,
    @Query() limit: number = 10,
    @Query() offset: number = 0
  ): Promise<PaginatedResponseDTO<AttemptListDTO>> {
    return await this.attemptService.getAttemptsBySkillType(skillType, limit, offset);
  }

  /**
   * Get attempts with filter (requires learnerId)
   */
  @Post("learner/{learnerId}/filter")
  async getAttemptsByFilter(
    @Path() learnerId: string,
    @Body() filter: AttemptFilterDTO
  ): Promise<PaginatedResponseDTO<AttemptListDTO>> {
    return await this.attemptService.getAttemptsByFilter(learnerId, filter);
  }

  /**
   * Submit an attempt
   */
  @Put("{id}/submit")
  @Response(200, "Attempt submitted successfully")
  @Response(404, "Attempt not found")
  async submitAttempt(@Path() id: string, @Body() dto: SubmitAttemptDTO): Promise<AttemptResponseDTO> {
    return await this.attemptService.submitAttempt(id, dto);
  }

  /**
   * Update attempt
   */
  @Put("{id}")
  @Response(200, "Attempt updated successfully")
  @Response(404, "Attempt not found")
  async updateAttempt(@Path() id: string, @Body() dto: UpdateAttemptDTO): Promise<AttemptResponseDTO> {
    return await this.attemptService.updateAttempt(id, dto);
  }

  /**
   * Get attempt count by learner
   */
  @Get("learner/{learnerId}/count")
  async getAttemptCountByLearner(@Path() learnerId: string): Promise<{ count: number }> {
    const count = await this.attemptService.getAttemptCountByLearner(learnerId);
    return { count };
  }

  /**
   * Get submitted attempts count by learner
   */
  @Get("learner/{learnerId}/submitted-count")
  async getSubmittedAttemptsCount(@Path() learnerId: string): Promise<{ count: number }> {
    const count = await this.attemptService.getSubmittedAttemptsCount(learnerId);
    return { count };
  }

  /**
   * Get scored attempts count by learner
   */
  @Get("learner/{learnerId}/scored-count")
  async getScoredAttemptsCount(@Path() learnerId: string): Promise<{ count: number }> {
    const count = await this.attemptService.getScoredAttemptsCount(learnerId);
    return { count };
  }

  /**
   * Delete attempt
   */
  @Delete("{id}")
  @Response(204, "Attempt deleted successfully")
  @Response(404, "Attempt not found")
  async deleteAttempt(@Path() id: string): Promise<void> {
    await this.attemptService.deleteAttempt(id);
    this.setStatus(204);
  }
}
