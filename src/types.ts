export type ServerStatus = 'allocated' | 'available' | 'maintenance'

export type Assignee = {
  name: string
  id: string
}

export type LoginCredentials = {
  username: string
  password: string
}

export type EsxiHost = LoginCredentials & {
  id: string
  name: string
  url: string
}

export type Server = {
  hostname: string
  ip: string
  assignee: Assignee | null
  purpose?: string
  environment?: string
  status: ServerStatus
  credentials?: LoginCredentials
  esxiId?: string
}

export type RegistryData = {
  updatedAt: string
  servers: Server[]
  esxiHosts: EsxiHost[]
}

export type EsxiData = {
  hosts: EsxiHost[]
}
