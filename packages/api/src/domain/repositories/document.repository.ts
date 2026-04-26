import type { DocumentEntity } from '../entities/document.js';

export interface CreateDocumentData {
  tenantId: string;
  customerId: string;
  name: string;
  type: string;
  data: string;
}

export interface DocumentRepository {
  create(data: CreateDocumentData): Promise<Omit<DocumentEntity, 'data'>>;
  findByCustomer(customerId: string): Promise<Omit<DocumentEntity, 'data'>[]>;
  findById(id: string): Promise<DocumentEntity | null>;
  deleteById(id: string): Promise<void>;
}
