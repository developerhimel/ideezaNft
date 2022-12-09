import axios from "axios";
import BN from "bn.js";
import { deserializeUnchecked } from "borsh";
import moment from "moment";
import { getAuctionExtended } from "./auction";
import { extendBorsh } from "./borsh";
import { programIds } from "./programIds";
export const METADATA_PROGRAM_ID =
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";

export const VAULT_ID = "vau1zxA2LbssAUEF7Gpw91zMM1LvXrvpzJtmZ58rPsn";

export const AUCTION_ID = "auctxRXPeJoc4817jDhf4HbjnhEcr1cCXenosMhK5R8";

export const METAPLEX_ID = "p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98";
enum VaultKey {
  Uninitialized = 0,
  VaultV1 = 3,
  SafetyDepositBoxV1 = 1,
  ExternalPriceAccountV1 = 2,
}

extendBorsh();

enum VaultState {
  Inactive = 0,
  Active = 1,
  Combined = 2,
  Deactivated = 3,
}
class Vault {
  key: VaultKey;
  tokenProgram: string;
  fractionMint: string;
  authority: string;
  fractionTreasury: string;
  redeemTreasury: string;
  allowFurtherShareCreation: boolean;

  pricingLookupAddress: string;
  tokenTypeCount: number;
  state: VaultState;

  lockedPricePerShare: BN;

  constructor(args: {
    tokenProgram: string;
    fractionMint: string;
    authority: string;
    fractionTreasury: string;
    redeemTreasury: string;
    allowFurtherShareCreation: boolean;
    pricingLookupAddress: string;
    tokenTypeCount: number;
    state: VaultState;
    lockedPricePerShare: BN;
  }) {
    this.key = VaultKey.VaultV1;
    this.tokenProgram = args.tokenProgram;
    this.fractionMint = args.fractionMint;
    this.authority = args.authority;
    this.fractionTreasury = args.fractionTreasury;
    this.redeemTreasury = args.redeemTreasury;
    this.allowFurtherShareCreation = args.allowFurtherShareCreation;
    this.pricingLookupAddress = args.pricingLookupAddress;
    this.tokenTypeCount = args.tokenTypeCount;
    this.state = args.state;
    this.lockedPricePerShare = args.lockedPricePerShare;
  }
}
const VAULT_SCHEMA = new Map<any, any>([
  [
    Vault,
    {
      kind: "struct",
      fields: [
        ["key", "u8"],
        ["tokenProgram", "pubkeyAsString"],
        ["fractionMint", "pubkeyAsString"],
        ["authority", "pubkeyAsString"],
        ["fractionTreasury", "pubkeyAsString"],
        ["redeemTreasury", "pubkeyAsString"],
        ["allowFurtherShareCreation", "u8"],
        ["pricingLookupAddress", "pubkeyAsString"],
        ["tokenTypeCount", "u8"],
        ["state", "u8"],
        ["lockedPricePerShare", "u64"],
      ],
    },
  ],
]);

enum AuctionManagerStatus {
  Initialized,
  Validated,
  Running,
  Disbursing,
  Finished,
}

class AuctionManagerStateV2 {
  status: AuctionManagerStatus = AuctionManagerStatus.Initialized;
  safetyConfigItemsValidated: BN = new BN(0);
  bidsPushedToAcceptPayment: BN = new BN(0);
  hasParticipation: boolean = false;

  constructor(args?: AuctionManagerStateV2) {
    Object.assign(this, args);
  }
}

enum MetaplexKey {
  Uninitialized = 0,
  OriginalAuthorityLookupV1 = 1,
  BidRedemptionTicketV1 = 2,
  StoreV1 = 3,
  WhitelistedCreatorV1 = 4,
  PayoutTicketV1 = 5,
  SafetyDepositValidationTicketV1 = 6,
  AuctionManagerV1 = 7,
  PrizeTrackingTicketV1 = 8,
  SafetyDepositConfigV1 = 9,
  AuctionManagerV2 = 10,
  BidRedemptionTicketV2 = 11,
  AuctionWinnerTokenTypeTrackerV1 = 12,
  StoreIndexerV1 = 13,
  AuctionCacheV1 = 14,
  PackSet = 15,
}

