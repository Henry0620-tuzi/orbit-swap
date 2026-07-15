import 'dotenv/config'
import cors from 'cors'
import express from 'express'

const app = express()
const port = Number(process.env.PORT ?? 8787)
const zeroExKey = process.env.ZEROX_API_KEY

app.use(cors())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, configured: Boolean(zeroExKey) })
})

app.get('/api/quote', async (req, res) => {
  if (!zeroExKey) {
    res.status(503).json({ reason: '服务端未配置 ZEROX_API_KEY。请复制 .env.example 为 .env 后填写 API Key。' })
    return
  }

  const { sellToken, buyToken, sellAmount, taker } = req.query
  if (typeof sellToken !== 'string' || typeof buyToken !== 'string' || typeof sellAmount !== 'string' || !/^\d+$/.test(sellAmount)) {
    res.status(400).json({ reason: '无效的报价参数。' })
    return
  }

  const params = new URLSearchParams({ chainId: '8453', sellToken, buyToken, sellAmount })
  if (typeof taker === 'string' && /^0x[a-fA-F0-9]{40}$/.test(taker)) params.set('taker', taker)

  try {
    const response = await fetch(`https://api.0x.org/swap/allowance-holder/quote?${params}`, {
      headers: { '0x-api-key': zeroExKey, '0x-version': 'v2' },
    })
    const body = await response.json() as { reason?: string; validationErrors?: { reason?: string }[] } & Record<string, unknown>
    if (!response.ok) {
      res.status(response.status).json({ reason: body.reason ?? body.validationErrors?.[0]?.reason ?? '0x 未能返回报价。' })
      return
    }
    res.setHeader('Cache-Control', 'no-store')
    res.json(body)
  } catch {
    res.status(502).json({ reason: '无法连接到 0x 服务，请稍后重试。' })
  }
})

app.listen(port, () => console.log(`0x quote API listening on :${port}`))
