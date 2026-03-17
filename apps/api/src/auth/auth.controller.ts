import { Body, Controller, Get, Post } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Public } from './decorators/public.decorator';
import { CurrentUser, RequestUser } from './decorators/user.decorator';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', service: 'auth', provider: 'postgres' };
  }

  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return { user };
  }

  @Public()
  @Post('login')
  async login(@Body() body: { email?: string; password?: string }) {
    const email = body?.email?.trim();
    const password = body?.password ?? '';
    if (!email || !password) {
      return { success: false, error: 'E-mail a heslo sú povinné.' };
    }
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      return { success: false, error: 'Neplatné prihlasovacie údaje.' };
    }
    const token = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: '7d' },
    );
    return { success: true, token };
  }

  @Post('change-password')
  async changePassword(
    @Body() body: { newPassword?: string },
    @CurrentUser() user: RequestUser,
  ) {
    const newPassword = body?.newPassword ?? '';
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Heslo musí mať aspoň 6 znakov.' };
    }
    await this.authService.changePassword(user.id, newPassword);
    return { success: true };
  }

  @Post('create-user')
  async createUser(
    @Body() body: { email?: string; password?: string },
    @CurrentUser() _user: RequestUser,
  ) {
    const email = body?.email?.trim();
    const password = body?.password;
    if (!email || !password) {
      return { success: false, error: 'E-mail a heslo sú povinné.' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Heslo musí mať aspoň 6 znakov.' };
    }
    const result = await this.authService.createUser(email, password);
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true, message: `Používateľ ${email} bol vytvorený.` };
  }
}
