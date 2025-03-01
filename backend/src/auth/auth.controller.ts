import { Controller, Post, Body, Get, Delete, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body() signupDto: SignupDto, @Req() req: Request) {
    const user = await this.authService.signup(signupDto);
    req.session.userId = String(user._id);

    return { message: 'User created successfully', userId: user._id.toString() };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const user = await this.authService.validateUser(loginDto);
    req.session.userId = String(user._id);

    return { message: 'Logged in successfully' };
  }

  @Get('profile')
  async getProfile(@Req() req: Request) {
    if (!req.session || !req.session.userId) {
      return { message: 'Not logged in' };
    }
    return { message: 'Profile retrieved', userId: req.session.userId };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request) {
    return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) return reject(err);
        if (req.res) {
          req.res.clearCookie('connect.sid');
        }
        resolve({ message: 'Logged out successfully' });
      });
    });
  }

  @Delete('delete')
  async deleteUser(@Req() req: Request, @Body('password') password: string) {
    if (!req.session || !req.session.userId) {
      return { message: 'Not authenticated' };
    }
    req.session.destroy((err) => {
      if (err) console.error('Session destruction error:', err);
    });
    return { message: 'User deleted successfully' };
  }
}
