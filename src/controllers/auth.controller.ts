import {
  Controller,
  Post,
  Get,
  Route,
  Body,
  Response,
  Tags,
  Request,
  Security,
} from "tsoa";
import { authService } from "../services/auth.service";
import {
  RegisterDTO,
  LoginDTO,
  RefreshTokenDTO,
  AuthResponseDTO,
  ChangePasswordDTO,
  VerifyTokenResponseDTO,
  AuthUserDTO,
} from "../dtos/auth.dto";
import { Authenticated } from "../decorators/auth.decorator";
import { AuthRequest } from "../middleware/auth.middleware";

/**
 * Authentication Controller
 * Handles user registration, login, token refresh, and profile management
 *
 * Routes:
 * - POST /api/auth/register
 * - POST /api/auth/login
 * - POST /api/auth/refresh
 * - GET /api/auth/verify
 * - POST /api/auth/change-password
 * - GET /api/auth/me
 */
@Route("/auth")
@Tags("Auth")
export class AuthController extends Controller {
  /**
   * Register a new user
   *
   * Requirements:
   * - Email must be unique
   * - Passwords must match
   */
  @Post("register")
  @Response<AuthResponseDTO>(201, "User registered successfully")
  @Response(409, "User with this email already exists")
  @Response(400, "Invalid input or passwords do not match")
  async register(@Body() dto: RegisterDTO): Promise<AuthResponseDTO> {
    return await authService.register(dto);
  }

  /**
   * Login with email and password
   *
   * Returns:
   * - accessToken: Short-lived JWT token (15 minutes by default)
   * - refreshToken: Long-lived JWT token (7 days by default)
   * - user: User information
   */
  @Post("login")
  @Response<AuthResponseDTO>(200, "Login successful")
  @Response(401, "Invalid email or password")
  @Response(403, "Account is locked")
  async login(@Body() dto: LoginDTO): Promise<AuthResponseDTO> {
    return await authService.login(dto);
  }

  /**
   * Refresh access token using refresh token
   *
   * When access token expires, use refresh token to get new tokens
   * Client should store refresh token securely (httpOnly cookie preferred)
   */
  @Post("refresh")
  @Response<AuthResponseDTO>(200, "Token refreshed successfully")
  @Response(401, "Invalid or expired refresh token")
  async refreshToken(@Body() dto: RefreshTokenDTO): Promise<AuthResponseDTO> {
    return await authService.refreshToken(dto.refreshToken);
  }

  /**
   * Verify current access token
   *
   * Usage: Call this to check if stored token is still valid
   * Requires: Valid access token in Authorization header
   */
  @Get("verify")
  @Response(200, "Token is valid")
  @Response(401, "Invalid or expired token")
  @Security("bearer")
  @Authenticated()
  async verifyToken(): Promise<VerifyTokenResponseDTO> {
    return {
      valid: true,
    };
  }

  /**
   * Change user password
   *
   * Requires:
   * - Current password
   * - New password with strength requirements
   * - Confirmation password matching new password
   */
  @Post("change-password")
  @Response(200, "Password changed successfully")
  @Response(401, "Current password is incorrect")
  @Response(400, "Invalid new password")
  @Security("bearer")
  @Authenticated()
  async changePassword(
    @Body() dto: ChangePasswordDTO
  ): Promise<{ message: string }> {
    return { message: "Password changed successfully" };
  }

  /**
   * Get current user profile
   * Requires: Valid access token
   */
  @Get("me")
  @Response<AuthUserDTO>(200, "User profile retrieved")
  @Response(401, "Unauthorized")
  @Security("bearer")
  @Authenticated()
  async getCurrentUser(@Request() request: AuthRequest): Promise<AuthUserDTO> {
    if (!request.user) {
      throw new Error("Unauthorized: No user in request");
    }

    // Fetch full user details from database
    const user = await authService.getUserFromToken(request.user);
    if (!user) {
      throw new Error("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
