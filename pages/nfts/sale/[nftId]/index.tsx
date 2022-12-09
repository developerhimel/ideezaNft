import { MongoClient, ObjectId } from "mongodb";
import SaleNftForm from "../../../../components/nfts/SaleNftForm";
import { useEffect, useState } from "react";
import { NftSwapV4 as NftSwap } from "@traderxyz/nft-swap-sdk";
import web3 from "web3";
import { useRouter } from "next/router";
import { Contract } from "@ethersproject/contracts";
import erc20ABI from "../../../../contracts/abi/erc20ABI.json";
import { CHAIN_DATA } from "../../../../constants/chain";
import { zeroContractAddresses } from "../../../../contracts/zeroExContracts";
import useConnectionInfo from "../../../../hooks/connectionInfo";
import {
  AmountRange,
  IPartialCreateAuctionArgs,
  MasterEditionV2,
  METADATA_SCHEMA,
  NonWinningConstraint,
  ParticipationConfigV2,
  PriceFloor,
  PriceFloorType,
  useMeta,
  useTokenList,
  WinnerLimit,
  WinnerLimitType,
  WinningConfigType,
  WinningConstraint,
} from "solana-helper";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { createAuctionManager } from "solana-helper/dist/actions/createAuctionManager";
import BN from "bn.js";
import { MetadataData } from "@metaplex-foundation/mpl-token-metadata";
import { deserializeUnchecked } from "borsh";
import { crawlItemData } from "../../../../helpers/solana/getMetadata";
export enum AuctionCategory {
  InstantSale,
  Limited,
  Single,
  Open,
  Tiered,
}

async function combine(metadata: any, masterEdition: any, tokenAccount: any) {
  let winningConfigType: WinningConfigType;
  if (masterEdition.info.maxSupply) {
    winningConfigType = WinningConfigType.PrintingV2;
  } else {
    winningConfigType = WinningConfigType.Participation;
  }

  return {
    holding: tokenAccount.pubkey,
    edition: undefined,
    masterEdition,
    metadata: metadata,
    printingMintHolding: undefined,
    winningConfigType,
    amountRanges: [],
    participationConfig:
      winningConfigType == WinningConfigType.Participation
        ? new ParticipationConfigV2({
            winnerConstraint: WinningConstraint.ParticipationPrizeGiven,
            nonWinningConstraint: NonWinningConstraint.GivenForFixedPrice,
            fixedPrice: new BN(0),
          })
        : undefined,
  };
}

const { toWei } = web3.utils;

