import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Route,
  Body,
  Path,
  Query,
  Response,
  Tags,
  Request,
  Security,
} from "tsoa";
import { aiRuleService } from "../services/ai-rule.service";
import {
  CreateAIRuleDTO,
  UpdateAIRuleDTO,
  AIRuleResponseDTO,
  AIRuleListDTO,
  AIRuleFilterDTO,
} from "../dtos/ai-rule.dto";
import { PaginatedResponseDTO } from "../dtos/pagination.dto";
import { TeacherOnly } from "../decorators/auth.decorator";
import { AuthRequest } from "../middleware/auth.middleware";

/**
 * AI Rule Controller
 * Manages AI scoring rules configured by teachers
 *
 * Teachers can create custom AI scoring rules with:
 * - Model selection (qwen2-7b-finetuned, gpt-4, claude-3, etc.)
 * - Rubric selection (ielts_speaking, ielts_writing, etc.)
 * - Custom scoring weights (fluency, coherence, lexical, grammar, pronunciation)
 * - Strictness multiplier (1.0 = standard, >1.0 = stricter, <1.0 = looser)
 * - Extra model configuration (temperature, top_p, etc.)
 *
 * Routes:
 * - POST /api/ai-rules - Create AI rule
 * - GET /api/ai-rules - List all AI rules
 * - GET /api/ai-rules/{id} - Get rule details
 * - PUT /api/ai-rules/{id} - Update rule
 * - DELETE /api/ai-rules/{id} - Delete rule
 * - GET /api/ai-rules/teacher/{teacherId} - Get teacher's rules
 * - GET /api/ai-rules/teacher/{teacherId}/active - Get active rules
 * - POST /api/ai-rules/filter - Filter rules
 * - PUT /api/ai-rules/{id}/toggle - Toggle active status
 */
@Route("/ai-rules")
@Tags("AIRule")
export class AIRuleController extends Controller {
  /**
   * Create a new AI scoring rule
   * Requires: Teacher or Admin role
   * Teacher ID is automatically extracted from the authentication token
   *
   * Example:
   * {
   *   "name": "Strict IELTS Speaking",
   *   "modelId": "qwen2-7b-finetuned",
   *   "rubricId": "ielts_speaking",
   *   "weights": {
   *     "fluency": 0.25,
   *     "coherence": 0.25,
   *     "lexical": 0.25,
   *     "grammar": 0.25
   *   },
   *   "strictness": 1.2,
   *   "extraConfig": {
   *     "temperature": 0.1,
   *     "top_p": 0.9
   *   }
   * }
   */
  @Post()
  @Response(201, "AI Rule created successfully")
  @Response(400, "Invalid rule data or weights don't sum to 1.0")
  @Response(401, "Unauthorized - must be logged in")
  @Response(403, "Forbidden - only teachers and admins can create AI rules")
  @Security("bearer")
  @TeacherOnly()
  async createAIRule(
    @Body() dto: CreateAIRuleDTO,
    @Request() request: AuthRequest
  ): Promise<AIRuleResponseDTO> {
    if (!request.user) {
      throw new Error("Unauthorized: No user in request");
    }
    return await aiRuleService.createAIRule(request.user.id, dto);
  }

  /**
   * Get AI rule by ID
   */
  @Get("{id}")
  @Response(200, "AI Rule found")
  @Response(404, "AI Rule not found")
  async getAIRuleById(@Path() id: string): Promise<AIRuleResponseDTO> {
    return await aiRuleService.getAIRuleById(id);
  }

  /**
   * Get all AI rules with pagination
   */
  @Get()
  async getAllAIRules(
    @Query() limit: number = 10,
    @Query() offset: number = 0
  ): Promise<PaginatedResponseDTO<AIRuleListDTO>> {
    return await aiRuleService.getAllAIRules(limit, offset);
  }

  /**
   * Get AI rules for a specific teacher
   */
  @Get("teacher/{teacherId}")
  async getAIRulesByTeacher(
    @Path() teacherId: string,
    @Query() limit: number = 10,
    @Query() offset: number = 0
  ): Promise<PaginatedResponseDTO<AIRuleListDTO>> {
    return await aiRuleService.getAIRulesByTeacher(teacherId, limit, offset);
  }

  /**
   * Get active AI rules for a teacher
   */
  @Get("teacher/{teacherId}/active")
  async getActiveAIRulesByTeacher(
    @Path() teacherId: string
  ): Promise<AIRuleListDTO[]> {
    return await aiRuleService.getActiveAIRulesByTeacher(teacherId);
  }

  /**
   * Filter AI rules with criteria
   */
  @Post("filter")
  async getAIRulesByFilter(
    @Body() filter: AIRuleFilterDTO
  ): Promise<PaginatedResponseDTO<AIRuleListDTO>> {
    return await aiRuleService.getAIRulesByFilter(filter);
  }

  /**
   * Update AI rule
   * Requires: Teacher or Admin role
   */
  @Put("{id}")
  @Response(200, "AI Rule updated successfully")
  @Response(404, "AI Rule not found")
  @Response(400, "Invalid weights")
  @Response(401, "Unauthorized - must be logged in")
  @Response(403, "Forbidden - only teachers and admins can update AI rules")
  @Security("bearer")
  @TeacherOnly()
  async updateAIRule(
    @Path() id: string,
    @Body() dto: UpdateAIRuleDTO
  ): Promise<AIRuleResponseDTO> {
    return await aiRuleService.updateAIRule(id, dto);
  }

  /**
   * Toggle AI rule active status (enable/disable)
   * Requires: Teacher or Admin role
   */
  @Put("{id}/toggle")
  @Response(200, "AI Rule status toggled")
  @Response(404, "AI Rule not found")
  @Response(401, "Unauthorized - must be logged in")
  @Response(403, "Forbidden - only teachers and admins can toggle AI rules")
  @Security("bearer")
  @TeacherOnly()
  async toggleAIRuleStatus(@Path() id: string): Promise<AIRuleResponseDTO> {
    return await aiRuleService.toggleAIRuleStatus(id);
  }

  /**
   * Delete AI rule
   * Requires: Teacher or Admin role
   */
  @Delete("{id}")
  @Response(204, "AI Rule deleted successfully")
  @Response(404, "AI Rule not found")
  @Response(401, "Unauthorized - must be logged in")
  @Response(403, "Forbidden - only teachers and admins can delete AI rules")
  @Security("bearer")
  @TeacherOnly()
  async deleteAIRule(@Path() id: string): Promise<void> {
    await aiRuleService.deleteAIRule(id);
    this.setStatus(204);
  }
}
