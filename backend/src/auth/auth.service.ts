import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './interfaces/user.interface';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(@InjectModel('User') private readonly userModel: Model<User>) {}

  async signup(signupDto: SignupDto): Promise<User> {
    const { username, email, password } = signupDto;
    const existingUser = await this.userModel.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      throw new ConflictException('User already exists');
    }
    const createdUser = new this.userModel({ username, email, password });
    return createdUser.save();
  }

  async validateUser(loginDto: LoginDto): Promise<User> {
    const { identifier, password } = loginDto;
    const user = await this.userModel.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }
}
