import {
  Body,
  Controller,
  Delete,
  Get,
  Path,
  Post,
  Put,
  Route,
  SuccessResponse,
  Tags,
  Response,
} from "tsoa";
import { UserService, CreateUserDTO, UpdateUserDTO } from "../services/UserService";
import { User } from "../entities/User";

@Route("users")
@Tags("Users")
export class UserController extends Controller {
  private userService: UserService;

  constructor() {
    super();
    this.userService = new UserService();
  }

  /**
   * Get all users
   */
  @Get()
  @SuccessResponse("200", "Users retrieved successfully")
  public async getUsers(): Promise<User[]> {
    return await this.userService.getAllUsers();
  }

  /**
   * Get a user by ID
   */
  @Get("{id}")
  @SuccessResponse("200", "User retrieved successfully")
  @Response("404", "User not found")
  public async getUser(@Path() id: string): Promise<User> {
    const user = await this.userService.getUserById(id);

    if (!user) {
      this.setStatus(404);
      throw new Error("User not found");
    }

    return user;
  }

  /**
   * Create a new user
   */
  @Post()
  @SuccessResponse("201", "User created successfully")
  @Response("400", "Invalid request")
  public async createUser(@Body() requestBody: CreateUserDTO): Promise<User> {
    this.setStatus(201);
    return await this.userService.createUser(requestBody);
  }

  /**
   * Update an existing user
   */
  @Put("{id}")
  @SuccessResponse("200", "User updated successfully")
  @Response("404", "User not found")
  public async updateUser(
    @Path() id: string,
    @Body() requestBody: UpdateUserDTO
  ): Promise<User> {
    const user = await this.userService.updateUser(id, requestBody);

    if (!user) {
      this.setStatus(404);
      throw new Error("User not found");
    }

    return user;
  }

  /**
   * Delete a user
   */
  @Delete("{id}")
  @SuccessResponse("204", "User deleted successfully")
  @Response("404", "User not found")
  public async deleteUser(@Path() id: string): Promise<void> {
    const deleted = await this.userService.deleteUser(id);

    if (!deleted) {
      this.setStatus(404);
      throw new Error("User not found");
    }

    this.setStatus(204);
  }
}
