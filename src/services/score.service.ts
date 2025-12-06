import { AppDataSource } from "../data-source";
import {
  CreateScoreDTO,
  UpdateScoreDTO,
  ScoreResponseDTO,
  ScoreListDTO,
  ScoreDetailDTO,
} from "../dtos/score.dto";
import { Score } from "../entities/Score";
import { Attempt, AttemptStatus } from "../entities/Attempt";
import { createPaginatedResponse } from "../utils/pagination.utils";
import { PaginatedResponseDTO } from "../dtos/pagination.dto";

export class ScoreService {
  private scoreRepository = AppDataSource.getRepository(Score);
  private attemptRepository = AppDataSource.getRepository(Attempt);

  // Create score
  async createScore(dto: CreateScoreDTO): Promise<ScoreResponseDTO> {
    // Check if attempt exists
    const attempt = await this.attemptRepository.findOne({ where: { id: dto.attemptId } });
    if (!attempt) {
      throw new Error("Attempt not found");
    }

    // Check if score already exists
    const existingScore = await this.scoreRepository.findOne({
      where: { attemptId: dto.attemptId },
    });
    if (existingScore) {
      throw new Error("Score already exists for this attempt");
    }

    // Validate scores
    this.validateScores(dto.fluency, dto.pronunciation, dto.lexical, dto.grammar);

    // Validate overall band
    if (dto.overallBand < 5 || dto.overallBand > 9) {
      throw new Error("Overall band must be between 5 and 9");
    }

    const score = this.scoreRepository.create({
      attemptId: dto.attemptId,
      fluency: dto.fluency,
      pronunciation: dto.pronunciation,
      lexical: dto.lexical,
      grammar: dto.grammar,
      overallBand: dto.overallBand,
      feedback: dto.feedback,
      detailedFeedback: dto.detailedFeedback,
    });

    const saved = await this.scoreRepository.save(score);

    // Update attempt status to SCORED
    await this.attemptRepository.update(dto.attemptId, {
      status: AttemptStatus.SCORED,
      scoredAt: new Date(),
    });

    return this.mapToResponseDTO(saved);
  }

  // Get score by ID
  async getScoreById(id: string): Promise<ScoreDetailDTO> {
    const score = await this.scoreRepository.findOne({
      where: { id },
      relations: ["attempt", "attempt.prompt"],
    });
    if (!score) {
      throw new Error("Score not found");
    }
    return this.mapToDetailDTO(score);
  }

  // Get score by attempt ID
  async getScoreByAttemptId(attemptId: string): Promise<ScoreResponseDTO> {
    const score = await this.scoreRepository.findOne({ where: { attemptId } });
    if (!score) {
      throw new Error("Score not found");
    }
    return this.mapToResponseDTO(score);
  }

  // Get all scores
  async getAllScores(limit: number = 10, offset: number = 0): Promise<PaginatedResponseDTO<ScoreListDTO>> {
    const [scores, total] = await this.scoreRepository.findAndCount({
      take: limit,
      skip: offset,
    });
    return createPaginatedResponse(
      scores.map((s) => this.mapToListDTO(s)),
      total,
      limit,
      offset
    );
  }

  // Get scores by band
  async getScoresByBand(band: number, limit: number = 10, offset: number = 0): Promise<PaginatedResponseDTO<ScoreListDTO>> {
    if (band < 5 || band > 9) {
      throw new Error("Band must be between 5 and 9");
    }

    const [scores, total] = await this.scoreRepository.findAndCount({
      where: { overallBand: band },
      take: limit,
      skip: offset,
    });
    return createPaginatedResponse(
      scores.map((s) => this.mapToListDTO(s)),
      total,
      limit,
      offset
    );
  }

  // Get scores by band range
  async getScoresByBandRange(minBand: number, maxBand: number, limit: number = 10, offset: number = 0): Promise<PaginatedResponseDTO<ScoreListDTO>> {
    if (minBand < 5 || maxBand > 9 || minBand > maxBand) {
      throw new Error("Invalid band range");
    }

    const [scores, total] = await this.scoreRepository
      .createQueryBuilder("score")
      .where("score.overallBand >= :minBand AND score.overallBand <= :maxBand", { minBand, maxBand })
      .take(limit)
      .skip(offset)
      .getManyAndCount();

    return createPaginatedResponse(
      scores.map((s) => this.mapToListDTO(s)),
      total,
      limit,
      offset
    );
  }

