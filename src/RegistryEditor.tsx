import { useMemo, useState } from 'react'
import { AlertTriangle, Check, Clipboard, Download, Plus, RefreshCcw, Save, Sheet, Trash2, Upload, X } from 'lucide-react'
import { CSV_HEADERS, csvRowToServer, emptyCsvRow, parseTabularServers, serializeServerCsv, serializeServerTsv, serverToCsvRow, type CsvHeader, type ServerCsvRow } from './csv'
import type { EsxiHost, Server } from './types'

const labels: Record<CsvHeader, string> = { hostname: 'ホスト名', ip: 'IPアドレス', assignee_name: '割り当て者名', assignee_id: '割り当て者ID', purpose: '用途', environment: '環境', status: 'ステータス', server_username: 'サーバーID', server_password: 'サーバーPW', esxi_id: 'ESXi ID' }

function validateRows(rows: ServerCsvRow[], esxiHosts: EsxiHost[]): string[] {
  const errors: string[] = [], hostnames = new Set<string>(), esxiIds = new Set(esxiHosts.map((host) => host.id)), statuses = new Set(['allocated', 'available', 'maintenance'])
  const isValidIp = (value: string) => {
    const octets = value.trim().split('.')
    return octets.length === 4 && octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255)
  }
  rows.forEach((row, index) => {
    const line = index + 2
    if (!row.hostname.trim()) errors.push(`${line}行目: ホスト名は必須です`)
    if (!isValidIp(row.ip)) errors.push(`${line}行目: IPアドレスの形式が正しくありません`)
    if (!statuses.has(row.status.trim())) errors.push(`${line}行目: ステータスが正しくありません`)
    if (row.esxi_id.trim() && !esxiIds.has(row.esxi_id.trim())) errors.push(`${line}行目: ESXi IDが見つかりません`)
    if (hostnames.has(row.hostname.trim())) errors.push(`${line}行目: ホスト名が重複しています`)
    if (row.hostname.trim()) hostnames.add(row.hostname.trim())
  })
  return errors
}

type Props = { servers: Server[]; esxiHosts: EsxiHost[]; onApply: (servers: Server[]) => void; onClose: () => void }

