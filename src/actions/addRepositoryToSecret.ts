import * as core from '@actions/core';
import { SecretsManager } from '../SecretsManager';
import { getRequiredInput, getOctokit } from '../utils'

async function run() {
  try {
    await exec();
  } catch (err) {
    core.setFailed(err);
  }
}
run();

async function exec() {
  const organization: string = getRequiredInput('organization')
    , secretName: string = getRequiredInput('secret')
    , repository: string = getRequiredInput('repository')
    ;

  try {
    const secrets: SecretsManager = new SecretsManager(getOctokit(), organization);

    const result: boolean = await secrets.addSecretToRepository(secretName, repository);

    if (result) {
      core.info(`Successfully added ${repository} to secret ${organization}/${secretName}.`);
    } else {
      core.setFailed(`Did not succeed in adding ${repository} to secret ${organization}/${secretName}`);
    }
  } catch (err) {
    core.error(`Failed to add repository ${repository} to secret ${organization}/${secretName}.`);
    core.setFailed(err);
  }
}
