export const CHAIN_DATA: any = {
  1: {
    name: "Ethereum",
    symbol: "ETH",
  },
  137: {
    name: "Polygon",
    symbol: "MATIC",
  },
  10: { name: "Optimism", symbol: "ETH" },
  56: { name: "BSC", symbol: "BNB" },
  101: { name: "Solana Mainnet", symbol: "SOL" },
  102: { name: "Solana Testnet", symbol: "SOL" },
  103: {
    name: "Solana Devnet",
    symbol: "SOL",
    erc20: [
      {
        address: "So11111111111111111111111111111111111111112",
        name: "Wrapped Sol",
        symbol: "SOL",
      },
    ],
  },
  250: { name: "Fantom", symbol: "FTM" },
  42220: { name: "Celo", symbol: "CELO" },
  43114: { name: "Alavanche", symbol: "AVAX" },
  3: {
    name: "Ropsten Testnet",
    symbol: "ETH",
    erc721: "0x7724ac5397380322b1D5C2233d2AFb43F26DDcd6",
    erc1155: "0x7eDB170680588BDd496EeAa8661b9456979D693B",
    blockExplorerUrl: "https://ropsten.etherscan.io",
    erc20: [
      {
        address: "0xc778417e063141139fce010982780140aa0cd5ab",
        name: "Wrapped Ether",
        symbol: "WETH",
      },
      {
        address: "0x14967C54eBB88a90F20957a52A13dB53E128680b",
        name: "(PoS) Dai Stablecoin",
        symbol: "DAI",
      },
      {
        address: "0x93Bd5D248a7B3a3160f43193ae291Ce8f469B511",
        name: "USD Coin (PoS)",
        symbol: "USDC",
      },
      {
        address: "0xfaF90cf323ECAFAb57863ABfE26543ce1A2350C1",
        name: "ApeCoin",
        symbol: "APE",
      },
    ],
  },
  42: {
    name: "Kovan Testnet",
    symbol: "ETH",
    erc721: "0xD33cC9Ca9C530FB28eF73a70C7C8Ff82B8748d24",
    erc1155: "0x5681488c3532207F2Aac2bc976d7fE704E3BF291",
    blockExplorerUrl: "https://kovan.etherscan.io",
    erc20: [
      {
        address: "0xd0a1e359811322d97991e03f863a0c30c2cf029c",
        name: "Wrapped Ether",
        symbol: "WETH",
      },
      {
        address: "0x95f939862a2a4e3fa3D16963b19285830eF026ad",
        name: "(PoS) Dai Stablecoin",
        symbol: "DAI",
      },
      {
        address: "0x318215486A0F275A6A62863557D5738d9bEf815c",
        name: "USD Coin (PoS)",
        symbol: "USDC",
      },
      {
        address: "0xd64fee3826fc641bbFc044F321c084cCFFF55571",
        name: "ApeCoin",
        symbol: "APE",
      },
    ],
  },
  4002: { name: "Fantom Testnet", symbol: "FTM" },
  80001: {
    name: "Polygon Testnet",
    symbol: "MATIC",
    erc721: "0xd52410B5EC44F69eCC029B5d432C0cbc5B6aA4FC",
    erc1155: "0x9BA4d4D6Afba6E3d37f29e6c123Cb5a42Eb89bff",
    trader:"0x6Ca056833faD8f7c4C359B5E6AcF740B37B6dBC7",
    blockExplorerUrl: "https://mumbai.polygonscan.com",
    erc20: [
      {
        address: "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889",
        name: "Wrapped Matic",
        symbol: "WMATIC",
      },
      {
        address: "0xabCEA273f026dDDcd4d3E98Cc2b30a36F9eDac32",
        name: "(PoS) Dai Stablecoin",
        symbol: "DAI",
      },
      {
        address: "0xfeA7109aC6dB4ED8889d5d2283a3e9aD3C7B92ba",
        name: "USD Coin (PoS)",
        symbol: "USDC",
      },
      {
        address: "0x3A191dEa518B2B96e12812908eEad0f6991d60dC",
        name: "REVV",
        symbol: "REVV",
      },
    ],
  },
};
