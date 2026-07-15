/**
 * A minimal, token-whitelisting 0x proxy for Cloudflare Workers.
 * Store ZEROX_API_KEY with `wrangler secret put ZEROX_API_KEY`.
 */
export interface Env { ZEROX_API_KEY: string; ALLOWED_ORIGIN?: string }

const BASE = '8453'
const ALLOWED_TOKENS = new Set([
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf',
  '0x50c5725949a6f0c72e6c4c89c4a4aa0f2bf1cd0d',
  '0xd9aaec86b65d86f6a7b5e56b9b3f6d4a0e09eac4',
])

function cors(request: Request, env: Env) {
  const origin = request.headers.get('Origin')
  const allowed = env.ALLOWED_ORIGIN ?? 'https://henry0620-tuzi.github.io'
  return origin === allowed ? { 'Access-Control-Allow-Origin': allowed, Vary: 'Origin' } : {}
}
function json(data: unknown, status: number, headers: HeadersInit) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = cors(request, env)
    if (request.method === 'OPTIONS') return new Response(null, { headers: { ...headers, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } })
    const url = new URL(request.url)
    if (request.method !== 'GET' || url.pathname !== '/quote') return json({ reason: 'Not found' }, 404, headers)
    if (!env.ZEROX_API_KEY) return json({ reason: '报价服务未配置。' }, 503, headers)
    const sellToken = url.searchParams.get('sellToken')?.toLowerCase()
    const buyToken = url.searchParams.get('buyToken')?.toLowerCase()
    const sellAmount = url.searchParams.get('sellAmount')
    const taker = url.searchParams.get('taker')
    if (!sellToken || !buyToken || sellToken === buyToken || !ALLOWED_TOKENS.has(sellToken) || !ALLOWED_TOKENS.has(buyToken) || !sellAmount || !/^\d{1,78}$/.test(sellAmount)) return json({ reason: '无效或不在白名单内的交易参数。' }, 400, headers)
    if (taker && !/^0x[a-fA-F0-9]{40}$/.test(taker)) return json({ reason: '无效的钱包地址。' }, 400, headers)
    const query = new URLSearchParams({ chainId: BASE, sellToken, buyToken, sellAmount })
    if (taker) query.set('taker', taker)
    const upstream = await fetch(`https://api.0x.org/swap/allowance-holder/quote?${query}`, { headers: { '0x-api-key': env.ZEROX_API_KEY, '0x-version': 'v2' } })
    const body = await upstream.text()
    return new Response(body, { status: upstream.status, headers: { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
  },
}