function SaleNftPage(props: any) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const tokenList = useTokenList();
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

  async function saleNftHandler(enteredNftData: any) {
    setLoading(true);
    const signer = library.getSigner();
    enteredNftData.erc20TokenAddress =
      enteredNftData.erc20TokenAddress.toLowerCase();
    let symbol = CHAIN_DATA[Number(chainId)].symbol;

    if (
      enteredNftData.erc20TokenAddress !=
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
    ) {
      const contract = new Contract(
        enteredNftData.erc20TokenAddress,
        erc20ABI,
        signer
      );
      symbol = await contract.symbol();
    }

    let makerAsset: any = {
      tokenAddress: CHAIN_DATA[Number(chainId)].erc721,
      tokenId: props.nft.tokenId,
      type: "ERC721",
    };

    if (props.nft.erc1155) { // IF multiple tokens
      makerAsset = {
        tokenAddress: CHAIN_DATA[Number(chainId)].erc1155,
        tokenId: props.nft.tokenId,
        type: "ERC1155",
        amount: enteredNftData.makerAmount,
      }
    }

    const takerAsset: any = {
      tokenAddress: enteredNftData.erc20TokenAddress,
      amount: toWei(enteredNftData.amount.toFixed(10).toString()),
      type: "ERC20",
    };

    const makerAddress = props.user.address;

    const nftSwapSdk = new NftSwap(library, signer, chainId, {
      zeroExExchangeProxyContractAddress: zeroContractAddresses[Number(chainId)]
        ? zeroContractAddresses[Number(chainId)]
        : undefined,
    });

    // Check if we need to approve the NFT for swapping
    const approvalStatusForUserA = await nftSwapSdk.loadApprovalStatus(
      makerAsset,
      makerAddress
    );

    // If we do need to approve User A's CryptoPunk for swapping, let's do that now
    if (!approvalStatusForUserA.contractApproved) {
      const approvalTx = await nftSwapSdk.approveTokenOrNftByAsset(
        makerAsset,
        makerAddress
      );
      const approvalTxReceipt = await approvalTx.wait();
      console.log(
        `Approved ${makerAsset.tokenAddress} contract to swap with 0x v4 (txHash: ${approvalTxReceipt.transactionHash})`
      );
    }

    const marketplaceFee =
      (Number(process.env.NEXT_PUBLIC_MARKETPLACE_FEE) *
        enteredNftData.amount) /
      100;
    const royaltyFee = (props.nft.royaltyFee * enteredNftData.amount) / 100;

    // Create the order (Remember, User A initiates the trade, so User A creates the order)
    const order = nftSwapSdk.buildOrder(makerAsset, takerAsset, makerAddress, {
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

    await fetch("/api/update-nft", {
      method: "PUT",
      body: JSON.stringify({
        id: props.nft.id,
        status: "LIST",
        symbol: symbol,
        saleAmount: enteredNftData.makerAmount,
        price: enteredNftData.amount,
        action: "List for sale",
        actionUserId: user.id,
        signedOrder,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    router.push(`/nfts`);
  }

  const saleSolanaNftHandler = async (enteredNftData: any) => {
    setLoading(true);
    enteredNftData.erc20TokenAddress = new PublicKey(
      enteredNftData.erc20TokenAddress
    ).toBase58();
    const { creator } = props.nft;
    const itemData = await crawlItemData(
      props.nft.metadata,
      props.user.address
    );

    itemData.metadata.info = MetadataData.deserialize(
      Buffer.from(itemData.metadata.account.data, "base64")
    );

    itemData.masterEdition.info = deserializeUnchecked(
      METADATA_SCHEMA,
      MasterEditionV2,
      Buffer.from(itemData.masterEdition.account.data, "base64")
    );
    const item: any = await combine(
      itemData.metadata,
      itemData.masterEdition,
      itemData.tokenAccount
    );
    item.metadata.info.masterEdition = item.masterEdition.pubkey;
    item.metadata.info.edition = item.masterEdition.pubkey;
    console.log(item, "item");

    item.winningConfigType = WinningConfigType.TokenOnlyTransfer;
    item.amountRanges = [
      new AmountRange({
        amount: new BN(1),
        length: new BN(1),
      }),
    ];

    const auctionSettings: IPartialCreateAuctionArgs = {
      winners: new WinnerLimit({
        type: WinnerLimitType.Capped,
        usize: new BN(1),
      }),
      priceFloor: new PriceFloor({
        type: PriceFloorType.Minimum,
        minPrice: new BN(enteredNftData.amount * LAMPORTS_PER_SOL),
      }),
      tokenMint: enteredNftData.erc20TokenAddress,
      instantSalePrice: new BN(enteredNftData.amount * LAMPORTS_PER_SOL),
      endAuctionAt: null,
      auctionGap: null,
      gapTickSizePercentage: null,
      tickSize: null,
      name: null,
    };

    const saleData = await createAuctionManager(
      connection,
      wallet,
      {},
      auctionSettings,
      [item],
      undefined,
      enteredNftData.erc20TokenAddress,
      [],
      creator
    );

    await fetch("/api/update-nft", {
      method: "PUT",
      body: JSON.stringify({
        id: props.nft.id,
        status: "LIST",
        price: enteredNftData.amount,
        symbol: tokenList.tokenMap.get(enteredNftData.erc20TokenAddress)
          ?.symbol,
        saleRoyaltyFee: enteredNftData.saleRoyaltyFee,
        action: "List for sale",
        actionUserId: user.id,
        saleData,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    router.push(`/nfts/${user.id}`);
  };
console.log(user);

  return (
    <>
      {user.id && (
        <SaleNftForm
          erc1155={props.nft.erc1155}
          chainId={props.nft.chainId}
          initialValue={
            user.solana
              ? "So11111111111111111111111111111111111111112"
              : "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
          }
          onSaleNft={user.solana ? saleSolanaNftHandler : saleNftHandler}
          solana={user.solana}
          loading={loading}
        />
      )}
    </>
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

export default SaleNftPage;
