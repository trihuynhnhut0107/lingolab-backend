import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
} from "typeorm";
import { Class } from "./Class";
import { Prompt } from "./Prompt";
import { AIRule } from "./AIRule";
import { Attempt } from "./Attempt";
import { AssignmentStatus } from "../enums";

@Entity("assignments")
export class Assignment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  classId!: string;

  @Column({ type: "uuid" })
  promptId!: string;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "timestamp" })
  deadline!: Date;

  @Column({
    type: "enum",
    enum: AssignmentStatus,
    default: AssignmentStatus.DRAFT,
  })
  status!: AssignmentStatus;

  @Column({ type: "int", default: 0 })
  totalEnrolled!: number;

  @Column({ type: "int", default: 0 })
  totalSubmitted!: number;

  @Column({ type: "int", default: 0 })
  totalScored!: number;

  @Column({ type: "boolean", default: false })
  allowLateSubmission!: boolean;

  @Column({ type: "timestamp", nullable: true })
  lateDeadline?: Date;

  @Column({ type: "uuid", nullable: true })
  aiRuleId?: string; // Optional AI Rule for automatic scoring

  @Column({ type: "boolean", default: false })
  enableAIScoring!: boolean; // Enable/disable automatic AI scoring

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Class, (classs) => classs.assignments, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "classId" })
  class?: Class;

  @ManyToOne(() => Prompt, (prompt) => prompt.assignments, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "promptId" })
  prompt?: Prompt;

  @ManyToOne(() => AIRule, {
    onDelete: "SET NULL",
    nullable: true,
  })
  @JoinColumn({ name: "aiRuleId" })
  aiRule?: AIRule;

  @OneToMany(() => Attempt, (attempt) => attempt.assignment)
  attempts?: Attempt[];
}
