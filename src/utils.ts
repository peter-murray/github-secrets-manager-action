import * as core from '@actions/core';
import * as github from '@actions/github';
import {Octokit} from '@octokit/core';

declare const GitHubConst: typeof Octokit & import("@octokit/core/dist-types/types").Constructor<import("@octokit/plugin-rest-endpoint-methods/dist-types/types").Api & {
  paginate: import("@octokit/plugin-paginate-rest").PaginateInterface;
}>;
export type GitHub = InstanceType<typeof GitHubConst>

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

export function getOctokit(token?: string): GitHub {
  let octokitToken: string;

  if (!token) {
    octokitToken = getRequiredInput('github_token');
  } else {
    octokitToken = token;
  }
  return github.getOctokit(octokitToken);
}

export function requireStringArgumentValue(name: string, value: any) {
  if (value === null || value === undefined) {
    throw new Error(`Need to provide a value for argument "${name}"`);
  }

  const strValue = `${value}`.trim();
  if (strValue.length === 0) {
    throw new Error(`"${name}" value provided was zero length or empty string`)
  }

  return strValue;
}