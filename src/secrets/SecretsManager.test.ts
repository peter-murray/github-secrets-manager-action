import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import {SecretsManager} from './SecretsManager.js';
import {getGitHubTestToken, getOctokit} from '../utils.js'

describe('SecretsManager', () => {

  let secretsManager: SecretsManager;

  beforeAll(() => {
    const octokit = getOctokit(getGitHubTestToken());
    const orgName = 'octodemo';

    secretsManager = new SecretsManager(octokit, orgName);
  });

  describe('#getOrganizationSecret()', () => {

    it('should get a secret visible to all', async () => {
      const secretName = 'ALL_REPOSITORIES_SECRET';
      const secret = await secretsManager.getOrganizationSecret(secretName);

      expect(secret).to.not.be.undefined;
      expect(secret).to.have.property('name', secretName);
      expect(secret).to.have.property('visibility', 'all');
    });

    it('should get a secret visible to private and internal', async () => {
      const secretName = 'PRIVATE_AND_INTERNAL_SECRET';
      const secret = await secretsManager.getOrganizationSecret(secretName);

      expect(secret).to.not.be.undefined;
      expect(secret).to.have.property('name', secretName);
      expect(secret).to.have.property('visibility', 'private');
    });

    it('should get a secret shared with selected repositories', async () => {
      const secretName = 'SELECTED_REPOS_SECRET';
      const secret = await secretsManager.getOrganizationSecret(secretName);

      expect(secret).to.not.be.undefined;
      expect(secret).to.have.property('name', secretName);
      expect(secret).to.have.property('visibility', 'selected');
    });
  });


  describe('#getRepositoryPublicKey()', () => {

    it('should get a key for a repoistory that exists', async () => {
      const key = await secretsManager.getRepositoryPublicKey('secrets-test-repository');

      expect(key).to.not.be.undefined;
      expect(key).to.have.property('id').to.have.length.greaterThan(0);
      expect(key).to.have.property('key').to.have.length.greaterThan(0);
    });

    it('should fail to get a key for a repoistory that does not exist', async () => {
      const key = await secretsManager.getRepositoryPublicKey('non-existent-2021-03-25');

      expect(key).to.be.undefined;
    });
  });


  describe('#getOrganizationPublicKey()', () => {

    it('should get a key', async () => {
      const key = await secretsManager.getOrganizationPublicKey();

      expect(key).to.not.be.undefined;
      expect(key).to.have.property('id').to.have.length.greaterThan(0);
      expect(key).to.have.property('key').to.have.length.greaterThan(0);
    });
  });


  describe('#saveOrUpdateOrganizationSecret() and #deleteOrganizationSecret()', () => {

    let secretName: string | undefined;

    afterEach(async () => {
      if (secretName) {
        const result = await secretsManager.deleteOrganizationSecret(secretName);

        if (!result) {
          throw new Error(`Failed to remove organization secret ${secretName}`);
        }
      }
    });

    it('should create a new secret with implicity all visibility', async () => {
      secretName = `org_secret_test_${Date.now()}`;

      const state = await secretsManager.saveOrUpdateOrganizationSecret(secretName, 'testing');
      expect(state).to.equal('created');
    });

    it('should create a new secret with private visibility', async () => {
      secretName = `org_secret_test_${Date.now()}`;

      const state = await secretsManager.saveOrUpdateOrganizationSecret(secretName, 'testing', 'private');
      expect(state).to.equal('created');
    });

    it('should create a new secret with selected repos visibility', async () => {
      secretName = `org_secret_test_${Date.now()}`;

      const state = await secretsManager.saveOrUpdateOrganizationSecret(secretName, 'testing', 'selected');
      expect(state).to.equal('created');
    });

    it('should create a secret and then update it', async () => {
      secretName = `org_secret_test_${Date.now()}`;

      const state = await secretsManager.saveOrUpdateOrganizationSecret(secretName, 'testing');
      expect(state).to.equal('created');

      const updatedState = await secretsManager.saveOrUpdateOrganizationSecret(secretName, 'testing');
      expect(updatedState).to.equal('updated');
    });
  });


  describe('#saveOrUpdateRepositorySecret() and #deleteRepositorySecret()', () => {

    const repositoryName = 'secrets-test-repository';

    let secretName: string | undefined;

    afterEach(async () => {
      if (secretName) {
        const result = await secretsManager.deleteRepositorySecret(repositoryName, secretName);
        if (!result) {
          throw new Error(`Failed to remove repository secret ${repositoryName}/${secretName}`);
        }
        secretName = undefined;
      }
    });

    it('it should create a secret', async () => {
      secretName = `repo_secret_test_${Date.now()}`;

      const state = await secretsManager.saveOrUpdateRepositorySecret(repositoryName, secretName, 'testing');
      expect(state).to.equal('created');
    });

    it('it should fail on a repository that does not exist', async () => {
      secretName = `repo_secret_test_${Date.now()}`;
      const nonExistentRepo = `abc-${Date.now()}`

      try {
        await secretsManager.saveOrUpdateRepositorySecret(nonExistentRepo, secretName, 'testing');
      } catch (err: any) {
        expect(err.message).to.contain(nonExistentRepo);
      }
    });
  });

  describe('#saveOrUpdateEnvironmentSecret() and #deleteEnvironmentSecret()', () => {

    const repositoryName = 'secrets-test-repository';

    const environmentName = 'testing';

    let secretName: string | undefined;

    afterEach(async () => {
      if (secretName) {
        const result = await secretsManager.deleteEnvironmentSecret(repositoryName, environmentName, secretName);

        if (!result) {
          throw new Error(`Failed to remove repository secret ${repositoryName}/${environmentName}/${secretName}`);
        }
        secretName = undefined;
      }
    });

    it('should create a new secret', async () => {
      secretName = `env_secret_test_${Date.now()}`;

      const state = await secretsManager.saveOrUpdateEnvironmentSecret(repositoryName, environmentName, secretName, 'testing');
      expect(state).to.equal('created');
    });

    it('should update an existing secret', async () => {
      secretName = `env_secret_test_${Date.now()}`;

      const state = await secretsManager.saveOrUpdateEnvironmentSecret(repositoryName, environmentName, secretName, 'testing');
      expect(state).to.equal('created');

      const updatedState = await secretsManager.saveOrUpdateEnvironmentSecret(repositoryName, environmentName, secretName, 'testing');
      expect(updatedState).to.equal('updated');
    });

    it('should not update an existing secret if overwrite is false', async () => {
      secretName = `env_secret_test_${Date.now()}`;

      const state = await secretsManager.saveOrUpdateEnvironmentSecret(repositoryName, environmentName, secretName, 'testing');
      expect(state).to.equal('created');

      const updatedState = await secretsManager.saveOrUpdateEnvironmentSecret(repositoryName, environmentName, secretName, 'testing', false);
      expect(updatedState).to.equal('exists');
    });
  });
});