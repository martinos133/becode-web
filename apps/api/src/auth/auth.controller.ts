import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Public } from './decorators/public.decorator';
import { CurrentUser, RequestUser } from './decorators/user.decorator';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', service: 'auth' };
  }

  @UseGuards(SupabaseAuthGuard)
  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return { user };
  }
}
