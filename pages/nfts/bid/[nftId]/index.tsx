import { MongoClient, ObjectId } from "mongodb";
import BidNftForm from "../../../../components/nfts/BidNftForm";
import { useEffect, useState } from "react";
import { NftSwapV4 as NftSwap } from "@traderxyz/nft-swap-sdk";
import web3 from "web3";
import { useRouter } from "next/router";
import useConnectionInfo from "../../../../hooks/connectionInfo";
import { zeroContractAddresses } from "../../../../contracts/zeroExContracts";
import { CHAIN_DATA } from "../../../../constants/chain";
import { sendPlaceBid } from "solana-helper/dist/actions/sendPlaceBid";
import { AuctionView, TokenAccount } from "solana-helper";
import BN from "bn.js";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAuctionView } from "../../../../helpers/solana/getAuctionView";
import { getAuctionBidder } from "../../../../helpers/solana/getAuctionBidder";
import { crawlItemData } from "../../../../helpers/solana/getMetadata";
import { getOrderData } from "../../../../helpers/solana/getOrderData";

const { toWei, fromWei } = web3.utils;

function BidNftPage(props: any) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { user, library, chainId, connection, wallet } = useConnectionInfo();

  useEffect(() => {
    const { ethereum } = window;
    const changeChain = async () => {
      if (user.id && !user.solana && props.nft.chainId != chainId) {
        try {
          await ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [
              { chainId: `0x${Number(props.nft.chainId).toString(16)}` },
            ], // chainId must be in hexadecimal numbers
          });
        } catch (e: any) {
          if (e.code === 4902) {
            window.alert(
              `Please add chain with id ${props.nft.chainId} to your wallet then try again`
            );
          }
        }
      }
    };

    changeChain();
  }, [chainId, props.nft.chainId, user]);

  async function bidNftHandler(enteredNftData: any) {
    setLoading(true);
    const signer = library.getSigner();

    let takerAsset: any = {
      tokenAddress: CHAIN_DATA[Number(chainId)].erc721,
      tokenId: props.nft.tokenId,
      type: "ERC721",
    };

    if (props.nft.erc1155) { // IF multiple tokens
      takerAsset = {
        tokenAddress: CHAIN_DATA[Number(chainId)].erc1155,
        tokenId: props.nft.tokenId,
        type: "ERC1155",
        amount: props.nft.auctionAmount,
      }
    }

    const makerAsset: any = {
      tokenAddress: props.nft.erc20TokenAddress,
      amount: toWei(enteredNftData.amount.toFixed(10).toString()),
      type: "ERC20",
    };

    const nftSwapSdk = new NftSwap(library, signer, chainId, {
      zeroExExchangeProxyContractAddress: zeroContractAddresses[Number(chainId)]
        ? zeroContractAddresses[Number(chainId)]
        : undefined,
    });

    // Check if we need to approve the NFT for swapping
    const approvalStatusForUserB = await nftSwapSdk.loadApprovalStatus(
      makerAsset,
      user.address
    );

    // If we do need to approve NFT for swapping, let's do that now
    if (!approvalStatusForUserB.contractApproved) {
      const approvalTx = await nftSwapSdk.approveTokenOrNftByAsset(
        makerAsset,
        user.address
      );
      const approvalTxReceipt = await approvalTx.wait();
      console.log(
        `Approved ${makerAsset.tokenAddress} contract to swap with 0x. TxHash: ${approvalTxReceipt.transactionHash})`
      );
    }

    const marketplaceFee =
      (Number(process.env.NEXT_PUBLIC_MARKETPLACE_FEE) *
        enteredNftData.amount) /
      100;
    const royaltyFee = (props.nft.royaltyFee * enteredNftData.amount) / 100;

    // Create the order (Remember, User A initiates the trade, so User A creates the order)
    const order = nftSwapSdk.buildOrder(makerAsset, takerAsset, user.address, {
      taker: props.user.address,
      fees: [
        {
          recipient: process.env.NEXT_PUBLIC_ADMIN_WALLET as string,
          amount: toWei(marketplaceFee.toFixed(10).toString()),
        },
        {
          recipient: props.nft.creator,
          amount: toWei(royaltyFee.toFixed(10).toString()),
        },
      ],
    });

    const signedOrder = await nftSwapSdk.signOrder(order);

    let { bidOrders } = props.nft;
    if (!bidOrders) bidOrders = [];
    bidOrders = bidOrders.filter((x: any) => x.userId != user.id);
    bidOrders.push({ signedOrder, userId: user.id });
    bidOrders.sort((a: any, b: any) => {
      return (
        Number(fromWei(b.signedOrder.erc20TokenAmount)) -
        Number(fromWei(a.signedOrder.erc20TokenAmount))
      );
    });

    await fetch("/api/update-nft", {
      method: "PUT",
      body: JSON.stringify({
        id: props.nft.id,
        bidOrders: bidOrders,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    await fetch("/api/new-action", {
      method: "POST",
      body: JSON.stringify({
        userId: user.id,
        nftId: props.nft.id,
        name: "Bid",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    router.push(`/nfts`);
  }

  async function bidSolanaNftHandler(enteredNftData: any) {
    console.log(props.nft.auctionData);
    const itemData = await crawlItemData(props.nft.metadata, props.user.address);
    const auctionOrderData = await getOrderData(props.nft.auctionData);
    console.log(auctionOrderData);
    return;
    
    const { auctionView } = await getAuctionView(
      auctionOrderData,
      itemData
    );
    const obj = await getAuctionBidder(connection, auctionView.auction.pubkey);
    auctionView.auction = obj.auction;
    auctionView.myBidderPot = obj.bidderPotsByAuctionAndBidder;
    auctionView.myBidderMetadata = obj.bidderMetadataByAuctionAndBidder;

    await sendPlaceBid(
      connection,
      wallet,
      user.address,
      auctionView as AuctionView,
      new Map<string, TokenAccount>(),
      new BN(Number(enteredNftData.amount) * LAMPORTS_PER_SOL)
    );

    const signedOrder = {
      maker: user.address,
      erc20TokenAmount: Number(enteredNftData.amount),
    };

    let { bidOrders } = props.nft;
    if (!bidOrders) bidOrders = [];
    bidOrders = bidOrders.filter((x: any) => x.userId != user.id);
    bidOrders.push({ signedOrder, userId: user.id });
    bidOrders.sort((a: any, b: any) => {
      return b.signedOrder.erc20TokenAmount - a.signedOrder.erc20TokenAmount;
    });

    await fetch("/api/update-nft", {
      method: "PUT",
      body: JSON.stringify({
        id: props.nft.id,
        action: "Bid",
        actionUserId: user.id,
        bidOrders: bidOrders,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    router.push(`/nfts`);
  }

  return (
    <BidNftForm
      minPrice={fromWei(props.nft.startingPrice)}
      onBidNft={props.nft.solana ? bidSolanaNftHandler : bidNftHandler}
      loading={loading}
      nft={props.nft}
    />
  );
}

export async function getServerSideProps(ctx: any) {
  // fetch data from an API
  const client = await MongoClient.connect(process.env.MONGODB_URI as string);

  const db = client.db();

  const nftsCollection = db.collection("nfts");
  const usersCollection = db.collection("users");

  const nft: any = await nftsCollection.findOne({
    _id: new ObjectId(ctx.params.nftId),
  });
  const user: any = await usersCollection.findOne({
    _id: new ObjectId(nft.userId),
  });

  client.close();

  return {
    props: {
      nft: {
        ...nft,
        id: nft._id.toString(),
        _id: null,
      },
      user: {
        ...user,
        id: user._id.toString(),
        _id: null,
      },
    },
  };
}

export default BidNftPage;
