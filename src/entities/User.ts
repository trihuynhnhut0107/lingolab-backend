import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  ManyToMany,
  Index,
} from "typeorm";
import { LearnerProfile } from "./LearnerProfile";
import { Attempt } from "./Attempt";
import { Prompt } from "./Prompt";
import { Feedback } from "./Feedback";
import { Class } from "./Class";

export enum UserRole {
  LEARNER = "learner",
  TEACHER = "teacher",
  ADMIN = "admin",
}

export enum UserStatus {
  ACTIVE = "active",
  LOCKED = "locked",
}

export enum UILanguage {
  VI = "vi",
  EN = "en",
}

@Entity("users")
@Index("idx_user_email", ["email"], { unique: true })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  @Column({ type: "varchar" })
  password!: string;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.LEARNER,
  })
  role!: UserRole;

  @Column({
    type: "enum",
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status!: UserStatus;

  @Column({
    type: "enum",
    enum: UILanguage,
    default: UILanguage.EN,
  })
  uiLanguage!: UILanguage;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  // Relations
  @OneToOne(() => LearnerProfile, (profile) => profile.user, {
    cascade: true,
    onDelete: "CASCADE",
  })
  learnerProfile?: LearnerProfile;

  @OneToMany(() => Attempt, (attempt) => attempt.learner)
  attempts?: Attempt[];

  @OneToMany(() => Prompt, (prompt) => prompt.createdBy)
  prompts?: Prompt[];

  @OneToMany(() => Feedback, (feedback) => feedback.author)
  feedbacks?: Feedback[];

  @OneToMany(() => Class, (classs) => classs.teacher)
  taughtClasses?: Class[];

  @ManyToMany(() => Class, (classs) => classs.learners)
  enrolledClasses?: Class[];
}
