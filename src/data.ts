import yaml from 'js-yaml'
import type { EsxiData, RegistryData, ServerStatus } from './types'
import { csvRowToServer, parseServerCsv } from './csv'

const statuses: ServerStatus[] = ['allocated', 'available', 'maintenance']

export async function loadRegistry(): Promise<RegistryData> {
  const [serversResponse, esxiResponse] = await Promise.all([
    fetch(`${import.meta.env.BASE_URL}data/servers.csv`, { cache: 'no-store' }),
    fetch(`${import.meta.env.BASE_URL}data/esxi.yaml`, { cache: 'no-store' }),
  ])
  if (!serversResponse.ok) throw new Error(`サーバ台帳を読み込めませんでした (${serversResponse.status})`)
  if (!esxiResponse.ok) throw new Error(`ESXi 台帳を読み込めませんでした (${esxiResponse.status})`)

  const servers = parseServerCsv(await serversResponse.text()).map(csvRowToServer)
  const parsedEsxi = yaml.load(await esxiResponse.text()) as Partial<EsxiData> | null
  if (!parsedEsxi || !Array.isArray(parsedEsxi.hosts)) {
    throw new Error('esxi.yaml の形式が正しくありません')
  }

  servers.forEach((server, index) => {
    if (!server.hostname || !server.ip || !statuses.includes(server.status)) {
      throw new Error(`servers.csv の ${index + 2} 行目に必須項目がありません`)
    }
  })

  parsedEsxi.hosts.forEach((host, index) => {
    if (!host.id || !host.name || !host.url || !host.username || !host.password) {
      throw new Error(`esxi.yaml の ${index + 1} 件目に必須項目がありません`)
    }
  })

  const esxiIds = new Set(parsedEsxi.hosts.map((host) => host.id))
  servers.forEach((server) => {
    if (server.esxiId && !esxiIds.has(server.esxiId)) {
      throw new Error(`${server.hostname} が参照する ESXi「${server.esxiId}」が見つかりません`)
    }
  })

  return { updatedAt: serversResponse.headers.get('last-modified') ?? new Date().toISOString(), servers, esxiHosts: parsedEsxi.hosts }
}
