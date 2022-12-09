import { MongoClient, ObjectId } from "mongodb";
import { useRouter } from "next/router";
import AuctionNftForm from "../../../../components/nfts/AuctionNftForm";
import web3 from "web3";
import { useState, useEffect } from "react";
import erc20ABI from "../../../../contracts/abi/erc20ABI.json";
import erc1155ABI from "../../../../contracts/abi/erc1155ABI.json";
import erc1155trader from "../../../../contracts/abi/erc1155trader.json";
import { CHAIN_DATA } from "../../../../constants/chain";
import { Contract } from "@ethersproject/contracts";
import useConnectionInfo from "../../../../hooks/connectionInfo";
import BN from "bn.js";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { MetadataData } from "@metaplex-foundation/mpl-token-metadata";
import { deserializeUnchecked } from "borsh";
import {
  AmountRange,
  IPartialCreateAuctionArgs,
  MasterEditionV2,
  METADATA_SCHEMA,
  NonWinningConstraint,
  ParticipationConfigV2,
  PriceFloor,
  PriceFloorType,
  useTokenList,
  WinnerLimit,
  WinnerLimitType,
  WinningConfigType,
  WinningConstraint,
} from "solana-helper";
import { createAuctionManager } from "solana-helper/dist/actions/createAuctionManager";
import { crawlItemData } from "../../../../helpers/solana/getMetadata";
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

function AuctionNftPage(props: any) {
  const router = useRouter();
  const tokenList = useTokenList();
  const { user, library, chainId, wallet, connection } = useConnectionInfo();
  const [loading, setLoading] = useState(false);

  console.log(props);

  async function auctionNftHandler(enteredNftData: any) {
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

    if (props.nft.erc1155) {
      const contract1 = new Contract(
        CHAIN_DATA[Number(chainId)].erc1155 as string,
        erc1155ABI,
        signer
      );
      const contract2 = new Contract(
        CHAIN_DATA[Number(chainId)].trader as string,
        erc1155trader,
        signer
      );
      const balanceOf = await contract1.balanceOf(
        user.address,
        props.nft.tokenId
      );
      const price = toWei(enteredNftData.startingPrice.toString());
      if (balanceOf >= enteredNftData.amount) {
        try {
          await contract2.createAuction(
            CHAIN_DATA[Number(chainId)].erc1155 as string,
            enteredNftData.amount,
            price,
            props.nft.tokenId
          );
        } catch (error) {
          console.log(error);
          setLoading(false);
          return;
        }
      }
    }

    await fetch("/api/update-nft", {
      method: "PUT",
      body: JSON.stringify({
        id: props.nft.id,
        status: "AUCTION",
        symbol: symbol,
        erc20TokenAddress: enteredNftData.erc20TokenAddress,
        auctionAmount: enteredNftData.amount,
        startingPrice: toWei(
          enteredNftData.startingPrice.toFixed(10).toString()
        ),
        startAuctionTime: new Date(Date.now()),
        endAuctionTime: new Date(Date.now() + enteredNftData.expiry * 1000),
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
        name: "List for auction",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    setLoading(false);
    router.push(`/nfts`);
  }

  const auctionSolanaNftHandler = async (enteredNftData: any) => {
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
        minPrice: new BN(enteredNftData.startingPrice * LAMPORTS_PER_SOL),
      }),
      tokenMint: enteredNftData.erc20TokenAddress,
      instantSalePrice: null,
      endAuctionAt: new BN(parseInt(enteredNftData.expiry)),
      auctionGap: new BN(0),
      gapTickSizePercentage: null,
      tickSize: null,
      name: null,
    };

    const auctionData = await createAuctionManager(
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
        status: "AUCTION",
        symbol: tokenList.tokenMap.get(enteredNftData.erc20TokenAddress)
          ?.symbol,
        erc20TokenAddress: enteredNftData.erc20TokenAddress,
        startingPrice: toWei(
          enteredNftData.startingPrice.toFixed(10).toString()
        ),
        startAuctionTime: new Date(Date.now()),
        endAuctionTime: new Date(Date.now() + enteredNftData.expiry * 1000),
        action: "List for auction",
        actionUserId: user.id,
        auctionData,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    router.push(`/nfts`);
  };

  return (
    <AuctionNftForm
      erc1155={props.nft.erc1155}
      chainId={props.nft.chainId}
      onAuctionNft={user.solana ? auctionSolanaNftHandler : auctionNftHandler}
      loading={loading}
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

export default AuctionNftPage;
