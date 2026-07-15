import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowDownUp, ChevronDown, ExternalLink, Fuel, LayoutDashboard, LineChart, ShieldCheck, Wallet } from 'lucide-react'
import { encodeFunctionData, erc20Abi, formatUnits, parseUnits } from 'viem'
import { base } from 'viem/chains'
import { useAccount, useChainId, useConnect, useDisconnect, useSendTransaction, useSwitchChain, useWaitForTransactionReceipt } from 'wagmi'
import { TOKENS, type Token } from './tokens'

type Quote = { buyAmount: string; gas: string; gasPrice: string; to: `0x${string}`; data: `0x${string}`; value?: string; issues?: { allowance?: { spender: `0x${string}`; actual: string } } }
const marketRows = [
  ['ETH / USDC', '$3,482.10', '+2.41%', '1.84B', '#627eea'], ['cbBTC / USDC', '$105,327.20', '+1.12%', '422.6M', '#f7931a'], ['DAI / USDC', '$1.0001', '+0.01%', '31.8M', '#f5ac37'], ['USDbC / USDC', '$0.9998', '−0.02%', '18.4M', '#5b6dee'],
]
const short = (address?: string) => address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''
const native = (token: Token) => token.address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

function TokenButton({ token, onClick }: { token: Token; onClick: () => void }) {
  return <button className="token-button" onClick={onClick}><i style={{ background: token.color }}>{token.symbol.slice(0, 1)}</i><span>{token.symbol}</span><ChevronDown size={16} /></button>
}

