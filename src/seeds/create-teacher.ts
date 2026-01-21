import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { UserRole } from "../enums";
import * as bcrypt from 'bcryptjs';

const createTeacher = async () => {
    try {
        await AppDataSource.initialize();
        console.log("Data Source has been initialized!");

        const userRepository = AppDataSource.getRepository(User);

        const teacherEmail = "teacher@test.com";
        const existingTeacher = await userRepository.findOneBy({ email: teacherEmail });

        if (existingTeacher) {
            console.log("Teacher account already exists.");
            return;
        }

        const hashedPassword = await bcrypt.hash("teacher123", 10);

        const teacher = new User();
        teacher.email = teacherEmail;
        teacher.password = hashedPassword;
        teacher.role = UserRole.TEACHER;
        // firstName and lastName removed as they are not columns in User entity
        
        await userRepository.save(teacher);
        console.log("Teacher account created successfully:");
        console.log("Email: teacher@test.com");
        console.log("Password: teacher123");

    } catch (error) {
        console.error("Error creating teacher account:", error);
    } finally {
        await AppDataSource.destroy();
    }
};

createTeacher();
