import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { User } from "../entities/User";

export interface CreateUserDTO {
  name: string;
  email: string;
  bio?: string;
}

export interface UpdateUserDTO {
  name?: string;
  email?: string;
  bio?: string;
}

export class UserService {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  public async getAllUsers(): Promise<User[]> {
    return await this.userRepository.find();
  }

  public async getUserById(id: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { id } });
  }

  public async createUser(userData: CreateUserDTO): Promise<User> {
    const user = this.userRepository.create(userData);
    return await this.userRepository.save(user);
  }

  public async updateUser(id: string, userData: UpdateUserDTO): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      return null;
    }

    Object.assign(user, userData);
    return await this.userRepository.save(user);
  }

  public async deleteUser(id: string): Promise<boolean> {
    const result = await this.userRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
