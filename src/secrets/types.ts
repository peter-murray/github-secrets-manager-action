export type Repository = {
  id: number,
  node_id: string,
  name: string,
  owner: string,
  full_name: string
}

export type OrgSecretData = {
  name: string
  created_at: string
  updated_at: string
  visibility: 'private' | 'selected' | 'all'
  selected_repositories_url?: string
}

export type SecretPublicKey = {
  id: string,
  key: string
}

export type OrgSecretVisibility = 'all' | 'private' | 'selected';