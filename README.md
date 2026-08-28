# Terminal Steps

ターミナルを初めて触る日本語話者向けの、安全な学習Webアプリです。実際のOSやファイルには触れず、ブラウザ内の疑似ファイルシステムだけで練習できます。

## 学べること

- `pwd` / `ls` / `cd` / `mkdir` / `touch` / `cat` の基礎6レッスン
- 段階ヒントと、失敗理由・次の一手を示す日本語エラー
- 自由練習と、AIコーディング・Git・Node.jsへの入口課題
- 進捗、選択進路、疑似ファイルシステムのブラウザ内保存

## 起動方法

```bash
cd /Users/ki/Documents/Codex/terminal-learning-app
npm install
npm run dev
```

ターミナルに表示されたローカルURLをブラウザで開いてください。ポートを指定する場合は、次のように起動できます。

```bash
npm run dev -- --port 4174 --strictPort
```

## 確認コマンド

```bash
npm test
npm run build
npm audit --audit-level=high
```

## 安全性

入力されたコマンドはJavaScriptの許可リスト方式で解釈されます。実際のシェル、OS、ネットワーク、バックエンド、外部APIには接続しません。

## 今回の対象外

- 実ターミナルとの接続
- 認証、バックエンド、DB、クラウド同期
- AIチャットや外部サービス連携
- Git・Node.js・AI開発コースの本編
