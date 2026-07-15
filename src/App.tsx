import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  CircleAlert,
  Clipboard,
  Eye,
  EyeOff,
  KeyRound,
  PencilLine,
  LoaderCircle,
  MonitorCog,
  Search,
  Server as ServerIcon,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import { loadRegistry } from './data'
import RegistryEditor from './RegistryEditor'
import type { EsxiHost, RegistryData, Server, ServerStatus } from './types'

type Filter = 'all' | ServerStatus

const statusMeta: Record<ServerStatus, { label: string; className: string }> = {
  allocated: { label: '割り当て中', className: 'allocated' },
  available: { label: '空き', className: 'available' },
  maintenance: { label: 'メンテナンス', className: 'maintenance' },
}

function StatusBadge({ status }: { status: ServerStatus }) {
  const meta = statusMeta[status]
  return <span className={`status-badge ${meta.className}`}><i />{meta.label}</span>
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }
  return (
    <button className="icon-button" onClick={copy} aria-label={`${label}をコピー`} title={`${label}をコピー`}>
      {copied ? <Check size={15} /> : <Clipboard size={15} />}
    </button>
  )
}

function PasswordField({ password, label }: { password: string; label: string }) {
  const [visible, setVisible] = useState(false)
  return <div><span>パスワード</span><code>{visible ? password : '••••••••••••'}</code>
    <button className="icon-button" onClick={() => setVisible((value) => !value)} aria-label={`${label}のパスワード表示切替`}>
      {visible ? <EyeOff size={16} /> : <Eye size={16} />}
    </button><CopyButton value={password} label={`${label}のパスワード`} />
  </div>
}

function CredentialPanel({ server, esxi, onClose }: { server: Server; esxi?: EsxiHost; onClose: () => void }) {
  return (
    <div className="credential-panel">
      <div className="credential-head">
        <div><KeyRound size={18} /><strong>接続情報</strong></div>
        <button className="icon-button" onClick={onClose} aria-label="閉じる"><X size={17} /></button>
      </div>
      {server.credentials && <section className="credential-section">
        <div className="credential-section-title"><KeyRound size={14} /><strong>サーバーログイン</strong><small>{server.hostname}</small></div>
        <div className="credential-grid server-credentials">
          <div><span>ユーザー</span><code>{server.credentials.username}</code><CopyButton value={server.credentials.username} label="サーバーのユーザー名" /></div>
          <PasswordField password={server.credentials.password} label="サーバー" />
        </div>
      </section>}
      {esxi && <section className="credential-section">
        <div className="credential-section-title"><ShieldCheck size={14} /><strong>ESXi 接続情報</strong><small>{esxi.name}</small></div>
        <div className="credential-grid">
          <div><span>URL</span><a href={esxi.url} target="_blank" rel="noreferrer">{esxi.url}</a><CopyButton value={esxi.url} label="ESXi URL" /></div>
          <div><span>ユーザー</span><code>{esxi.username}</code><CopyButton value={esxi.username} label="ESXi のユーザー名" /></div>
          <PasswordField password={esxi.password} label="ESXi" />
        </div>
      </section>}
      <p className="security-note"><AlertTriangle size={14} /> 静的サイトのため、この情報は配信ファイルからも確認できます。</p>
    </div>
  )
}

function ServerRow({ server, esxi }: { server: Server; esxi?: EsxiHost }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className={`server-row ${expanded ? 'expanded' : ''}`}>
      <div className="server-summary">
        <div className="host-cell">
          <span className="server-symbol"><ServerIcon size={18} /></span>
          <div><strong>{server.hostname}</strong><small>{server.environment || 'Development'}</small></div><CopyButton value={server.hostname} label="ホスト名" />
        </div>
        <div className="ip-cell"><code>{server.ip}</code><CopyButton value={server.ip} label="IPアドレス" /></div>
        <div className="assignee-cell">
          {server.assignee ? <><span className="avatar">{server.assignee.name.slice(0, 1)}</span><div><strong>{server.assignee.name}</strong><small>{server.assignee.id}</small></div></> : <><span className="avatar empty"><UserRound size={15} /></span><div><strong>未割り当て</strong><small>—</small></div></>}
        </div>
        <div className="purpose-cell">{server.purpose || '—'}</div>
        <div><StatusBadge status={server.status} /></div>
        <div className="actions-cell">
          {(server.credentials || esxi) && <button className="detail-button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
            <span>接続情報</span><ChevronDown size={16} />
          </button>}
        </div>
      </div>
      {expanded && <CredentialPanel server={server} esxi={esxi} onClose={() => setExpanded(false)} />}
    </div>
  )
}

