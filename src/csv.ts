import type { Server } from './types'

export const CSV_HEADERS = [
  'hostname', 'ip', 'assignee_name', 'assignee_id', 'purpose', 'environment',
  'status', 'server_username', 'server_password', 'esxi_id',
] as const

export type CsvHeader = typeof CSV_HEADERS[number]
export type ServerCsvRow = Record<CsvHeader, string>

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const input = text.replace(/^\uFEFF/, '')
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') { cell += '"'; index += 1 }
      else if (character === '"') quoted = false
      else cell += character
    } else if (character === '"') quoted = true
    else if (character === ',') { row.push(cell); cell = '' }
    else if (character === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = '' }
    else cell += character
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row) }
  return rows
}

export function parseServerCsv(text: string): ServerCsvRow[] {
  const [headers = [], ...records] = parseCsv(text)
  const missing = CSV_HEADERS.filter((header) => !headers.includes(header))
  if (missing.length) throw new Error(`servers.csv に必要な列がありません: ${missing.join(', ')}`)
  return records.filter((record) => record.some((value) => value.trim())).map((record) =>
    Object.fromEntries(CSV_HEADERS.map((header) => [header, record[headers.indexOf(header)] ?? ''])) as ServerCsvRow)
}

export function parseTabularServers(text: string): ServerCsvRow[] {
  const input = text.trim()
  if (!input) throw new Error('貼り付けるデータがありません')
  if (!input.includes('\t')) return parseServerCsv(input)

  const matrix = input.replace(/\r/g, '').split('\n').filter((line) => line.trim()).map((line) => line.split('\t'))
  const firstRow = matrix[0].map((value) => value.trim())
  const hasHeaders = firstRow.includes('hostname') && firstRow.includes('ip')
  const headers = hasHeaders ? firstRow : [...CSV_HEADERS]
  const records = hasHeaders ? matrix.slice(1) : matrix
  const unknown = headers.filter((header) => !CSV_HEADERS.includes(header as CsvHeader))
  if (unknown.length) throw new Error(`未対応の列があります: ${unknown.join(', ')}`)

  return records.map((record) => Object.fromEntries(CSV_HEADERS.map((header) => {
    const sourceIndex = headers.indexOf(header)
    return [header, sourceIndex >= 0 ? record[sourceIndex] ?? '' : '']
  })) as ServerCsvRow)
}

const escapeCsv = (value: string) => /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value

export function serializeServerCsv(rows: ServerCsvRow[]): string {
  const lines = [CSV_HEADERS.join(','), ...rows.map((row) => CSV_HEADERS.map((header) => escapeCsv(row[header])).join(','))]
  return `\uFEFF${lines.join('\r\n')}\r\n`
}

const escapeClipboardCell = (value: string) => value.replace(/[\t\r\n]+/g, ' ')

export function serializeServerTsv(rows: ServerCsvRow[]): string {
  const lines = [CSV_HEADERS.join('\t'), ...rows.map((row) => CSV_HEADERS.map((header) => escapeClipboardCell(row[header])).join('\t'))]
  return lines.join('\r\n')
}

export function serverToCsvRow(server: Server): ServerCsvRow {
  return { hostname: server.hostname, ip: server.ip, assignee_name: server.assignee?.name ?? '', assignee_id: server.assignee?.id ?? '', purpose: server.purpose ?? '', environment: server.environment ?? '', status: server.status, server_username: server.credentials?.username ?? '', server_password: server.credentials?.password ?? '', esxi_id: server.esxiId ?? '' }
}

export function csvRowToServer(row: ServerCsvRow): Server {
  return {
    hostname: row.hostname.trim(), ip: row.ip.trim(),
    assignee: row.assignee_name.trim() || row.assignee_id.trim() ? { name: row.assignee_name.trim(), id: row.assignee_id.trim() } : null,
    purpose: row.purpose.trim(), environment: row.environment.trim(), status: row.status.trim() as Server['status'],
    credentials: row.server_username || row.server_password ? { username: row.server_username, password: row.server_password } : undefined,
    esxiId: row.esxi_id.trim() || undefined,
  }
}

export function emptyCsvRow(): ServerCsvRow {
  return Object.fromEntries(CSV_HEADERS.map((header) => [header, ''])) as ServerCsvRow
}
