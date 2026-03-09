import { Body, Controller, Get, Post } from '@nestjs/common';
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
