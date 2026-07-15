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

「全件入れ替え」を使うと、現在の台帳をすべて破棄し、Excelから貼り付けた表全体または選択したCSVだけで台帳を作り直せます。Excelから貼り付ける場合は、1行目の英語ヘッダーも含めてコピーしてください。

「全件クリア」は確認操作の後に登録行を0件にします。ヘッダーだけの空CSVを書き出す場合や、台帳を最初から手入力し直す場合に利用できます。

行を追加するときは、追加数へ1〜100を入力してから「行を追加」を押します。例えば `30` を指定すると、編集表の末尾へ空の30行を一括追加できます。

## GitLab Pages

`.gitlab-ci.yml` を同梱しています。GitLab のデフォルトブランチへ push すると、`dist/` が Pages の公開対象になります。

Vite の `public/` は、CSVやYAMLなどの静的ファイルを置くソース側のディレクトリです。GitLab Pages の公開ディレクトリとは別物なので、`pub/` への変更や、ビルド後の `dist/` を `public/` へ移動する処理は不要です。

Vite の `base` は初期状態で相対パス `./` になるため、通常は `.env` を作らなくてもプロジェクト Pages のサブパスで動作します。

データファイルのURLも現在のPages配置先を基準に解決されるため、グループ名やプロジェクト名が変わっても追従します。ベースパスを固定したい場合だけ、`.env.example` を参考に `.env.production` を作成するか、ビルド時に指定してください。

```bash
VITE_BASE_PATH=/group/project/ yarn build
```

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
