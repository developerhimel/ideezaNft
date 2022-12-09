import axios from "axios";
import { deserializeUnchecked } from "borsh";
import {
  AccountAndPubkey,
  AuctionData,
  AUCTION_ID,
  AUCTION_SCHEMA,
  ProcessAccountsFunc,
  processAuctions,
} from "solana-helper";
import { getProgramAccounts } from "solana-helper/dist/common/contexts/meta/web3";

async function getAuction(address: string) {
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
  masterRes.result.value[0].data = masterRes.result.value[0].data[0];
  const accountData = masterRes.result.value[0].data;
  let info;

  info = deserializeUnchecked(
    AUCTION_SCHEMA,
    AuctionData,
    Buffer.from(accountData, "base64")
  );

  return {
    pubkey: address,
    account: masterRes.result.value[0],
    info: info,
  };
}

const forEach =
  (fn: ProcessAccountsFunc, updateTemp: any) =>
  async (accounts: AccountAndPubkey[]) => {
    for (const account of accounts) {
      await fn(account, updateTemp);
    }
  };

export async function getAuctionBidder(connection: any, auctionPubkey: string) {
  const obj = {} as any;
  await getProgramAccounts(connection, AUCTION_ID, {
    filters: [
      {
        memcmp: {
          offset: 32,
          bytes: auctionPubkey,
        },
      },
    ],
  }).then(
    forEach(processAuctions, (s: any, pubkey: any, parsedAccount: any) => {
      obj[s] = parsedAccount;
    })
  );

  // bidder pot pull
  await getProgramAccounts(connection, AUCTION_ID, {
    filters: [
      {
        memcmp: {
          offset: 64,
          bytes: auctionPubkey,
        },
      },
    ],
  }).then(
    forEach(processAuctions, (s: any, pubkey: any, parsedAccount: any) => {
      obj[s] = parsedAccount;
    })
  );

  obj.auction = await getAuction(auctionPubkey);

  return obj;
}
