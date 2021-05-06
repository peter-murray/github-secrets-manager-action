export type Repository = {
  id: number,
  node_id: string,
  name: string,
  owner: string,
  full_name: string
}

//TODO currently ignoring the protection rules
export type Environment = {
  id: number,
  name: string,
  url?: string,
  created_at: string,
  updated_at: string,

  repository_id: number,
}

export type OrgSecretData = {
  name: string
  created_at: string
  updated_at: string
  visibility: 'private' | 'selected' | 'all'
  selected_repositories_url?: string
}

export type EnvironmentSecretData = {
  name: string
  created_at: string
  updated_at: string

  repository_id: number
  environment_name: string
}

export type SecretPublicKey = {
  id: string,
  key: string,
}

export type EnvironmentSecretPublicKey = SecretPublicKey & {
  repository_id: number,
}

export type OrgSecretVisibility = 'all' | 'private' | 'selected';