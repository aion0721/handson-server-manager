# Dev Server Registry

開発サーバの割り当て状況と ESXi 接続情報を一覧する、GitLab Pages 向けの静的 SPA です。

## ローカル起動

```bash
yarn install
yarn dev
```

## データ更新

サーバ台帳は Excel で編集できる `public/data/servers.csv`、共用 ESXi は `public/data/esxi.yaml` で管理します。サーバ側の `esxi_id` から ESXi の `id` を参照するため、共用 ESXi の情報を重複して書く必要はありません。

```csv
hostname,ip,assignee_name,assignee_id,purpose,environment,status,server_username,server_password,esxi_id
dev-app-01,10.24.8.21,佐藤 みなみ,sato-minami,決済 API リニューアル,Development,allocated,dev-app-admin,server-change-me,esxi-dev-01
```

```yaml
# public/data/esxi.yaml
hosts:
  - id: esxi-dev-01
    name: 開発 ESXi 01
    url: https://esxi.example.local
    username: devops-readonly
    password: change-me
```

未割り当ての場合は `assignee_name` と `assignee_id` を空欄にします。サーバー認証や ESXi 情報が不要なら、該当する列を空欄にできます。Excelから保存するときは「CSV UTF-8（コンマ区切り）」を選択してください。

### Web上で編集する

画面右上の「台帳を編集」から、表のセルを直接変更できます。Excelでコピーした複数行・複数列を、Web上の任意セルへ貼り付けることもできます。

編集後は「CSVを書き出す」で `servers.csv` を保存し、`public/data/servers.csv` と差し替えてください。「画面に反映」は表示確認用で、ページを再読み込みすると元に戻ります。

## GitLab Pages

`.gitlab-ci.yml` を同梱しています。GitLab のデフォルトブランチへ push すると、ビルド成果物が Pages として公開されます。Vite の `base` は相対パスなので、プロジェクト Pages のサブパスでも動作します。

## セキュリティ上の注意

GitLab Pages は静的配信です。画面上でパスワードを伏せても、利用者は配信された `data/servers.csv` を直接取得できます。次の運用を推奨します。

- GitLab Pages Access Control を有効にし、プロジェクトを Private にする
- ESXi は読み取り専用かつ低権限の専用アカウントにする
- 本番用・管理者用パスワードは置かない
- 強い秘匿性が必要な場合は Vault 等の認証付き秘密管理サービスを使う

## 確認コマンド

```bash
yarn typecheck
yarn test:run
yarn build
```