class AuctionManagerV2 {
  key: MetaplexKey;
  store: string;
  authority: string;
  auction: string;
  vault: string;
  acceptPayment: string;
  state: AuctionManagerStateV2;
  auctionDataExtended?: string;

  constructor(args: {
    store: string;
    authority: string;
    auction: string;
    vault: string;
    acceptPayment: string;
    state: AuctionManagerStateV2;
  }) {
    this.key = MetaplexKey.AuctionManagerV2;
    this.store = args.store;
    this.authority = args.authority;
    this.auction = args.auction;
    this.vault = args.vault;
    this.acceptPayment = args.acceptPayment;
    this.state = args.state;

    const auction = programIds().auction;

    getAuctionExtended({
      auctionProgramId: auction,
      resource: this.vault,
    }).then((val) => (this.auctionDataExtended = val));
  }
}

const SCHEMA = new Map<any, any>([
  [
    AuctionManagerV2,
    {
      kind: "struct",
      fields: [
        ["key", "u8"],
        ["store", "pubkeyAsString"],
        ["authority", "pubkeyAsString"],
        ["auction", "pubkeyAsString"],
        ["vault", "pubkeyAsString"],
        ["acceptPayment", "pubkeyAsString"],
        ["state", AuctionManagerStateV2],
      ],
    },
  ],
  [
    AuctionManagerStateV2,
    {
      kind: "struct",
      fields: [
        ["status", "u8"],
        ["safetyConfigItemsValidated", "u64"],
        ["bidsPushedToAcceptPayment", "u64"],
        ["hasParticipation", "u8"],
      ],
    },
  ],
]);

enum PriceFloorType {
  None = 0,
  Minimum = 1,
  BlindedPrice = 2,
}

class PriceFloor {
  type: PriceFloorType;
  hash: Uint8Array;
  minPrice?: BN;

  constructor(args: {
    type: PriceFloorType;
    hash?: Uint8Array;
    minPrice?: BN;
  }) {
    this.type = args.type;
    this.hash = args.hash || new Uint8Array(32);
    if (this.type === PriceFloorType.Minimum) {
      if (args.minPrice) {
        this.hash.set(args.minPrice.toArrayLike(Buffer, "le", 8), 0);
      } else {
        this.minPrice = new BN(
          (args.hash || new Uint8Array(0)).slice(0, 8),
          "le"
        );
      }
    }
  }
}

enum AuctionState {
  Created = 0,
  Started,
  Ended,
}

enum BidStateType {
  EnglishAuction = 0,
  OpenEdition = 1,
}

class Bid {
  key: string;
  amount: BN;
  constructor(args: { key: string; amount: BN }) {
    this.key = args.key;
    this.amount = args.amount;
  }
}

class BidState {
  type: BidStateType;
  bids: Bid[];
  max: BN;

  public getWinnerAt(winnerIndex: number): string | null {
    const convertedIndex = this.bids.length - winnerIndex - 1;

    if (convertedIndex >= 0 && convertedIndex < this.bids.length) {
      return this.bids[convertedIndex].key;
    } else {
      return null;
    }
  }

  public getAmountAt(winnerIndex: number): BN | null {
    const convertedIndex = this.bids.length - winnerIndex - 1;

    if (convertedIndex >= 0 && convertedIndex < this.bids.length) {
      return this.bids[convertedIndex].amount;
    } else {
      return null;
    }
  }

  public getWinnerIndex(bidder: string): number | null {
    if (!this.bids) return null;

    const index = this.bids.findIndex((b) => b.key === bidder);
    // auction stores data in reverse order
    if (index !== -1) {
      const zeroBased = this.bids.length - index - 1;
      return zeroBased < this.max.toNumber() ? zeroBased : null;
    } else return null;
  }

