import { OrganizationSecret } from './OrganizationSecret.js';
import { RepositorySecret } from './RepositorySecret.js';
import { Encrypt } from './Encrypt.js';
import { Repository, SecretPublicKey, OrgSecretVisibility, EnvironmentSecretPublicKey, Environment, EnvironmentSecretData } from './types.js';

export class SecretsManager {

  private octokit: any;

  private organization: string;

  constructor(octokit: any, organization: string) {
    this.octokit = octokit;
    this.organization = organization;
  }

  async getOrganizationSecret(name: string): Promise<OrganizationSecret | undefined> {
    const secretPayload = {
      org: this.organization,
      secret_name: name
    };

    return this.octokit.rest.actions.getOrgSecret(secretPayload)
      .then(resp => {
        if (resp.status === 200) {
          const data = resp.data;

          if (data.selected_repositories_url) {
            return this.octokit.rest.actions.listSelectedReposForOrgSecret(secretPayload)
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

  async getRepositorySecret(repositoryName: string, secretName: string): Promise<RepositorySecret | undefined> {
    const secretPayload = {
      owner: this.organization,
      repo: repositoryName,
      secret_name: secretName
    }

    return this.octokit.rest.actions.getRepoSecret(secretPayload)
      .then(resp => {
        if (resp.status === 200) {
          return new RepositorySecret(this.organization, repositoryName, resp.data);
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

  async getEnvironmentSecret(repositoryName: string, environmentName: string, secretName: string): Promise<EnvironmentSecretData | undefined> {
    const environment = await this.getEnvironment(repositoryName, environmentName);

    if (environment) {
      try {
        const secret = await this.octokit.rest.actions.getEnvironmentSecret({
          repository_id: environment.repository_id,
          environment_name: environment.name,
          secret_name: secretName,
        });

        return {
          ...secret.data,
          repository_id: environment.repository_id,
          environment_name: environment.name,
        };
      } catch (err: any) {
        if (err.status === 404) {
          return undefined;
        }
        throw err;
      }
    }
    return undefined;
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
    return this.octokit.rest.actions.addSelectedRepoToOrgSecret({
      org: this.organization,
      secret_name: secret.name,
      repository_id: repo.id,
    }).then(result => {
      return result.status === 204;
    });
  }

  async removeRepositoryFromSecret(secret: OrganizationSecret, repo: Repository): Promise<boolean> {
    return this.octokit.rest.actions.removeSelectedRepoFromOrgSecret({
      org: this.organization,
      repository_id: repo.id,
      secret_name: secret.name
    }).then(result => {
      return result.status === 204;
    })
  }

  async getEnvironment(repositoryName: string, environmentName: string): Promise<Environment> {
    return this.getRepository(repositoryName)
      .then(repo => {
        if (repo) {
          return this.octokit.rest.repos.getEnvironment({
            owner: repo.owner,
            repo: repo.name,
            environment_name: environmentName
          })
          .then(data => {
            return {
              id: data.data.id,
              name: data.data.name,
              url: data.data.url,
              created_at: data.data.created_at,
              updated_at: data.data.updated_at,
              repository_id: repo.id,
            }
          })
          .catch(err => {
            if (err.status === 404) {
              return undefined;
            }
            throw err;
          });
        }

        return undefined;
      });
  }

  async getRepository(name: string): Promise<Repository | undefined> {
    return this.octokit.rest.repos.get({
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
          return this.octokit.rest.actions.getRepoPublicKey({ owner: repo.owner, repo: repo.name })
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

  async getEnvironmentPublicKey(repoName: string, environmentName: string): Promise<EnvironmentSecretPublicKey | undefined> {
    return this.getRepository(repoName)
      .then(repo => {
        if (repo) {
          return this.octokit.rest.actions.getEnvironmentPublicKey({
            repository_id: repo.id,
            environment_name: environmentName,
          })
          .then(result => {
            if (result && result.data) {
              return {
                id: result.data.key_id,
                key: result.data.key,
                repository_id: repo.id,
              };
            }
            return undefined;
          });
        }
      })
      .catch(err => {
        if (err.status === 404) {
          return undefined;
        }
        throw err;
      });
  }


  async getOrganizationPublicKey(): Promise<SecretPublicKey | undefined> {
    const result = await this.octokit.rest.actions.getOrgPublicKey({ org: this.organization });
    return {
      id: result.data.key_id,
      key: result.data.key,
    };
  }

  async saveOrUpdateOrganizationSecret(secretName: string, value: string, visibility?: OrgSecretVisibility, selectedRepoIds?: number[]): Promise<'created' | 'updated'> {
    const results = await Promise.all([
      this.getOrganizationPublicKey(),
      this.getOrganizationSecret(secretName)
    ]);

    const keyResult = results[0];
    if (!keyResult) {
      throw new Error(`Failed to resolve a public key for the organization ${this.organization}`);
    }

    const encrypter = new Encrypt(keyResult.key);
    const encryptedSecret = await encrypter.encryptValue(value);
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

    const createResult = await this.octokit.rest.actions.createOrUpdateOrgSecret(payload);
    if (createResult.status === 201) {
      return 'created';
    } else if (createResult.status === 204) {
      return 'updated';
    } else {
      throw new Error(`Unexpected status code from setting secret value ${createResult.status}`);
    }
  }

  async saveOrUpdateRepositorySecret(repositoryName: string, secretName: string, value: string, overwrite: boolean = true): Promise<'created' | 'updated' | 'exists'> {
    if (overwrite === false) {
      const existing = await this.getRepositorySecret(repositoryName, secretName);
      if (existing) {
        return 'exists';
      }
    }

    const key = await this.getRepositoryPublicKey(repositoryName)
    if (!key) {
      throw new Error(`Failed to resolve public key for repository ${this.organization}/${repositoryName}`);
    }
    const encrypter = new Encrypt(key.key);
    const encryptedSecret = await encrypter.encryptValue(value);

    const createResult = await this.octokit.rest.actions.createOrUpdateRepoSecret({
      owner: this.organization,
      repo: repositoryName,
      secret_name: secretName,
      key_id: key.id,
      encrypted_value: encryptedSecret
    })

    if (createResult.status === 201) {
      return 'created';
    } else if (createResult.status === 204) {
      return 'updated';
    } else {
      throw new Error(`Unexpected status code from setting secret value ${createResult.status}`);
    }

  }

  async saveOrUpdateEnvironmentSecret(repositoryName: string, environmentName: string, secretName: string, value: string, overwrite: boolean = true): Promise<'created' | 'updated' | 'exists'> {
    if (!overwrite) {
      const existing = await this.getEnvironmentSecret(repositoryName, environmentName, secretName);
      if (existing) {
        return 'exists';
      }
    }

    const key = await this.getEnvironmentPublicKey(repositoryName, environmentName)
    if (!key) {
      throw new Error(`Failed to resolve public key for environment ${this.organization}/${repositoryName}/environment/${environmentName}`);
    }
    const encrypter = new Encrypt(key.key);
    const encryptedSecret = await encrypter.encryptValue(value);

    const result = await this.octokit.rest.actions.createOrUpdateEnvironmentSecret({
      repository_id: key.repository_id,
      environment_name: environmentName,
      secret_name: secretName,
      key_id: key.id,
      encrypted_value: encryptedSecret
    })

    if (result.status === 201) {
      return 'created';
    } else if (result.status === 204) {
      return 'updated';
    } else {
      throw new Error(`Unexpected status code from setting secret value ${result.status}`);
    }
  }

  async deleteOrganizationSecret(secretName: string): Promise<boolean> {
    return this.octokit.rest.actions.deleteOrgSecret({
      org: this.organization,
      secret_name: secretName
    }).then(result => {
      return result.status === 204;
    });
  }

  async deleteRepositorySecret(repositoryName: string, secretName: string): Promise<boolean> {
    const repo = await this.getRepository(repositoryName)

    if (repo) {
      const result = await this.octokit.rest.actions.deleteRepoSecret({
        owner: repo.owner,
        repo: repo.name,
        secret_name: secretName
      });

      if (result) {
        return result.status === 204;
      }
      return false;
    }
    return false;
  }

  async deleteEnvironmentSecret(repositoryName: string, environmentName: string,  secretName: string): Promise<boolean> {
    const secret = await this.getEnvironmentSecret(repositoryName, environmentName, secretName);

    if (secret) {
      const result = await this.octokit.rest.actions.deleteEnvironmentSecret({
        repository_id: secret.repository_id,
        environment_name: secret.environment_name,
        secret_name: secret.name,
      });

      if (result) {
        return result.status === 204;
      }
      return false;
    } else {
      // The secret does not exist, so we can consider it deleted
      return true;
    }
  }
}

