import { Repository, Between, In } from "typeorm";
import { AppDataSource } from "../data-source";
import { Assignment } from "../entities/Assignment";
import { AssignmentStatus, AttemptStatus } from "../enums";
import {
  CreateAssignmentDTO,
  UpdateAssignmentDTO,
  AssignmentResponseDTO,
  AssignmentDetailDTO,
  AssignmentListDTO,
  AssignmentFilterDTO,
  AssignmentStudentSubmissionDTO,
} from "../dtos/assignment.dto";
import { PaginatedResponseDTO } from "../dtos/pagination.dto";
import { HttpException } from "../exceptions/HttpException";
import { Attempt } from "../entities/Attempt";
import { User } from "../entities/User";

export class AssignmentService {
  private assignmentRepository: Repository<Assignment>;
  private attemptRepository: Repository<Attempt>;
  private userRepository: Repository<User>;

  constructor() {
    this.assignmentRepository = AppDataSource.getRepository(Assignment);
    this.attemptRepository = AppDataSource.getRepository(Attempt);
    this.userRepository = AppDataSource.getRepository(User);
  }

  async createAssignment(
    dto: CreateAssignmentDTO,
  ): Promise<AssignmentResponseDTO> {
    const assignment = this.assignmentRepository.create({
      classId: dto.classId,
      promptId: dto.promptId,
      title: dto.title,
      description: dto.description,
      deadline: dto.deadline,
      status: dto.status || AssignmentStatus.DRAFT,
      allowLateSubmission: dto.allowLateSubmission || false,
      lateDeadline: dto.lateDeadline,
      aiRuleId: dto.aiRuleId,
      enableAIScoring: dto.enableAIScoring || false,
    });

    const savedAssignment = await this.assignmentRepository.save(assignment);
    return this.mapToResponseDTO(savedAssignment);
  }