  constructor(args: { type: BidStateType; bids: Bid[]; max: BN }) {
    this.type = args.type;
    this.bids = args.bids;
    this.max = args.max;
  }
}

export interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

class AuctionData {
  authority: string;
  tokenMint: string;
  lastBid: BN | null;
  endedAt: BN | null;
  endAuctionAt: BN | null;
  auctionGap: BN | null;
  priceFloor: PriceFloor;
  state: AuctionState;
  bidState: BidState;
  bidRedemptionKey?: string;
  auctionDataExtended?: string;

  public timeToEnd(): CountdownState {
    const now = moment().unix();
    const ended = { days: 0, hours: 0, minutes: 0, seconds: 0 };
    let endAt = this.endedAt?.toNumber() || 0;

    if (this.auctionGap && this.lastBid) {
      endAt = Math.max(
        endAt,
        this.auctionGap.toNumber() + this.lastBid.toNumber()
      );
    }

    let delta = endAt - now;

    if (!endAt || delta <= 0) return ended;

    const days = Math.floor(delta / 86400);
    delta -= days * 86400;

    const hours = Math.floor(delta / 3600) % 24;
    delta -= hours * 3600;

    const minutes = Math.floor(delta / 60) % 60;
    delta -= minutes * 60;

    const seconds = Math.floor(delta % 60);

    return { days, hours, minutes, seconds };
  }

  public ended() {
    const now = moment().unix();
    if (!this.endedAt) return false;

    if (this.endedAt.toNumber() > now) return false;

    if (this.endedAt.toNumber() < now) {
      if (this.auctionGap && this.lastBid) {
        const newEnding = this.auctionGap.toNumber() + this.lastBid.toNumber();
        return newEnding < now;
      } else return true;
    }
  }

  constructor(args: {
    authority: string;
    tokenMint: string;
    lastBid: BN | null;
    endedAt: BN | null;
    endAuctionAt: BN | null;
    auctionGap: BN | null;
    priceFloor: PriceFloor;
    state: AuctionState;
    bidState: BidState;
    totalUncancelledBids: BN;
  }) {
    this.authority = args.authority;
    this.tokenMint = args.tokenMint;
    this.lastBid = args.lastBid;
    this.endedAt = args.endedAt;
    this.endAuctionAt = args.endAuctionAt;
    this.auctionGap = args.auctionGap;
    this.priceFloor = args.priceFloor;
    this.state = args.state;
    this.bidState = args.bidState;
  }
}

class AuctionDataExtended {
  /// Total uncancelled bids
  totalUncancelledBids: BN;
  tickSize: BN | null;
  gapTickSizePercentage: number | null;
  instantSalePrice: BN | null;
  name: number[] | null;

  constructor(args: {
    totalUncancelledBids: BN;
    tickSize: BN | null;
    gapTickSizePercentage: number | null;
    instantSalePrice: BN | null;
    name: number[] | null;
  }) {
    this.totalUncancelledBids = args.totalUncancelledBids;
    this.tickSize = args.tickSize;
    this.gapTickSizePercentage = args.gapTickSizePercentage;
    this.instantSalePrice = args.instantSalePrice;
    this.name = args.name;
  }
}

