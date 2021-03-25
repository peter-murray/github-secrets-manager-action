import { Octokit } from '@octokit/core';

import { OrganizationSecret } from './OrganizationSecret';
import { Encrypt } from './Encrypt';
import { Repository, SecretPublicKey, OrgSecretVisibility } from './types';

export class SecretsManager {

  private octokit: Octokit;

  private organization: string;

  constructor(octokit: Octokit, organization: string) {
    this.octokit = octokit;
    this.organization = organization;
  }

  async getOrganizationSecret(name: string): Promise<OrganizationSecret | undefined> {
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
        if (err.status === 404) {
          return undefined;
        }
        throw err;
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
    return this.octokit.repos.get({
        owner: this.organization,
        repo: name,
        mediaType: {
          previews: ['nebula']
        }
      }).then(result => {
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
        if (err.status === 404) {
          return undefined;
        }
        throw err;
      });
  }

  async getRepositoryPublicKey(name: string): Promise<SecretPublicKey | undefined> {
    return this.getRepository(name)
      .then(repo => {
        if (repo) {
          return this.octokit.actions.getRepoPublicKey({ owner: repo.owner, repo: repo.name })
        }
      })
      .then(result => {
        if (result && result.data) {
          return {
            id: result.data.key_id,
            key: result.data.key,
          };
        }
        return undefined;
      })
      .catch(err => {
        if (err.status === 404) {
          return undefined;
        }
        throw err;
      });
  }

  async getOrganizationPublicKey(): Promise<SecretPublicKey | undefined> {
    return this.octokit.actions.getOrgPublicKey({ org: this.organization })
      .then(result => {
        if (result && result.data) {
          return {
            id: result.data.key_id,
            key: result.data.key,
          };
        }
        return undefined;
      });
  }

  async saveOrUpdateOrganizationSecret(
    secretName: string,
    value: string,
    visibility?: OrgSecretVisibility,
    selectedRepoIds?: number[]): Promise<'created' | 'updated'> {

    return Promise.all([
      this.getOrganizationPublicKey(),
      this.getOrganizationSecret(secretName)
    ]).then(results => {
      const keyResult = results[0];

      if (!keyResult) {
        throw new Error(`Failed to resolve a public key for the organization ${this.organization}`);
      }

      const encrypter = new Encrypt(keyResult.key);
      const encryptedSecret = encrypter.encryptValue(value);
      const payload = {
        org: this.organization,
        secret_name: secretName,
        key_id: keyResult.id,
        encrypted_value: encryptedSecret,
      }

      const existingOrgSecret = results[1];
      if (!existingOrgSecret) {
        // New secret, some values are no longer optional
        payload['visibility'] = visibility ? visibility : 'all';

        if (visibility === 'selected') {
          payload['selected_repository_ids'] = selectedRepoIds ? selectedRepoIds : [];
        }
      } else {
        // updating an existing secret, some parameters are optional if not provided
        if (visibility) {
          payload['visibility'] = visibility;
        } else {
          payload['visibility'] = existingOrgSecret.visibility
        }

        if (visibility === 'selected' && selectedRepoIds) {
          payload['selected_repository_ids'] = selectedRepoIds ? selectedRepoIds : [];
        }
      }

      return this.octokit.actions.createOrUpdateOrgSecret(payload);
    }).then(result => {
      if (result.status === 201) {
        return 'created';
      } else if (result.status === 204) {
        return 'updated';
      } else {
        throw new Error(`Unexpected status code from setting secret value ${result.status}`);
      }
    });
  }

  async saveOrUpdateRepositorySecret(repositoryName: string, secretName: string, value: string): Promise<'created' | 'updated'> {
    return this.getRepositoryPublicKey(repositoryName)
      .then(key => {
        if (!key) {
          throw new Error(`Failed to resolve public key for repository ${this.organization}/${repositoryName}`);
        }
        const encrypter = new Encrypt(key.key);
        const encryptedSecret = encrypter.encryptValue(value);

        return this.octokit.actions.createOrUpdateRepoSecret({
          owner: this.organization,
          repo: repositoryName,
          secret_name: secretName,
          key_id: key.id,
          encrypted_value: encryptedSecret
        })
      })
      .then(result => {
        if (result.status === 201) {
          return 'created';
        } else if (result.status === 204) {
          return 'updated';
        } else {
          throw new Error(`Unexpected status code from setting secret value ${result.status}`);
        }
      });
  }

  async deleteOrganizationSecret(secretName: string): Promise<boolean> {
    return this.octokit.actions.deleteOrgSecret({
      org: this.organization,
      secret_name: secretName
    }).then(result => {
      return result.status === 204;
    });
  }

  async deleteRepositorySecret(repositoryName: string, secretName: string): Promise<boolean> {
    return this.getRepository(repositoryName)
      .then(repo => {
        if (repo) {
          return this.octokit.actions.deleteRepoSecret({
            owner: repo.owner,
            repo: repo.name,
            secret_name: secretName
          });
        }
      })
      .then(result => {
        if (result) {
          return result.status === 204;
        }
        return false;
      })
      .catch(err => {
        if (err.status === 404) {
          return true;
        }
        throw err;
      });
  }
}

