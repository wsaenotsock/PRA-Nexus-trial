# Dockerfile for Yjs WebSocket Server (quantica-risk)
FROM node:20-alpine

WORKDIR /app

# パッケージ定義のみをコピーして先に依存関係をインストール（キャッシュ有効化）
COPY package*.json ./
RUN npm ci --only=production

# アプリケーションコードをコピー
COPY ws-server.mjs ./

# y-websocket サーバーが使用するポート（デフォルト 1234）
EXPOSE 1234

# 環境変数の初期設定
ENV PORT=1234
ENV HOST=0.0.0.0

CMD ["node", "ws-server.mjs"]
