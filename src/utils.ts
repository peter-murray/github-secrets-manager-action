import * as core from '@actions/core';
import * as github from '@actions/github';
import {Octokit} from '@octokit/core';

export function getGitHubToken(): string {
  const token = process.env['GITHUB_TOKEN'];

  if (!token) {
    throw new Error('GitHub Token was not set for environment variable "GITHUB_TOKEN"');
  }
  return token;
}

export function getRequiredInput(name: string): string {
  return core.getInput(name, {required: true});
}

export function getOctokit(token?: string): Octokit {
  let octokitToken: string;

  if (!token) {
    octokitToken = getRequiredInput('github_token');
  } else {
    octokitToken = token;
  }
  return github.getOctokit(octokitToken);
}