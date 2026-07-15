import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadRegistry, resolveDataUrl } from './data'

afterEach(() => vi.unstubAllGlobals())

describe('loadRegistry', () => {
  it('GitLab Pages のベースパス配下へデータURLを追従させる', () => {
    expect(resolveDataUrl('servers.csv', '/group/project/', 'https://pages.example/old/')).toBe('https://pages.example/group/project/data/servers.csv')
    expect(resolveDataUrl('esxi.yaml', './', 'https://pages.example/new-project/index.html')).toBe('https://pages.example/new-project/data/esxi.yaml')
  })

  it('YAML の台帳を読み込む', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(`hostname,ip,assignee_name,assignee_id,purpose,environment,status,server_username,server_password,esxi_id
dev-01,10.0.0.1,,,,Development,available,,,esxi-01
`))
      .mockResolvedValueOnce(new Response(`
hosts:
  - id: esxi-01
    name: ESXi 01
    url: https://esxi.example.local
    username: readonly
    password: secret
`)))

    const registry = await loadRegistry()
    expect(registry.servers).toHaveLength(1)
    expect(registry.servers[0].hostname).toBe('dev-01')
    expect(registry.esxiHosts[0].id).toBe('esxi-01')
  })

  it('必須項目のないサーバを拒否する', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(`hostname,ip,assignee_name,assignee_id,purpose,environment,status,server_username,server_password,esxi_id
dev-01,,,,,,available,,,
`))
      .mockResolvedValueOnce(new Response('hosts: []')))

    await expect(loadRegistry()).rejects.toThrow('2 行目に必須項目がありません')
  })
})
