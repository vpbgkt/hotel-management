import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { UserRole } from '../../user/entities/user.entity';

interface JwtPayload {
  sub: string;
  email?: string;
  phone?: string;
  role: UserRole;
  hotelId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'secret',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUser(payload);
    
    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }
}
