import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Attempt } from "./Attempt";

@Entity("scores")
export class Score {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", unique: true })
  attemptId!: string;

  @Column({ type: "jsonb" })
  scoreMetadata!: {
    // For speaking: fluency, lexical, grammar, pronunciation
    // For writing: task_achievement, coherence_cohesion, lexical, grammatical
    [key: string]: number;
  };

  @Column({ type: "numeric", precision: 3, scale: 1 })
  overallBand!: number; // 5.0-9.0 with 0.5 increments

  @Column({ type: "text" })
  feedback!: string;

  @Column({ type: "jsonb", nullable: true })
  detailedFeedback?: Record<string, any>;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  // Relations
  @OneToOne(() => Attempt, (attempt) => attempt.score, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "attemptId" })
  attempt!: Attempt;
}