function TokenPicker({ onSelect, onClose }: { onSelect: (token: Token) => void; onClose: () => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="token-modal" onMouseDown={(e) => e.stopPropagation()}><header><div><p className="eyebrow">BASE NETWORK</p><h2>选择代币</h2></div><button className="close" onClick={onClose}>×</button></header><div className="token-list">{TOKENS.map(token => <button key={token.symbol} onClick={() => { onSelect(token); onClose() }}><i style={{ background: token.color }}>{token.symbol.slice(0, 1)}</i><span><strong>{token.symbol}</strong><small>{token.name}</small></span></button>)}</div></section></div>
}

export default function App() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { connect, connectors, isPending: connecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const { sendTransaction, data: hash, isPending: submitting, error: sendError } = useSendTransaction()
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash })
  const [sell, setSell] = useState(TOKENS[0])
  const [buy, setBuy] = useState(TOKENS[1])
  const [amount, setAmount] = useState('')
  const [picker, setPicker] = useState<'sell' | 'buy' | null>(null)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [quoteError, setQuoteError] = useState('')
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [view, setView] = useState<'swap' | 'markets' | 'portfolio'>('swap')
  const amountInUnits = useMemo(() => { try { return amount && Number(amount) > 0 ? parseUnits(amount, sell.decimals).toString() : '' } catch { return '' } }, [amount, sell])

  useEffect(() => {
    setQuote(null); setQuoteError('')
    if (!amountInUnits) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoadingQuote(true)
      try {
        const search = new URLSearchParams({ sellToken: sell.address, buyToken: buy.address, sellAmount: amountInUnits })
        if (address) search.set('taker', address)
        const response = await fetch(`/api/quote?${search}`, { signal: controller.signal })
        const data = await response.json()
        if (!response.ok) throw new Error(data.reason ?? '报价请求失败')
        setQuote(data)
      } catch (error) { if (!controller.signal.aborted) setQuoteError(error instanceof Error ? error.message : '报价请求失败') }
      finally { if (!controller.signal.aborted) setLoadingQuote(false) }
    }, 450)
    return () => { controller.abort(); clearTimeout(timer) }
  }, [amountInUnits, sell.address, buy.address, address])

  const switchTokens = () => { setSell(buy); setBuy(sell); setAmount('') }
  const output = quote ? Number(formatUnits(BigInt(quote.buyAmount), buy.decimals)).toLocaleString(undefined, { maximumFractionDigits: 8 }) : '—'
  const wrongChain = isConnected && chainId !== base.id
  const needsApproval = Boolean(quote?.issues?.allowance && !native(sell))

  const execute = () => {
    if (!quote) return
    if (needsApproval && quote.issues?.allowance) {
      sendTransaction({ to: sell.address, data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [quote.issues.allowance.spender, BigInt(amountInUnits)] }) })
      return
    }
    sendTransaction({ to: quote.to, data: quote.data, value: BigInt(quote.value ?? '0'), gas: quote.gas ? BigInt(quote.gas) : undefined })
  }
  const cta = !isConnected ? '连接钱包' : wrongChain ? '切换至 Base' : !amountInUnits ? '输入兑换数量' : loadingQuote ? '正在寻找最优报价…' : !quote ? '暂无报价' : needsApproval ? `授权 ${sell.symbol}` : submitting ? '请在钱包中确认' : confirming ? '交易确认中…' : '确认兑换'
  const onCta = () => { if (!isConnected) connect({ connector: connectors[0] }); else if (wrongChain) switchChain({ chainId: base.id }); else execute() }

  return <main><nav><a className="brand" href="/"><span>O</span>orbit</a><div className="nav-tabs"><button className={view === 'swap' ? 'active' : ''} onClick={() => setView('swap')}>交易</button><button className={view === 'markets' ? 'active' : ''} onClick={() => setView('markets')}>市场</button><button className={view === 'portfolio' ? 'active' : ''} onClick={() => setView('portfolio')}>资产</button></div><div className="network"><b></b>Base</div>{isConnected ? <button className="wallet connected" onClick={() => disconnect()}><Wallet size={16}/>{short(address)}</button> : <button className="wallet" onClick={() => connect({ connector: connectors[0] })} disabled={connecting}><Wallet size={16}/>{connecting ? '连接中' : '连接钱包'}</button>}</nav>
    {view === 'swap' && <><div className="shell"><section className="intro"><p className="eyebrow">NON-CUSTODIAL · BASE</p><h1>让每一笔交换，<em>更清楚。</em></h1><p className="lede">一个面向链上交易者的轻量终端。Orbit 聚合 Base 上的深度，报价、路由与签名全部由你亲自确认。</p><div className="badges"><span><ShieldCheck size={16}/> 自托管钱包</span><span><LineChart size={16}/> 聚合流动性</span></div><div className="mini-stats"><span><b>1</b> 支持网络</span><span><b>5</b> 精选资产</span><span><b>0x</b> 智能路由</span></div></section>
      <section className="swap-card"><div className="swap-title"><div><p className="eyebrow">SWAP</p><h2>兑换资产</h2></div><span className="base-pill">Base</span></div>{wrongChain && <div className="notice"><AlertTriangle size={17}/> 请切换到 Base 网络后继续。</div>}
        <div className="field"><label>支付</label><div className="amount-line"><input value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="0.0"/><TokenButton token={sell} onClick={() => setPicker('sell')}/></div></div>
        <button className="flip" onClick={switchTokens} aria-label="交换代币"><ArrowDownUp size={17}/></button>
        <div className="field receiving"><label>收到（预估）</label><div className="amount-line"><output>{loadingQuote ? '…' : output}</output><TokenButton token={buy} onClick={() => setPicker('buy')}/></div></div>
        {quote && <div className="quote-details"><div><span>网络费用（估算）</span><strong>{Number(formatUnits(BigInt(quote.gas) * BigInt(quote.gasPrice), 18)).toFixed(6)} ETH</strong></div><div><span>路由</span><strong>0x on Base</strong></div></div>}
        {quoteError && <p className="error">{quoteError}</p>}{confirmed && <p className="success">交易已确认。<a href={`https://basescan.org/tx/${hash}`} target="_blank">在 BaseScan 查看 <ExternalLink size={13}/></a></p>}{sendError && <p className="error">{sendError.message || '交易未能提交。'}</p>}
        <button className="cta" onClick={onCta} disabled={loadingQuote || (!isConnected && connecting) || (isConnected && !wrongChain && !quote && Boolean(amountInUnits))}>{cta}</button><p className="fineprint">{needsApproval ? '授权仅限本次输入额度；授权完成后请重新获取报价。' : '执行即表示你了解交易由钱包签名并在链上结算。请核对代币地址和钱包确认页。'}</p>
      </section></div><section className="feature-strip"><article><ShieldCheck/><div><strong>资金自管</strong><span>私钥和资产从不离开你的钱包</span></div></article><article><Fuel/><div><strong>报价透明</strong><span>交易前显示预估网络费用与路由</span></div></article><article><AlertTriangle/><div><strong>授权最小化</strong><span>ERC-20 仅按本次数量精确授权</span></div></article></section></>}
    {view === 'markets' && <section className="terminal"><div className="section-heading"><div><p className="eyebrow">MARKETS · BASE</p><h1>市场概览</h1><p>精选 Base 资产的参考价格与 24 小时链上交易活跃度。</p></div><span className="live"><b/> 实时行情</span></div><div className="market-table"><div className="market-head"><span>交易对</span><span>最新价格</span><span>24h 涨跌</span><span>24h 交易额</span><span></span></div>{marketRows.map(row => <div className="market-row" key={row[0]}><span className="pair"><i style={{background: row[4] as string}}>{(row[0] as string)[0]}</i><b>{row[0]}</b></span><strong>{row[1]}</strong><em className={(row[2] as string).includes('−') ? 'red' : ''}>{row[2]}</em><span>{row[3]}</span><button onClick={() => setView('swap')}>交易</button></div>)}</div><p className="data-note">行情仅供参考，不构成投资建议；实际成交价格以链上报价为准。</p></section>}
    {view === 'portfolio' && <section className="terminal"><div className="section-heading"><div><p className="eyebrow">PORTFOLIO</p><h1>资产概览</h1><p>连接钱包后查看你在 Base 上的资产和交易记录。</p></div><LayoutDashboard size={30}/></div>{isConnected ? <div className="portfolio-empty"><Wallet size={32}/><h3>钱包已连接</h3><p>{short(address)} · Base</p><button className="wallet" onClick={() => setView('swap')}>开始交易</button></div> : <div className="portfolio-empty"><Wallet size={32}/><h3>连接钱包以查看资产</h3><p>Orbit 只读取公开链上数据，不保存任何资产或密钥。</p><button className="wallet" onClick={() => connect({ connector: connectors[0] })}>连接钱包</button></div>}</section>}
    <footer><span>Orbit 不持有你的私钥、助记词或资产。</span><a href="https://0x.org/" target="_blank">由 0x 驱动 <ExternalLink size={13}/></a></footer>{picker && <TokenPicker onClose={() => setPicker(null)} onSelect={token => { if (picker === 'sell') { setSell(token); if (token.address === buy.address) setBuy(sell) } else { setBuy(token); if (token.address === sell.address) setSell(buy) } setAmount('') }}/>}</main>
}
