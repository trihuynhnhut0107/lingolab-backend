import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./User";
import { Assignment } from "./Assignment";
import { SkillType, DifficultyLevel } from "../enums";

@Entity("prompts")
export class Prompt {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  createdBy!: string;

  @Column({
    type: "enum",
    enum: SkillType,
  })
  skillType!: SkillType;

  @Column({ type: "text" })
  content!: string;

  @Column({
    type: "enum",
    enum: DifficultyLevel,
  })
  difficulty!: DifficultyLevel;

  @Column({ type: "integer", comment: "Prep time in seconds" })
  prepTime!: number;

  @Column({ type: "integer", comment: "Response time in seconds" })
  responseTime!: number;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "text", nullable: true })
  followUpQuestions?: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.prompts, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "createdBy" })
  creator!: User;

  @OneToMany(() => Assignment, (assignment) => assignment.prompt)
  assignments?: Assignment[];
}
