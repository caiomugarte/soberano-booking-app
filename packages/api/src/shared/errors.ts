export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = 'BAD_REQUEST',
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class SlotTakenError extends AppError {
  constructor() {
    super('Este horário já está ocupado. Escolha outro horário.', 409, 'SLOT_TAKEN');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} não encontrado(a).`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado.') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 422, 'VALIDATION_ERROR');
  }
}

export class TenantNotFoundError extends AppError {
  constructor() {
    super('Tenant não encontrado.', 404, 'TENANT_NOT_FOUND');
  }
}

export class TenantInactiveError extends AppError {
  constructor() {
    super('Tenant inativo.', 403, 'TENANT_INACTIVE');
  }
}
