import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from "typeorm";
import { Class } from "./Class";
import { Prompt } from "./Prompt";
import { AssignmentStatus } from "../enums";

@Entity("assignments")
@Index("idx_assignment_class", ["classId"])
@Index("idx_assignment_prompt", ["promptId"])
@Index("idx_assignment_status", ["status"])
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

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Class, (classs) => classs.assignments, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "class_id" })
  class?: Class;

  @ManyToOne(() => Prompt, (prompt) => prompt.assignments, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "prompt_id" })
  prompt?: Prompt;
}