const AUCTION_SCHEMA = new Map<any, any>([
  [
    AuctionData,
    {
      kind: "struct",
      fields: [
        ["authority", "pubkeyAsString"],
        ["tokenMint", "pubkeyAsString"],
        ["lastBid", { kind: "option", type: "u64" }],
        ["endedAt", { kind: "option", type: "u64" }],
        ["endAuctionAt", { kind: "option", type: "u64" }],
        ["auctionGap", { kind: "option", type: "u64" }],
        ["priceFloor", PriceFloor],
        ["state", "u8"],
        ["bidState", BidState],
      ],
    },
  ],
  [
    AuctionDataExtended,
    {
      kind: "struct",
      fields: [
        ["totalUncancelledBids", "u64"],
        ["tickSize", { kind: "option", type: "u64" }],
        ["gapTickSizePercentage", { kind: "option", type: "u8" }],
        ["instantSalePrice", { kind: "option", type: "u64" }],
        ["name", { kind: "option", type: [32] }],
      ],
    },
  ],
  [
    PriceFloor,
    {
      kind: "struct",
      fields: [
        ["type", "u8"],
        ["hash", [32]],
      ],
    },
  ],
  [
    BidState,
    {
      kind: "struct",
      fields: [
        ["type", "u8"],
        ["bids", [Bid]],
        ["max", "u64"],
      ],
    },
  ],
  [
    Bid,
    {
      kind: "struct",
      fields: [
        ["key", "pubkeyAsString"],
        ["amount", "u64"],
      ],
    },
  ],
]);

async function getAccount(address: string, type: number) {
  const masterReq = {
    jsonrpc: "2.0",
    id: 1,
    method: "getMultipleAccounts",
    params: [
      [address],
      {
        commitment: "recent",
        encoding: "base64",
      },
    ],
  };
  const { data: masterRes } = await axios.post(
    "https://api.devnet.solana.com",
    masterReq
  );

  const accountData = masterRes?.result?.value[0]?.data[0];
  let info;

  if (type == 1) {
    info = deserializeUnchecked(
      AUCTION_SCHEMA,
      AuctionData,
      Buffer.from(accountData, "base64")
    );
  } else if (type == 2) {
    info = deserializeUnchecked(
      SCHEMA,
      AuctionManagerV2,
      Buffer.from(accountData, "base64")
    );
  } else if (type == 3) {
    info = deserializeUnchecked(
      VAULT_SCHEMA,
      Vault,
      Buffer.from(accountData, "base64")
    );
  } else {
    info = deserializeUnchecked(
      AUCTION_SCHEMA,
      AuctionDataExtended,
      Buffer.from(accountData, "base64")
    );
  }

  return {
    pubkey: address,
    account: masterRes?.result?.value[0],
    info: info,
  };
}

async function getProgramAccount(address: string, bytes: string) {
  const masterReq = {
    jsonrpc: "2.0",
    id: 1,
    method: "getProgramAccounts",
    params: [
      address,
      {
        encoding: "jsonParsed",
        filters: [
          {
            memcmp: {
              offset: 1,
              bytes: bytes,
            },
          },
        ],
      },
    ],
  };
  const { data: masterRes } = await axios.post(
    "https://api.devnet.solana.com",
    masterReq
  );
  masterRes.result[0].account.data = masterRes?.result[0]?.account?.data[0];

  return {
    pubkey: masterRes.result[0].pubkey,
    account: masterRes.result[0].account,
  };
}

export async function getOrderData(saleData: any) {
  while (true) {
    // try {
    const auction = await getAccount(saleData.auction, 1);
    const auctionManager = await getAccount(saleData.auctionManager, 2);
    const vault = await getAccount(saleData.vault, 3);
    // return;
    console.log('xcoviuxcv', 'Line #557 getOrderData.ts');


    const auctionDataExtended = await getAccount(
      (auctionManager as any).info.auctionDataExtended,
      4
    );
    const safetyDeposit = await getProgramAccount(VAULT_ID, saleData.vault);
    const safetyDepositConfig = await getProgramAccount(
      METAPLEX_ID,
      saleData.auctionManager
    );

    delete (auction as any).info;
    delete (auctionManager as any).info;
    delete (vault as any).info;
    delete (auctionDataExtended as any).info;

    return {
      auction,
      auctionManager,
      vault,
      auctionDataExtended,
      safetyDeposit,
      safetyDepositConfig,
    };
    // } catch (err) {
    //   console.log(err, "Line #644 test2.ts");
    // }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}
