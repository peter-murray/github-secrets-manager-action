import * as core from '@actions/core';
import { SecretsManager } from '../secrets/SecretsManager';
import { getRequiredInput, getOctokit } from '../utils'

async function run() {
  try {
    await exec();
  } catch (err: any) {
    core.setFailed(err);
  }
}
run();

async function exec() {
  const secretName: string = getRequiredInput('secret')
    , secretValue: string = getRequiredInput('value')
    , repository: string = getRequiredInput('repository')
    ;

  // Register the secret value so it is masked in logs
  core.setSecret(secretValue);

  try {
    const repo = validateRepository(repository);
    const secrets: SecretsManager = new SecretsManager(getOctokit(), repo.owner);

    const result: string = await secrets.saveOrUpdateRepositorySecret(repo.repo, secretName, secretValue);

    if (result) {
      core.info(`Successfully ${result} secret ${repository}/${secretName}.`);
    } else {
      core.setFailed(`Did not succeed in creating/updating secret ${repository}/${secretName}`);
    }
  } catch (err: any) {
    core.error(`Failed to add/update secret ${repository}/${secretName}.`);
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