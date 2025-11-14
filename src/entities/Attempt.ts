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
import { Prompt } from "./Prompt";
import { AttemptMedia } from "./AttemptMedia";
import { ScoringJob } from "./ScoringJob";
import { Score } from "./Score";
import { Feedback } from "./Feedback";
import { SkillType } from "./Prompt";

export enum AttemptStatus {
  IN_PROGRESS = "in_progress",
  SUBMITTED = "submitted",
  SCORED = "scored",
}

@Entity("attempts")
@Index("idx_attempts_learner_created", ["learnerId", "createdAt"])
@Index("idx_attempts_prompt", ["promptId"])
@Index("idx_attempts_status", ["status"])
export class Attempt {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  learnerId!: string;

  @Column({ type: "uuid" })
  promptId!: string;

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

  // Relations
  @ManyToOne(() => User, (user) => user.attempts, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "learner_id" })
  learner!: User;

  @ManyToOne(() => Prompt, (prompt) => prompt.attempts)
  @JoinColumn({ name: "prompt_id" })
  prompt!: Prompt;

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
