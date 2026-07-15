import { describe, expect, it } from 'vitest'
import { parseServerCsv, parseTabularServers, serializeServerCsv } from './csv'

describe('server CSV', () => {
  it('Excel向けBOMと引用符を保って往復できる', () => {
    const input = '\uFEFFhostname,ip,assignee_name,assignee_id,purpose,environment,status,server_username,server_password,esxi_id\r\n' +
      'dev-01,10.0.0.1,佐藤,sato,"API, バッチ",Development,allocated,user,"p""ass",esxi-01\r\n'
    const rows = parseServerCsv(input)
    expect(rows[0].purpose).toBe('API, バッチ')
    expect(rows[0].server_password).toBe('p"ass')
    expect(parseServerCsv(serializeServerCsv(rows))).toEqual(rows)
  })

  it('必須列がないCSVを拒否する', () => {
    expect(() => parseServerCsv('hostname,ip\ndev-01,10.0.0.1')).toThrow('必要な列')
  })

  it('Excelの全件貼り付けを行として読み込む', () => {
    const rows = parseTabularServers('hostname\tip\tstatus\tesxi_id\nall-01\t10.1.0.1\tavailable\tesxi-01\nall-02\t10.1.0.2\tallocated\tesxi-01')
    expect(rows).toHaveLength(2)
    expect(rows[1].hostname).toBe('all-02')
    expect(rows[1].assignee_name).toBe('')
  })
})
