import {
  BidRedemptionTicket,
  decodeBidRedemptionTicket,
  ParsedAccount,
  AuctionManager,
  SafetyDepositConfig,
  AuctionDataExtended,
  AuctionManagerV2,
  AuctionViewState,
  MasterEditionV2,
  METADATA_SCHEMA,
  SafetyDepositBox,
  SCHEMA,
  Vault,
  VAULT_SCHEMA,
  AUCTION_SCHEMA,
  AuctionData,
  AuctionView,
} from "solana-helper";
import { MetadataData } from "@metaplex-foundation/mpl-token-metadata";
import { AccountInfo } from "@solana/web3.js";
import BN from "bn.js";
import axios from "axios";
import { deserializeUnchecked } from "borsh";

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
const isBidRedemptionTicketV1Account = (account: AccountInfo<Buffer>) =>
  account.data[0] === MetaplexKey.BidRedemptionTicketV1;

const isBidRedemptionTicketV2Account = (account: AccountInfo<Buffer>) =>
  account.data[0] === MetaplexKey.BidRedemptionTicketV2;

async function processData(
  pubkey: string,
  account: AccountInfo<Buffer>,
  bidRedemptions: any
) {
  if (
    isBidRedemptionTicketV1Account(account) ||
    isBidRedemptionTicketV2Account(account)
  ) {
    const ticket = decodeBidRedemptionTicket(account.data);
    const parsedAccount: ParsedAccount<BidRedemptionTicket> = {
      pubkey,
      account,
      info: ticket,
    };
    bidRedemptions[pubkey] = parsedAccount;
  }
}

async function getProgramAccount() {
  const bidRedemptions = {} as any;
  const masterReq = {
    jsonrpc: "2.0",
    id: 1,
    method: "getProgramAccounts",
    params: [
      "p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98",
      {
        encoding: "jsonParsed",
        filters: [
          {
            dataSize: 44,
          },
        ],
      },
    ],
  };
  const { data: masterRes } = await axios.post(
    "https://api.devnet.solana.com",
    masterReq
  );

  for (const res of masterRes.result) {
    res.account.data = Buffer.from(res.account.data[0], "base64");
    await processData(res.pubkey, res.account, bidRedemptions);
  }

  return bidRedemptions;
}

export async function getAuctionView(
  saleOrderData: any,
  itemData: any
): Promise<{ auctionView: AuctionView; bidRedemptions: any }> {
  const {
    auction,
    auctionManager: auctionManagerInstance,
    vault,
    auctionDataExtended,
    safetyDeposit,
    safetyDepositConfig,
  } = saleOrderData;
  const bidRedemptions = await getProgramAccount();

  auction.info = deserializeUnchecked(
    AUCTION_SCHEMA,
    AuctionData,
    Buffer.from(auction.account.data, "base64")
  );
  auctionManagerInstance.info = deserializeUnchecked(
    SCHEMA,
    AuctionManagerV2,
    Buffer.from(auctionManagerInstance.account.data, "base64")
  );
  vault.info = deserializeUnchecked(
    VAULT_SCHEMA,
    Vault,
    Buffer.from(vault.account.data, "base64")
  );
  auctionDataExtended.info = deserializeUnchecked(
    AUCTION_SCHEMA,
    AuctionDataExtended,
    Buffer.from(auctionDataExtended.account.data, "base64")
  );
  safetyDeposit.info = deserializeUnchecked(
    VAULT_SCHEMA,
    SafetyDepositBox,
    Buffer.from(safetyDeposit.account.data, "base64")
  ) as SafetyDepositBox;
  safetyDepositConfig.info = new SafetyDepositConfig({
    data: Buffer.from(safetyDepositConfig.account.data, "base64"),
  });

  const { metadata, masterEdition } = itemData;

  metadata.info = MetadataData.deserialize(
    Buffer.from(metadata.account.data, "base64")
  );

  masterEdition.info = deserializeUnchecked(
    METADATA_SCHEMA,
    MasterEditionV2,
    Buffer.from(masterEdition.account.data, "base64")
  );
  console.log(metadata, 'Line #154 getAuctionView.ts');
  

  const items = [
    [
      {
        metadata,
        winningConfigType: 0,
        safetyDeposit,
        amount: new BN(1),
        masterEdition,
      },
    ],
  ];

  const auctionView = {
    auction,
    auctionManager: new AuctionManager({
      instance: auctionManagerInstance,
      auction,
      vault,
      safetyDepositConfigs: [safetyDepositConfig],
      bidRedemptions: [],
    }),
    state: AuctionViewState.Live,
    vault,
    auctionDataExtended,
    safetyDepositBoxes: [safetyDeposit],
    items: items,
    thumbnail: items[0][0],
    isInstantSale: true,
    totallyComplete: true,
    myBidderPot: undefined,
    myBidderMetadata: undefined,
  };

  return { auctionView, bidRedemptions };
}