function App() {
  const [data, setData] = useState<RegistryData | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState(false)

  useEffect(() => { loadRegistry().then(setData).catch((err: Error) => setError(err.message)) }, [])

  const filtered = useMemo(() => {
    if (!data) return []
    const needle = query.trim().toLowerCase()
    return data.servers.filter((server) => {
      const matchesFilter = filter === 'all' || server.status === filter
      const haystack = [server.hostname, server.ip, server.assignee?.name, server.assignee?.id, server.purpose, server.environment].join(' ').toLowerCase()
      return matchesFilter && (!needle || haystack.includes(needle))
    })
  }, [data, query, filter])

  const counts = useMemo(() => ({
    all: data?.servers.length ?? 0,
    allocated: data?.servers.filter((s) => s.status === 'allocated').length ?? 0,
    available: data?.servers.filter((s) => s.status === 'available').length ?? 0,
    maintenance: data?.servers.filter((s) => s.status === 'maintenance').length ?? 0,
  }), [data])

  const updated = data ? new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(data.updatedAt)) : '—'

  return (
    <div className="app-shell">
      <header>
        <div className="brand"><span><MonitorCog size={22} /></span><div><strong>Dev Server Registry</strong><small>Infrastructure Portal</small></div></div>
        <div className="header-meta"><span className="health-dot" /> システム正常 <i /> 最終更新 {updated}</div>
      </header>
      <main>
        <section className="hero">
          <div><p className="eyebrow">INFRASTRUCTURE / SERVER ASSIGNMENTS</p><h1>開発サーバ台帳</h1><p>開発環境の割り当て状況と接続情報を一元管理します。</p></div>
          <div className="hero-actions"><button className="edit-registry-button" onClick={() => setEditing(true)} disabled={!data}><PencilLine size={16} /> 台帳を編集</button><div className="summary-card"><span><ServerIcon size={19} /></span><div><small>登録サーバ</small><strong>{counts.all}<em>台</em></strong></div><i /><div><small>空き</small><strong className="green">{counts.available}<em>台</em></strong></div></div></div>
        </section>

        <section className="workspace">
          <div className="toolbar">
            <div className="search-box"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ホスト名、IP、担当者で検索..." aria-label="サーバを検索" />{query && <button onClick={() => setQuery('')} aria-label="検索をクリア"><X size={16} /></button>}</div>
            <div className="filters" aria-label="ステータスで絞り込み">
              {(['all', 'allocated', 'available', 'maintenance'] as Filter[]).map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item === 'all' ? 'すべて' : statusMeta[item].label}<span>{counts[item]}</span></button>)}
            </div>
          </div>

          {error ? <div className="state error"><CircleAlert size={25} /><strong>データを読み込めませんでした</strong><p>{error}</p></div> : !data ? <div className="state"><LoaderCircle className="spinner" size={27} /><p>台帳を読み込んでいます...</p></div> : <>
            <div className="table-head"><span>ホスト名</span><span>IP アドレス</span><span>割り当て者</span><span>用途</span><span>ステータス</span><span /></div>
            <div className="server-list">{filtered.map((server) => <ServerRow key={server.hostname} server={server} esxi={data.esxiHosts.find((host) => host.id === server.esxiId)} />)}</div>
            {filtered.length === 0 && <div className="state"><Search size={25} /><strong>該当するサーバがありません</strong><p>検索条件を変更してお試しください。</p></div>}
            <div className="result-count">{filtered.length} / {counts.all} 台を表示</div>
          </>}
        </section>
      </main>
      <footer><span>Dev Server Registry</span><span>データソース: <code>servers.csv / esxi.yaml</code></span></footer>
      {editing && data && <RegistryEditor servers={data.servers} esxiHosts={data.esxiHosts} onClose={() => setEditing(false)} onApply={(servers) => { setData({ ...data, servers, updatedAt: new Date().toISOString() }); setEditing(false) }} />}
    </div>
  )
}

export default App
