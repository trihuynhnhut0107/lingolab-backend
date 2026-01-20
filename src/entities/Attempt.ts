import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./User";
import { Assignment } from "./Assignment";
import { AttemptMedia } from "./AttemptMedia";
import { ScoringJob } from "./ScoringJob";
import { Score } from "./Score";
import { Feedback } from "./Feedback";
import { SkillType, AttemptStatus } from "../enums";

@Entity("attempts")
export class Attempt {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  learnerId!: string;

  @Column({ type: "uuid" })
  assignmentId!: string;

  @Column({
    type: "enum",
    enum: SkillType,
  })
  skillType!: SkillType;

  @Column({
    type: "enum",
    enum: AttemptStatus,
    default: AttemptStatus.IN_PROGRESS,
  })
  status!: AttemptStatus;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @Column({ type: "timestamp", nullable: true })
  startedAt?: Date;

  @Column({ type: "timestamp", nullable: true })
  submittedAt?: Date;

  @Column({ type: "timestamp", nullable: true })
  scoredAt?: Date;

  @Column({ type: "text", nullable: true })
  content?: string; // Transcript or written content to be scored

  // Relations
  @ManyToOne(() => User, (user) => user.attempts, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "learnerId" })
  learner!: User;

  @ManyToOne(() => Assignment, (assignment) => assignment.attempts)
  @JoinColumn({ name: "assignmentId" })
  assignment!: Assignment;

  @OneToMany(() => AttemptMedia, (media) => media.attempt)
  media?: AttemptMedia[];

  @OneToOne(() => ScoringJob, (job) => job.attempt, {
    nullable: true,
  })
  scoringJob?: ScoringJob;

  @OneToOne(() => Score, (score) => score.attempt, {
    nullable: true,
  })
  score?: Score;

  @OneToMany(() => Feedback, (feedback) => feedback.attempt)
  feedbacks?: Feedback[];
}