export default function RegistryEditor({ servers, esxiHosts, onApply, onClose }: Props) {
  const [rows, setRows] = useState<ServerCsvRow[]>(servers.map(serverToCsvRow))
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkError, setBulkError] = useState('')
  const [clearConfirm, setClearConfirm] = useState(false)
  const [addCount, setAddCount] = useState('1')
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const errors = useMemo(() => validateRows(rows, esxiHosts), [rows, esxiHosts])
  const updateCell = (rowIndex: number, header: CsvHeader, value: string) => setRows((current) => current.map((row, index) => index === rowIndex ? { ...row, [header]: value } : row))

  const pasteCells = (event: React.ClipboardEvent<HTMLInputElement>, rowIndex: number, columnIndex: number) => {
    const text = event.clipboardData.getData('text/plain')
    if (!text.includes('\t') && !text.includes('\n') && !text.includes('\r')) return
    event.preventDefault()
    let matrix = text.replace(/\r/g, '').split('\n').filter((line, index, all) => line || index < all.length - 1).map((line) => line.split('\t'))
    const hasHeaders = matrix[0]?.some((value) => CSV_HEADERS.includes(value.trim() as CsvHeader))
    if (hasHeaders) {
      const sourceHeaders = matrix.shift()!.map((value) => value.trim() as CsvHeader)
      setRows(matrix.filter((line) => line.some(Boolean)).map((line) => { const row = emptyCsvRow(); sourceHeaders.forEach((header, index) => { if (CSV_HEADERS.includes(header)) row[header] = line[index] ?? '' }); return row }))
      return
    }
    setRows((current) => {
      const next = current.map((row) => ({ ...row }))
      matrix.forEach((values, rowOffset) => { const targetRow = rowIndex + rowOffset; while (next.length <= targetRow) next.push(emptyCsvRow()); values.forEach((value, columnOffset) => { const header = CSV_HEADERS[columnIndex + columnOffset]; if (header) next[targetRow][header] = value }) })
      return next
    })
  }

  const download = () => {
    if (errors.length) return
    const url = URL.createObjectURL(new Blob([serializeServerCsv(rows)], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'servers.csv'; anchor.click(); URL.revokeObjectURL(url)
  }

  const copyForExcel = async () => {
    try {
      await navigator.clipboard.writeText(serializeServerTsv(rows))
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }
    window.setTimeout(() => setCopyState('idle'), 2000)
  }

  const replaceAll = () => {
    try {
      const nextRows = parseTabularServers(bulkText)
      if (!nextRows.length) throw new Error('1件以上のデータを貼り付けてください')
      setRows(nextRows)
      setBulkText('')
      setBulkError('')
      setBulkOpen(false)
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : 'データを読み込めませんでした')
    }
  }

  const readCsvFile = async (file?: File) => {
    if (!file) return
    setBulkText(await file.text())
    setBulkError('')
  }

  const addRows = () => {
    const count = Math.min(100, Math.max(1, Number.parseInt(addCount, 10) || 1))
    setRows((current) => [...current, ...Array.from({ length: count }, emptyCsvRow)])
    setAddCount(String(count))
    setClearConfirm(false)
  }

  return <div className="editor-overlay" role="dialog" aria-modal="true" aria-label="サーバ台帳を編集"><div className="editor-modal">
    <div className="editor-header"><div><span className="editor-icon"><Sheet size={20} /></span><div><strong>サーバ台帳を編集</strong><small>Excelからコピーしたセル範囲を、そのまま貼り付けできます</small></div></div><button className="icon-button" onClick={onClose} aria-label="エディターを閉じる"><X size={19} /></button></div>
    <div className="editor-guide"><span>使い方</span> Excelでセル範囲をコピーし、下の表の貼り付け開始セルを選んで <kbd>Ctrl</kbd> + <kbd>V</kbd></div>
    {bulkOpen && <section className="bulk-replace-panel">
      <div className="bulk-replace-head"><div><RefreshCcw size={16} /><div><strong>全件入れ替え</strong><small>現在の {rows.length} 件を破棄し、貼り付けたデータだけで台帳を作り直します</small></div></div><button className="icon-button" onClick={() => { setBulkOpen(false); setBulkError('') }} aria-label="全件入れ替えを閉じる"><X size={16} /></button></div>
      <textarea value={bulkText} onChange={(event) => { setBulkText(event.target.value); setBulkError('') }} placeholder="Excelのヘッダーを含む表全体、または servers.csv の内容を貼り付けてください" aria-label="全件入れ替えデータ" autoFocus />
      <div className="bulk-replace-actions"><label className="secondary-button file-button"><Upload size={14} /> CSVを選択<input type="file" accept=".csv,text/csv" onChange={(event) => readCsvFile(event.target.files?.[0])} /></label>{bulkError && <span className="bulk-error"><AlertTriangle size={14} />{bulkError}</span>}<button className="primary-button" onClick={replaceAll} disabled={!bulkText.trim()}><RefreshCcw size={14} /> この内容で全件置換</button></div>
    </section>}
    <div className="editor-table-wrap"><table className="editor-table"><thead><tr><th className="row-number">#</th>{CSV_HEADERS.map((header) => <th key={header}>{labels[header]}<small>{header}</small></th>)}<th /></tr></thead>
      <tbody>{rows.map((row, rowIndex) => <tr key={`${row.hostname}-${rowIndex}`}><td className="row-number">{rowIndex + 1}</td>{CSV_HEADERS.map((header, columnIndex) => <td key={header}><input value={row[header]} onChange={(event) => updateCell(rowIndex, header, event.target.value)} onPaste={(event) => pasteCells(event, rowIndex, columnIndex)} type={header.includes('password') ? 'password' : 'text'} aria-label={`${rowIndex + 1}行目 ${labels[header]}`} /></td>)}<td><button className="icon-button danger" onClick={() => setRows((current) => current.filter((_, index) => index !== rowIndex))} aria-label={`${rowIndex + 1}行目を削除`}><Trash2 size={15} /></button></td></tr>)}</tbody>
    </table></div>
    <div className="editor-bottom"><div className="add-rows-control"><input type="number" min="1" max="100" value={addCount} onChange={(event) => setAddCount(event.target.value)} aria-label="追加する行数" /><span>行</span><button className="secondary-button" onClick={addRows}><Plus size={15} /> 行を追加</button></div><button className="replace-all-button" onClick={() => { setBulkOpen((open) => !open); setClearConfirm(false) }}><RefreshCcw size={14} /> 全件入れ替え</button>{clearConfirm ? <div className="clear-confirm"><span>{rows.length}件すべて削除します</span><button onClick={() => { setRows([]); setClearConfirm(false); setBulkOpen(false) }}>クリア実行</button><button onClick={() => setClearConfirm(false)}>キャンセル</button></div> : <button className="clear-all-button" onClick={() => { setClearConfirm(true); setBulkOpen(false) }} disabled={!rows.length}><Trash2 size={14} /> 全件クリア</button>}<div className={`validation-summary ${errors.length ? 'invalid' : ''}`}>{copyState === 'error' ? <span>クリップボードへコピーできませんでした</span> : errors.length ? <><AlertTriangle size={15} /><span>{errors[0]}{errors.length > 1 && `（ほか ${errors.length - 1} 件）`}</span></> : <span>入力チェック OK・{rows.length} 台</span>}</div><div className="editor-actions"><button className="secondary-button" onClick={copyForExcel} title="見出しと全行（ID・PWを含む）をコピー">{copyState === 'copied' ? <Check size={15} /> : <Clipboard size={15} />} {copyState === 'copied' ? 'コピーしました' : 'Excelへコピー'}</button><button className="secondary-button" disabled={Boolean(errors.length)} onClick={() => onApply(rows.map(csvRowToServer))}><Save size={15} /> 画面に反映</button><button className="primary-button" disabled={Boolean(errors.length)} onClick={download}><Download size={15} /> CSVを書き出す</button></div></div>
    <p className="editor-caution"><AlertTriangle size={13} /> 画面への反映は一時的です。永続化するには、書き出したCSVを <code>public/data/servers.csv</code> と差し替えてください。</p>
  </div></div>
}
