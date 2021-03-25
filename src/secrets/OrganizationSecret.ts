import {OrgSecretData, Repository} from './types';

export class OrganizationSecret {

  private data: OrgSecretData;

  readonly organization: string;

  readonly sharedRepositories?: Repository[];

  constructor(organization: string, data: OrgSecretData, selectedRepos?: Repository[]) {
    this.organization = organization;
    this.data = data;
    this.sharedRepositories = selectedRepos;
  }

  get name(): string {
    return this.data.name;
  }

  get visibility(): string {
    return this.data.visibility;
  }

  get updated(): string {
    return this.data.updated_at;
  }

  get created(): string {
    return this.data.created_at;
  }

  isSharedWithRepositories(): boolean {
    return this.visibility === 'selected' && this.sharedRepositories !== undefined;
  }
}