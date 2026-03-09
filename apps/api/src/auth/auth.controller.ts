import { Controller, Get } from '@nestjs/common';
import { Public } from './decorators/public.decorator';
import { CurrentUser, RequestUser } from './decorators/user.decorator';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', service: 'auth' };
  }

  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return { user };
  }
}
