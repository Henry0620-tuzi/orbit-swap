export type Token = { symbol: string; name: string; address: `0x${string}`; decimals: number; color: string }

export const TOKENS: Token[] = [
  { symbol: 'ETH', name: 'Ethereum', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18, color: '#627eea' },
  { symbol: 'USDC', name: 'USD Coin', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, color: '#2775ca' },
  { symbol: 'cbBTC', name: 'Coinbase Wrapped BTC', address: '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf', decimals: 8, color: '#f7931a' },
  { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x50c5725949a6f0c72e6c4c89c4a4aa0f2bf1cd0d', decimals: 18, color: '#f5ac37' },
  { symbol: 'USDbC', name: 'Bridged USDC', address: '0xd9aaec86b65d86f6a7b5e56b9b3f6d4a0e09eac4', decimals: 6, color: '#5b6dee' },
]