  async getAssignmentById(id: string): Promise<AssignmentDetailDTO> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
      relations: ["class", "prompt", "aiRule"],
    });

    if (!assignment) {
      throw new HttpException("Assignment not found", 404);
    }

    return this.mapToDetailDTO(assignment);
  }

  async getAllAssignments(
    limit: number = 10,
    offset: number = 0,
  ): Promise<PaginatedResponseDTO<AssignmentListDTO>> {
    const [data, total] = await this.assignmentRepository.findAndCount({
      skip: offset,
      take: limit,
      order: { createdAt: "DESC" },
    });

    return {
      data: data.map((a) => this.mapToListDTO(a)),
      pagination: {
        limit,
        offset,
        total,
      },
    };
  }

  async getAssignmentsByClass(
    classId: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<PaginatedResponseDTO<AssignmentListDTO>> {
    const [data, total] = await this.assignmentRepository.findAndCount({
      where: { classId },
      skip: offset,
      take: limit,
      order: { deadline: "ASC" },
    });

    return {
      data: data.map((a) => this.mapToListDTO(a)),
      pagination: {
        limit,
        offset,
        total,
      },
    };
  }

  async getAssignmentsByStatus(
    status: AssignmentStatus,
    limit: number = 10,
    offset: number = 0,
  ): Promise<PaginatedResponseDTO<AssignmentListDTO>> {
    const [data, total] = await this.assignmentRepository.findAndCount({
      where: { status },
      skip: offset,
      take: limit,
      order: { createdAt: "DESC" },
    });

    return {
      data: data.map((a) => this.mapToListDTO(a)),
      pagination: {
        limit,
        offset,
        total,
      },
    };
  }

  // Get assignments by learner (assignments from classes the learner is enrolled in)
  async getAssignmentsByLearner(
    learnerId: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<PaginatedResponseDTO<AssignmentListDTO>> {
    // Check if learner exists
    const learner = await this.userRepository.findOne({
      where: { id: learnerId },
      relations: ["enrolledClasses"],
    });

    if (!learner) {
      throw new HttpException("Learner not found", 404);
    }

    // Get class IDs the learner is enrolled in
    const classIds = learner.enrolledClasses?.map((c) => c.id) || [];

    if (classIds.length === 0) {
      return {
        data: [],
        pagination: {
          limit,
          offset,
          total: 0,
        },
      };
    }

    // Get assignments from those classes
    const [data, total] = await this.assignmentRepository.findAndCount({
      where: { classId: In(classIds) },
      skip: offset,
      take: limit,
      order: { deadline: "ASC" },
    });

    return {
      data: data.map((a) => this.mapToListDTO(a)),
      pagination: {
        limit,
        offset,
        total,
      },
    };
  }

  async getAssignmentsByFilter(
    filter: AssignmentFilterDTO,
  ): Promise<PaginatedResponseDTO<AssignmentListDTO>> {
    const query = this.assignmentRepository.createQueryBuilder("a");

    if (filter.classId) {
      query.andWhere("a.classId = :classId", { classId: filter.classId });
    }

    if (filter.status) {
      query.andWhere("a.status = :status", { status: filter.status });
    }

    if (filter.startDate && filter.endDate) {
      query.andWhere("a.deadline BETWEEN :startDate AND :endDate", {
        startDate: filter.startDate,
        endDate: filter.endDate,
      });
    }

    const total = await query.getCount();
    const data = await query
      .skip(filter.offset || 0)
      .take(filter.limit || 10)
      .orderBy("a.deadline", "ASC")
      .getMany();

    return {
      data: data.map((a) => this.mapToListDTO(a)),
      pagination: {
        limit: filter.limit || 10,
        offset: filter.offset || 0,
        total,
      },
    };
  }

  async updateAssignment(
    id: string,
    dto: UpdateAssignmentDTO,
  ): Promise<AssignmentResponseDTO> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
    });

    if (!assignment) {
      throw new HttpException("Assignment not found", 404);
    }

    Object.assign(assignment, dto);
    const updated = await this.assignmentRepository.save(assignment);

    return this.mapToResponseDTO(updated);
  }

  async updateAssignmentStatus(
    id: string,
    status: AssignmentStatus,
  ): Promise<AssignmentResponseDTO> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
      relations: ["class", "class.learners"],
    });

    if (!assignment) {
      throw new HttpException("Assignment not found", 404);
    }

    assignment.status = status;

    // Sync totalEnrolled when assignment becomes active
    if (status === AssignmentStatus.ACTIVE) {
      assignment.totalEnrolled = assignment.class?.learners?.length || 0;
    }

    const updated = await this.assignmentRepository.save(assignment);

    return this.mapToResponseDTO(updated);
  }

  async syncEnrollmentCount(assignmentId: string): Promise<void> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
      relations: ["class", "class.learners"],
    });

    if (!assignment) {
      throw new HttpException("Assignment not found", 404);
    }

    assignment.totalEnrolled = assignment.class?.learners?.length || 0;
    await this.assignmentRepository.save(assignment);
  }

  async syncAllActiveAssignmentsForClass(classId: string): Promise<void> {
    const assignments = await this.assignmentRepository.find({
      where: {
        classId,
        status: AssignmentStatus.ACTIVE,
      },
      relations: ["class", "class.learners"],
    });

    for (const assignment of assignments) {
      assignment.totalEnrolled = assignment.class?.learners?.length || 0;
    }

    await this.assignmentRepository.save(assignments);
  }

  async getStudentSubmissions(
    assignmentId: string,
  ): Promise<AssignmentStudentSubmissionDTO[]> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
      relations: ["class"],
    });

    if (!assignment) {
      throw new HttpException("Assignment not found", 404);
    }

    // Get all attempts for this assignment
    const attempts = await this.attemptRepository.find({
      where: { assignmentId: assignment.id },
      relations: ["learner", "score"],
    });

    return attempts.map((attempt) => ({
      learnerId: attempt.learnerId,
      learnerEmail: attempt.learner?.email || "",
      learnerName: attempt.learner?.email?.split("@")[0],
      status: attempt.status,
      submittedAt: attempt.submittedAt,
      score: attempt.score?.overallBand,
    }));
  }

  async deleteAssignment(id: string): Promise<void> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
    });

    if (!assignment) {
      throw new HttpException("Assignment not found", 404);
    }

    await this.assignmentRepository.remove(assignment);
  }

  // Helper methods

  private mapToResponseDTO(assignment: Assignment): AssignmentResponseDTO {
    return {
      id: assignment.id,
      classId: assignment.classId,
      promptId: assignment.promptId,
      title: assignment.title,
      description: assignment.description,
      deadline: assignment.deadline,
      status: assignment.status,
      totalEnrolled: assignment.totalEnrolled,
      totalSubmitted: assignment.totalSubmitted,
      totalScored: assignment.totalScored,
      allowLateSubmission: assignment.allowLateSubmission,
      lateDeadline: assignment.lateDeadline,
      aiRuleId: assignment.aiRuleId,
      enableAIScoring: assignment.enableAIScoring,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
    };
  }

  private mapToDetailDTO(assignment: Assignment): AssignmentDetailDTO {
    return {
      id: assignment.id,
      classId: assignment.classId,
      promptId: assignment.promptId,
      title: assignment.title,
      description: assignment.description,
      deadline: assignment.deadline,
      status: assignment.status,
      totalEnrolled: assignment.totalEnrolled,
      totalSubmitted: assignment.totalSubmitted,
      totalScored: assignment.totalScored,
      allowLateSubmission: assignment.allowLateSubmission,
      lateDeadline: assignment.lateDeadline,
      aiRuleId: assignment.aiRuleId,
      enableAIScoring: assignment.enableAIScoring,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
      class: assignment.class
        ? {
            id: assignment.class.id,
            name: assignment.class.name,
          }
        : undefined,
      prompt: assignment.prompt
        ? {
            id: assignment.prompt.id,
            title: assignment.prompt.content.substring(0, 100),
            skillType: assignment.prompt.skillType,
          }
        : undefined,
      aiRule: assignment.aiRule
        ? {
            id: assignment.aiRule.id,
            name: assignment.aiRule.name,
            strictness: assignment.aiRule.strictness,
          }
        : undefined,
    };
  }

  private mapToListDTO(assignment: Assignment): AssignmentListDTO {
    return {
      id: assignment.id,
      title: assignment.title,
      deadline: assignment.deadline,
      status: assignment.status,
      totalSubmitted: assignment.totalSubmitted,
      totalEnrolled: assignment.totalEnrolled,
    };
  }
}

export const assignmentService = new AssignmentService();
