import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowDownUp, CheckCircle2, ChevronDown, ExternalLink, Fuel, KeyRound, LineChart, LockKeyhole, ShieldCheck, UserRound, UsersRound, Wallet } from 'lucide-react'
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
const activity = [['刚刚', '已连接钱包', '只读', '当前设备'], ['—', '暂无链上交易', '等待交易', 'Base']]
const quoteApi = (import.meta.env.VITE_QUOTE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '/api'

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
  const [view, setView] = useState<'swap' | 'markets' | 'portfolio' | 'security' | 'admin'>('swap')
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
        const response = await fetch(`${quoteApi}/quote?${search}`, { signal: controller.signal })
        const data = await response.json().catch(() => ({}))
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

  return <main><nav><a className="brand" href="/"><span>O</span>orbit</a><div className="nav-tabs"><button className={view === 'swap' ? 'active' : ''} onClick={() => setView('swap')}>交易</button><button className={view === 'markets' ? 'active' : ''} onClick={() => setView('markets')}>市场</button><button className={view === 'portfolio' ? 'active' : ''} onClick={() => setView('portfolio')}>用户后台</button><button className={view === 'security' ? 'active' : ''} onClick={() => setView('security')}>安全中心</button><button className={view === 'admin' ? 'active' : ''} onClick={() => setView('admin')}>管理</button></div><div className="network"><b></b>Base</div>{isConnected ? <button className="wallet connected" onClick={() => disconnect()}><Wallet size={16}/>{short(address)}</button> : <button className="wallet" onClick={() => connect({ connector: connectors[0] })} disabled={connecting}><Wallet size={16}/>{connecting ? '连接中' : '连接钱包'}</button>}</nav>
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
    {view === 'portfolio' && <section className="terminal"><div className="section-heading"><div><p className="eyebrow">USER CONSOLE</p><h1>用户后台</h1><p>管理钱包连接、交易活动与链上授权。</p></div><UserRound size={30}/></div>{isConnected ? <div className="dashboard-grid"><article className="panel balance"><span>已连接地址</span><strong>{short(address)}</strong><small>Base · 公开链上账户</small><button className="wallet" onClick={() => setView('swap')}>开始交易</button></article><article className="panel"><h3>最近活动</h3>{activity.map(a=><div className="list-line" key={a[1]}><span><b>{a[1]}</b><small>{a[2]}</small></span><em>{a[0]}</em></div>)}</article><article className="panel"><h3>授权管理</h3><p>Orbit 仅在交易时请求精确额度授权。请使用区块浏览器定期核查并撤销不再需要的合约授权。</p><a className="outline-link" href="https://basescan.org/tokenapprovalchecker" target="_blank">打开 BaseScan Approval Checker <ExternalLink size={13}/></a></article></div> : <div className="portfolio-empty"><Wallet size={32}/><h3>连接钱包以进入后台</h3><p>Orbit 只读取公开链上数据，不保存任何资产或密钥。</p><button className="wallet" onClick={() => connect({ connector: connectors[0] })}>连接钱包</button></div>}</section>}
    {view === 'security' && <section className="terminal"><div className="section-heading"><div><p className="eyebrow">SECURITY CENTER</p><h1>安全中心</h1><p>非托管产品的安全由钱包、授权和交易确认共同构成。</p></div><LockKeyhole size={30}/></div><div className="security-grid"><article className="security-score"><ShieldCheck size={37}/><span>安全状态</span><strong>{isConnected ? '钱包已连接' : '等待钱包连接'}</strong><p>{isConnected ? '请在每次签名时核对金额、合约地址和网络。' : '连接受信任的钱包后，可查看你的公开链上状态。'}</p></article><article className="panel checklist"><h3>交易保护清单</h3><p><CheckCircle2/> 不请求或保存助记词、私钥</p><p><CheckCircle2/> 每笔交易由钱包独立确认</p><p><CheckCircle2/> ERC-20 仅使用精确授权额度</p><p><CheckCircle2/> 交易前展示网络费用和路由</p></article><article className="panel"><h3>安全操作</h3><p>遇到异常代币、未知签名或可疑链接，请停止操作。链上交易不可撤销。</p><a className="outline-link" href="https://basescan.org/tokenapprovalchecker" target="_blank"><KeyRound size={13}/> 检查并撤销授权</a></article></div><p className="data-note">安全中心不替代钱包供应商的安全设置，也不具有冻结、找回或转移用户资产的权限。</p></section>}
    {view === 'admin' && <section className="terminal"><div className="section-heading"><div><p className="eyebrow">OPERATIONS · DEMO</p><h1>管理员后台</h1><p>静态运营原型。没有管理员登录、真实用户数据或可执行控制权限。</p></div><UsersRound size={30}/></div><div className="admin-warning"><AlertTriangle size={18}/><span>仅展示预期运营架构。生产管理员后台必须部署在独立受认证保护的服务端，且不可托管用户资产。</span></div><div className="admin-kpis"><article><span>今日报价请求</span><b>—</b><small>需接入 API 指标</small></article><article><span>异常交易队列</span><b>—</b><small>需接入风控引擎</small></article><article><span>链路状态</span><b>监控待配置</b><small>RPC / 0x / 页面可用性</small></article></div><div className="dashboard-grid"><article className="panel"><h3>生产后台应具备</h3><p>RBAC、硬件密钥 / WebAuthn、强制 MFA、完整审计日志、双人审批与不可篡改告警。</p></article><article className="panel"><h3>风险与合规接口</h3><p>制裁与地址风险筛查、异常行为检测、速率限制、代币风险名单和事故响应工作流。</p></article><article className="panel"><h3>禁止的管理能力</h3><p>不得设计可提取私钥、代替用户签名、隐藏授权或修改链上结算的管理员功能。</p></article></div></section>}
    <footer><span>Orbit 不持有你的私钥、助记词或资产。</span><a href="https://0x.org/" target="_blank">由 0x 驱动 <ExternalLink size={13}/></a></footer>{picker && <TokenPicker onClose={() => setPicker(null)} onSelect={token => { if (picker === 'sell') { setSell(token); if (token.address === buy.address) setBuy(sell) } else { setBuy(token); if (token.address === sell.address) setSell(buy) } setAmount('') }}/>}</main>
}
