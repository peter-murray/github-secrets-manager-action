import {RepoSecretData} from './types.js';

export class RepositorySecret {

  private data: RepoSecretData;

  readonly organization: string;

  readonly repository: string;

  constructor(organization: string, repository: string, data: RepoSecretData) {
    this.organization = organization;
    this.repository = repository;
    this.data = data;
  }

  get name(): string {
    return this.data.name;
  }

  get updated(): string {
    return this.data.updated_at;
  }

  get created(): string {
    return this.data.created_at;
  }
}