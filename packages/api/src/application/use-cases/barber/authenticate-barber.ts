import type { ProviderRepository } from '../../../domain/repositories/provider.repository.js';
import { comparePassword } from '../../../infrastructure/auth/password.service.js';
import { generateAccessToken, generateRefreshToken } from '../../../infrastructure/auth/jwt.service.js';
import { UnauthorizedError } from '../../../shared/errors.js';

export class AuthenticateBarber {
  constructor(private barberRepo: ProviderRepository) {}

  async execute(email: string, password: string): Promise<{ accessToken: string; refreshToken: string }> {
    const barber = await this.barberRepo.findByEmail(email);
    if (!barber) {
      throw new UnauthorizedError('Email ou senha incorretos.');
    }

    const valid = await comparePassword(password, barber.password);
    if (!valid) {
      throw new UnauthorizedError('Email ou senha incorretos.');
    }

    return {
      accessToken: generateAccessToken(barber.id, barber.tenantId),
      refreshToken: generateRefreshToken(barber.id, barber.tenantId),
    };
  }
}