  // Update score
  async updateScore(id: string, dto: UpdateScoreDTO): Promise<ScoreResponseDTO> {
    const score = await this.scoreRepository.findOne({ where: { id } });
    if (!score) {
      throw new Error("Score not found");
    }

    // Validate if scores are provided
    if (dto.fluency !== undefined || dto.pronunciation !== undefined || dto.lexical !== undefined || dto.grammar !== undefined) {
      this.validateScores(
        dto.fluency ?? score.fluency,
        dto.pronunciation ?? score.pronunciation,
        dto.lexical ?? score.lexical,
        dto.grammar ?? score.grammar
      );
    }

    // Validate overall band if provided
    if (dto.overallBand !== undefined && (dto.overallBand < 5 || dto.overallBand > 9)) {
      throw new Error("Overall band must be between 5 and 9");
    }

    await this.scoreRepository.update(id, dto);
    const updated = await this.scoreRepository.findOne({ where: { id } });
    if (!updated) {
      throw new Error("Failed to update score");
    }

    return this.mapToResponseDTO(updated);
  }

  // Delete score
  async deleteScore(id: string): Promise<boolean> {
    const score = await this.scoreRepository.findOne({ where: { id } });
    if (!score) {
      throw new Error("Score not found");
    }

    // Reset attempt status
    await this.attemptRepository.update(score.attemptId, {
      status: AttemptStatus.SUBMITTED,
      scoredAt: undefined,
    });

    const result = await this.scoreRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  // Get statistics
  async getAverageBand(): Promise<number | null> {
    const result = await this.scoreRepository
      .createQueryBuilder("score")
      .select("AVG(score.overallBand)", "average")
      .getRawOne();
    return result?.average ? parseFloat(result.average) : null;
  }

  async getScoreDistribution(): Promise<Record<number, number>> {
    const results = await this.scoreRepository
      .createQueryBuilder("score")
      .select("score.overallBand", "band")
      .addSelect("COUNT(*)", "count")
      .groupBy("score.overallBand")
      .getRawMany();

    const distribution: Record<number, number> = {};
    for (const result of results) {
      distribution[result.band] = parseInt(result.count, 10);
    }
    return distribution;
  }

  // Private helper
  private validateScores(fluency: number, pronunciation: number, lexical: number, grammar: number): void {
    const scores = [fluency, pronunciation, lexical, grammar];
    for (const score of scores) {
      if (score < 0 || score > 9) {
        throw new Error("Score must be between 0 and 9");
      }
    }
  }

  // Mappers
  private mapToResponseDTO(score: Score): ScoreResponseDTO {
    return {
      id: score.id,
      attemptId: score.attemptId,
      fluency: Number(score.fluency),
      pronunciation: Number(score.pronunciation),
      lexical: Number(score.lexical),
      grammar: Number(score.grammar),
      overallBand: score.overallBand,
      feedback: score.feedback,
      detailedFeedback: score.detailedFeedback,
      createdAt: score.createdAt,
    };
  }

  private mapToListDTO(score: Score): ScoreListDTO {
    return {
      id: score.id,
      attemptId: score.attemptId,
      overallBand: score.overallBand,
      createdAt: score.createdAt,
    };
  }

  private mapToDetailDTO(score: Score): ScoreDetailDTO {
    return {
      id: score.id,
      attemptId: score.attemptId,
      fluency: Number(score.fluency),
      pronunciation: Number(score.pronunciation),
      lexical: Number(score.lexical),
      grammar: Number(score.grammar),
      overallBand: score.overallBand,
      feedback: score.feedback,
      detailedFeedback: score.detailedFeedback,
      createdAt: score.createdAt,
      attemptDate: score.attempt?.createdAt,
      promptContent: score.attempt?.prompt?.content,
      skillType: score.attempt?.skillType,
    };
  }
}
