import { WalletContextState } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { AuctionView, BidderMetadata, BidRedemptionTicket, ParsedAccount, PrizeTrackingTicket, sendTransactions, TokenAccount } from "solana-helper";
import { claimUnusedPrizes } from "solana-helper/dist/actions/claimUnusedPrizes";
import { endAuction } from "solana-helper/dist/models/metaplex/endAuction";

export interface EndSaleParams {
  auctionView: AuctionView;
  connection: Connection;
  accountByMint: Map<string, TokenAccount>;
  bids: ParsedAccount<BidderMetadata>[];
  bidRedemptions: Record<string, ParsedAccount<BidRedemptionTicket>>;
  prizeTrackingTickets: Record<string, ParsedAccount<PrizeTrackingTicket>>;
  wallet: WalletContextState;
}

export async function endSale({
  auctionView,
  connection,
  accountByMint,
  bids,
  bidRedemptions,
  prizeTrackingTickets,
  wallet,
}: EndSaleParams) {
  const { vault, auctionManager } = auctionView;

  const endAuctionInstructions = [] as any;
  await endAuction(
    new PublicKey(vault.pubkey),
    new PublicKey(auctionManager.authority),
    endAuctionInstructions
  );

  const claimInstructions = [] as any;
  const claimSigners = [] as any;
  await claimUnusedPrizes(
    connection,
    wallet,
    auctionView,
    accountByMint,
    bids,
    bidRedemptions,
    prizeTrackingTickets,
    claimSigners,
    claimInstructions
  );

  const instructions = [endAuctionInstructions, ...claimInstructions];
  const signers = [[], ...claimSigners];

  return sendTransactions(connection, wallet, instructions, signers);
}