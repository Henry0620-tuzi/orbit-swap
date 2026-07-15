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

GitHub Pages 只能托管静态文件，不能安全托管 `ZEROX_API_KEY` 或运行 `server/index.ts`。因此公开站的真实报价功能还需要一个独立的 HTTPS API 代理（例如 Cloudflare Workers、Vercel Functions 或 Railway）；浏览器端不应存放 0x 密钥。

## 当前范围与注意事项

- Base 主网，预设 ETH、USDC、cbBTC、DAI、USDbC。
- 支持原生 ETH 无需授权的兑换；ERC-20 授权流程在界面中明确提示，尚未实现，避免在 MVP 中静默请求无限授权。
- 发交易前仍需核对钱包确认页面的目标合约、金额和 Gas。
- 上线前需要加入 ERC-20 精确额度授权、滑点/有效期控制、代币风险筛查、速率限制、错误监控、合规评估与安全审计。

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
