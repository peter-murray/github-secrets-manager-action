import { Octokit } from '@octokit/core';

type Repository = {
  id: number,
  node_id: string,
  name: string,
  owner: string,
  full_name: string
}

export class SecretsManager {

  private octokit: Octokit;

  private organization: string;

  constructor(octokit: Octokit, organization: string) {
    this.octokit = octokit;
    this.organization = organization;
  }

  async getOrganizationSecret(name: string): Promise<OrganizationSecret | undefined>  {
    const secretPayload = {
      org: this.organization,
      secret_name: name
    };

    return this.octokit.actions.getOrgSecret(secretPayload)
      .then(resp => {
      if (resp.status === 200) {
        const data = resp.data;

        if (data.selected_repositories_url) {
          return this.octokit.actions.listSelectedReposForOrgSecret(secretPayload)
            .then(resp => {
              const selectedRepos = resp.data;

              let shared: Repository[] | undefined;
              if (selectedRepos.total_count > 0) {
                shared = selectedRepos.repositories.map(repo => {
                  return {
                    id: repo.id,
                    node_id: repo.node_id,
                    name: repo.name,
                    full_name: repo.full_name,
                    owner: repo.owner.login
                  };
                })
              }

              return shared;
            }).then(sharedRepos => {
              return new OrganizationSecret(this.organization, data, sharedRepos);
            });
        } else {
          return new OrganizationSecret(this.organization, resp.data);
        }
      } else {
        throw new Error(`Unexpected status code ${resp.status}`);
      }
    }).catch(err => {
      //TODO validate the error type?
      return undefined;
    });
  }

  async addSecretToRepository(name: string, repositoryName: string): Promise<boolean> {
    return Promise.all([
      this.getOrganizationSecret(name),
      this.getRepository(repositoryName)
    ]).then(results => {
      const secret: OrganizationSecret | undefined = results[0];
      if (secret === undefined) {
        throw new Error(`secret ${name} was not found in organization ${this.organization}`);
      }

      const repository: Repository | undefined = results[1];
      if (repository === undefined) {
        throw new Error(`repository ${repositoryName} was not found in organization ${this.organization}`);
      }

      return this.addRepositoryToSecret(secret, repository);
    });
  }

  async removeSecretFromRepository(name: string, repositoryName: string): Promise<boolean> {
    return Promise.all([
      this.getOrganizationSecret(name),
      this.getRepository(repositoryName)
    ]).then(results => {
      const secret: OrganizationSecret | undefined = results[0];
      if (secret === undefined) {
        throw new Error(`secret ${name} was not found in organization ${this.organization}`);
      }

      const repository: Repository | undefined = results[1];
      if (repository === undefined) {
        throw new Error(`repository ${repositoryName} was not found in organization ${this.organization}`);
      }

      return this.removeRepositoryFromSecret(secret, repository);
    });
  }

  async addRepositoryToSecret(secret: OrganizationSecret, repo: Repository): Promise<boolean> {
    return this.octokit.actions.addSelectedRepoToOrgSecret({
      org: this.organization,
      secret_name: secret.name,
      repository_id: repo.id,
    }).then(result => {
      return result.status === 204;
    });
  }

  async removeRepositoryFromSecret(secret: OrganizationSecret, repo: Repository): Promise<boolean> {
    return this.octokit.actions.removeSelectedRepoFromOrgSecret({
      org: this.organization,
      repository_id: repo.id,
      secret_name: secret.name
    }).then(result => {
      return result.status === 204;
    })
  }

  async getRepository(name: string): Promise<Repository | undefined> {
    return this.octokit.repos.get({owner: this.organization, repo: name})
      .then(result => {
        if (result.status === 200) {
          const repo = result.data;
          return {
            id: repo.id,
            node_id: repo.node_id,
            name: repo.name,
            full_name: repo.full_name,
            owner: this.organization
          }
        }
        return undefined;
      }).catch(err => {
        //TODO validate error type
        return undefined;
      });
  }
}


type OrgSecretData = {
  name: string
  created_at: string
  updated_at: string
  visibility: 'private' | 'selected' | 'all'
  selected_repositories_url?: string
}

class OrganizationSecret {

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