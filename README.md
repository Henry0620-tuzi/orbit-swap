# Orbit Swap — Base + 0x MVP

一个仅在用户钱包内签名、在 Base 链上结算的非托管 Swap 前端。项目不会读取、请求或保存私钥和助记词。

## 运行

```bash
cp .env.example .env
# 编辑 .env，填入从 https://dashboard.0x.org/ 创建的 ZEROX_API_KEY
npm install
npm run dev
```

打开 `http://localhost:5173`。前端运行在 Vite，报价请求由 `http://localhost:8787` 的本地代理转发给 0x，因而 API Key 不会暴露给浏览器。

## GitHub Pages

每次推送到 `main`，`.github/workflows/deploy-pages.yml` 会自动构建并部署静态前端。在仓库 **Settings → Pages → Build and deployment** 中选择 **GitHub Actions** 后生效。

GitHub Pages 只能托管静态文件，不能安全托管 `ZEROX_API_KEY` 或运行 `server/index.ts`。本仓库提供了可部署的 [worker](worker/)：它只为白名单 Base 代币代理 0x 请求，0x Key 始终存储在 Worker Secret 中。

### 部署公开报价 API（Cloudflare Workers）

```bash
cd worker
npx wrangler login
npx wrangler secret put ZEROX_API_KEY
npx wrangler secret put ALLOWED_ORIGIN # 填 https://henry0620-tuzi.github.io
npx wrangler deploy
```

把输出的 Worker URL 写入 GitHub 仓库 Actions secret `VITE_QUOTE_API_URL`，再在 Pages workflow 的 build step 中传入这个变量。不要在 GitHub Pages、浏览器变量或 Git 仓库中放置 0x Key。

## 当前范围与注意事项

- Base 主网，预设 ETH、USDC、cbBTC、DAI、USDbC。
- 支持原生 ETH 兑换和 ERC-20 精确额度授权；从不请求无限授权。
- 发交易前仍需核对钱包确认页面的目标合约、金额和 Gas。
- 上线前还需要滑点/有效期控制、分布式限流与 WAF、错误监控、合规评估和独立安全审计。

## 结构

- `src/`：React + wagmi 钱包 UI 与 0x 交易提交
- `server/index.ts`：服务端 0x 报价代理

## 产品与部署架构

借鉴成熟交易平台的「交易 / 市场 / 资产」信息架构，Orbit 保留非托管边界：

```text
React 终端（交易、市场、资产）
        │ 钱包签名 / 公开链上读取
        ├─────────────── Base RPC
        │
        └── 本地 / 服务端 API ── 0x Quote API ── Base DEX 流动性
```

生产环境应将报价代理放在受限的服务端或边缘函数，并新增：请求限流、允许来源校验、错误监控、可审计交易事件、代币风险名单和实时市场数据源。市场页当前为产品演示数据，不能作为价格预言机使用。
