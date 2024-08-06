import * as core from '@actions/core';
import { SecretsManager } from '../secrets/SecretsManager.js';
import { getRequiredInput, getOctokit } from '../utils.js'

async function run() {
  try {
    await exec();
  } catch (err: any) {
    core.setFailed(err);
  }
}
run();

async function exec() {
  const inputs = {
    repository:  getRequiredInput('repository'),
    secretName: getRequiredInput('secret'),
    secretValue: getRequiredInput('value'),
    environment: getRequiredInput('environment'),
    overwrite: core.getBooleanInput('overwrite_existing', {required: true}),
  };

  // Register the secret value so it is masked in logs
  core.setSecret(inputs.secretValue);

  try {
    const repo = validateRepository(inputs.repository);
    const secrets: SecretsManager = new SecretsManager(getOctokit(), repo.owner);

    const result: string = await secrets.saveOrUpdateEnvironmentSecret(repo.repo, inputs.environment, inputs.secretName, inputs.secretValue, inputs.overwrite);

    if (result === 'created') {
      core.info(`Successfully created secret ${inputs.repository}/${inputs.environment}/${inputs.secretName}.`);
    } else if (result === 'updated') {
      core.info(`Successfully updated secret ${inputs.repository}/${inputs.environment}/${inputs.secretName}.`);
    } else if (result === 'exists') {
      core.info(`Secret ${inputs.repository}/${inputs.environment}/${inputs.secretName}, already exists, but not overwriting existing value.`);
    } else {
      core.setFailed(`Did not succeed in creating/updating secret ${inputs.repository}/${inputs.environment}/${inputs.secretName}`);
    }
  } catch (err: any) {
    core.error(`Failed to add/update secret ${inputs.repository}/${inputs.environment}/${inputs.secretName}.`);
    core.setFailed(err);
  }
}


type repo = {repo: string, owner: string};

function validateRepository(repository: string): repo {
  if (repository.indexOf('/') > 0) {
    const parts = repository.split('/');
    return {
      owner: parts[0],
      repo: parts[1]
    }
  } else {
    throw new Error(`A fully qualified repository name of the form '<owner>/<repo>' is required, but was '${repository}'.`);
  }
}