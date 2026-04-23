// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClientOrExtended = any;
import type { DocumentEntity } from '../../../domain/entities/document.js';
import type {
  CreateDocumentData,
  DocumentRepository,
} from '../../../domain/repositories/document.repository.js';

const selectWithoutData = {
  id: true,
  tenantId: true,
  customerId: true,
  name: true,
  type: true,
  createdAt: true,
} as const;

export class PrismaDocumentRepository implements DocumentRepository {
  constructor(private db: PrismaClientOrExtended) {}

  async create(data: CreateDocumentData): Promise<Omit<DocumentEntity, 'data'>> {
    return this.db.document.create({ data, select: selectWithoutData });
  }

  async findByCustomer(customerId: string): Promise<Omit<DocumentEntity, 'data'>[]> {
    return this.db.document.findMany({
      where: { customerId },
      select: selectWithoutData,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<DocumentEntity | null> {
    return this.db.document.findUnique({ where: { id } });
  }

  async deleteById(id: string): Promise<void> {
    await this.db.document.delete({ where: { id } });
  }
}
