import { expect } from 'chai';

import {SecretsManager} from './SecretsManager';
import {getGitHubToken, getOctokit} from './utils'

describe('SecretsManager', () => {

  let secretsManager: SecretsManager;

  before(() => {
    const octokit = getOctokit(getGitHubToken());
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
});