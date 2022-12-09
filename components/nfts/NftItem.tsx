import { Button, Card, Image, InputNumber } from "antd";
import { useEffect, useState } from "react";
import { NftSwapV4 as NftSwap } from "@traderxyz/nft-swap-sdk";
const { Meta } = Card;
import web3 from "web3";
import { useRouter } from "next/router";
import { CHAIN_DATA } from "../../constants/chain";
import { zeroContractAddresses } from "../../contracts/zeroExContracts";
import useConnectionInfo from "../../hooks/connectionInfo";
import { sendPlaceBid } from "solana-helper/dist/actions/sendPlaceBid";
import { AuctionView, TokenAccount } from "solana-helper";
import { sendRedeemBid } from "solana-helper/dist/actions/sendRedeemBid";
import { getAuctionView } from "../../helpers/solana/getAuctionView";
import { getAuctionBidder } from "../../helpers/solana/getAuctionBidder";
import { crawlItemData } from "../../helpers/solana/getMetadata";
import { getOrderData } from "../../helpers/solana/getOrderData";
import { Contract } from "@ethersproject/contracts";
import erc1155trader from "../../contracts/abi/erc1155trader.json";
import erc1155ABI from "../../contracts/abi/erc1155ABI.json";

const { fromWei } = web3.utils;
const { toWei } = web3.utils;

const timeString = (time: number) => {
  const day = Math.trunc(time / 86400000);
  time -= day * 86400000;
  const hour = Math.trunc(time / 3600000);
  time -= hour * 3600000;
  const min = Math.trunc(time / 60000);
  time -= min * 60000;
  const sec = Math.trunc(time / 1000);
  time -= sec * 1000;

  return `${day}:${hour < 10 ? "0" : ""}${hour}:${min < 10 ? "0" : ""}${min}:${
    sec < 10 ? "0" : ""
  }${sec}`;
};

function NftItem(props: any) {
  const router = useRouter();
  const { user, library, chainId, connection, wallet } = useConnectionInfo();
  const [status, setStatus] = useState(props.status);
  const [loading, setLoading] = useState(false);
  const [endAuctionTime, setEndAuctionTime] = useState(undefined as any);
  const [highestBid, setHighestBid] = useState(false);
  const [amountToBuy, setAmountToBuy] = useState(undefined as any);

  useEffect(() => {
    let { status } = props;

    const checkStatus = () => {
      if (
        status === "AUCTION" &&
        new Date(props.endAuctionTime).getTime() < Date.now()
      ) {
        if (
          props.bidOrders &&
          props.bidOrders.length &&
          props.bidOrders[0].signedOrder.maker === user.address
        ) {
          setHighestBid(true);
        }
        setStatus("END AUCTION");
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 1000);
    return () => clearInterval(interval);
  }, [props]);

  useEffect(() => {
    if (props.endAuctionTime) {
      setEndAuctionTime(new Date(props.endAuctionTime).getTime() - Date.now());

      const minusAuctionTime = () => {
        setEndAuctionTime((value: number) => value - 1000);
      };
      const interval = setInterval(minusAuctionTime, 1000);
      return () => clearInterval(interval);
    }
  }, [props]);

  return (
    <>
      <Card
        hoverable
        style={{
          width: 240,
        }}
        cover={<Image alt="example" src={props.imageUrl} />}
      >
        <Meta title={props.name} description={status} />
        <br />
        <b>Chain: </b>
        <p>{CHAIN_DATA[props.chainId]?.name}</p>
        <br />
        {props.erc1155 && (
          <>
            <b>Amount: </b>
            <p>{props.amount}</p>
            <br />
            <b>Left: </b>
            <p>{props.nft.left}</p>
            <br />
          </>
        )}

        {status === "LIST" && (
          <>
            {props.erc1155 && (
              <>
                <b>Price: </b>
                <p>{props.price + " " + props.symbol}</p>
                <br />
                {user && user.id !== props?.userId && (
                  <>
                    <div>
                      <InputNumber
                        placeholder="amount"
                        onChange={(val) => setAmountToBuy(val)}
                        max={props.left}
                      />
                    </div>
                    <br />
                    <Button
                      type="primary"
                      style={{ margin: "auto" }}
                      onClick={async (e) => {
                        e.preventDefault();
                        setLoading(true);
                        if (!amountToBuy) {
                          alert("Please enter an amount to buy this nft.");
                          setLoading(false);
                        } else {
                          const cost = toWei(
                            (props.price * amountToBuy).toString()
                          );
                          const signer = library.getSigner();
                          const contract = new Contract(
                            CHAIN_DATA[Number(chainId)].trader as string,
                            erc1155trader,
                            signer
                          );

                          try {
                            await contract.buy(
                              CHAIN_DATA[Number(chainId)].erc1155,
                              props.tokenId,
                              amountToBuy,
                              { value: cost }
                            );
                          } catch (error) {
                            console.log(error);
                            setLoading(false);
                          }

                          await fetch("/api/erc1155/buyNft", {
                            method: "POST",
                            body: JSON.stringify({
                              imageUrl: props.nft.imageUrl,
                              assetURI: props.nft.assetURI,
                              metadataURI: props.nft.metadataURI,
                              name: props.nft.name + ` (copy)`,
                              description: props.nft.description,
                              royaltyFee: props.nft.royaltyFee,
                              creator: user.address,
                              collectionId: null,
                              metadata: null,
                              solana: null,
                              chainId: chainId?.toString(),
                              status: "AVAILABLE",
                              tokenId: props.tokenId,
                              userId: user._id,
                              amount: amountToBuy,
                              erc1155: true,
                              left: amountToBuy,
                              baseNft: props.nft.id,
                            }),
                            headers: {
                              "Content-Type": "application/json",
                            },
                          }).then(async () => {
                            const left = props.nft.left - amountToBuy;
                            await fetch("/api/update-nft", {
                              method: "PUT",
                              body: JSON.stringify({
                                id: props.nft.id,
                                left: left,
                              }),
                              headers: {
                                "Content-Type": "application/json",
                              },
                            }).then(() => {
                              setLoading(false);
                              router.push(`/nfts/${user.id}`);
                            });
                          });
                        }
                      }}
                      loading={loading}
                    >
                      Buy
                    </Button>
                    <br />
                    <br />
                  </>
                )}
              </>
            )}
            {props.signedOrder && (
              <>
                <b>Price</b>
                <p>
                  {(props.price
                    ? props.price
                    : fromWei(props.signedOrder.erc20TokenAmount)) +
                    ` ${props.symbol}`}
                </p>
              </>
            )}
            {user && user.id !== props?.userId && !props.erc1155 && (
              <>
                <b>Price: </b>
                <p>{props.price + " " + props.symbol}</p>
                <br />
                <Button
                  type="primary"
                  style={{ margin: "auto" }}
                  onClick={async (e) => {
                    e.preventDefault();
                    setLoading(true);

                    if (user.solana && wallet) {
                      const itemData = await crawlItemData(
                        props.metadata,
                        props.user.address
                      );
                      console.log(itemData, "itemData");

                      const saleOrderData = await getOrderData(props.saleData);
                      console.log(saleOrderData, "saleOrderData");

                      const { auctionView, bidRedemptions } =
                        await getAuctionView(saleOrderData, itemData);

                      await sendPlaceBid(
                        connection,
                        wallet,
                        user.address,
                        auctionView as AuctionView,
                        new Map<string, TokenAccount>(),
                        auctionView.auctionDataExtended?.info
                          .instantSalePrice as any,
                        "finalized"
                      );

                      const obj = await getAuctionBidder(
                        connection,
                        auctionView.auction.pubkey
                      );
                      auctionView.auction = obj.auction;
                      auctionView.myBidderPot =
                        obj.bidderPotsByAuctionAndBidder;
                      auctionView.myBidderMetadata =
                        obj.bidderMetadataByAuctionAndBidder;

                      await sendRedeemBid(
                        connection,
                        wallet,
                        user.address,
                        auctionView,
                        new Map<string, TokenAccount>(),
                        {},
                        bidRedemptions,
                        []
                      );

                      await fetch("/api/update-nft", {
                        method: "PUT",
                        body: JSON.stringify({
                          id: props.id,
                          status: "AVAILABLE",
                          userId: user.id,
                          saleData: null,
                          saleOrderData: null,
                        }),
                        headers: {
                          "Content-Type": "application/json",
                        },
                      });
                      router.push(`/nfts/${user.id}`);

                      return;
                    }

                    const { ethereum } = window;

                    if (user.id && !user.solana && props.chainId != chainId) {
                      try {
                        await ethereum.request({
                          method: "wallet_switchEthereumChain",
                          params: [
                            {
                              chainId: `0x${Number(props.chainId).toString(
                                16
                              )}`,
                            },
                          ], // chainId must be in hexadecimal numbers
                        });
                        router.reload();
                        await new Promise((resolve) =>
                          setTimeout(resolve, 5000)
                        );
                      } catch (e: any) {
                        if (e.code === 4902) {
                          window.alert(
                            `Please add chain with id ${props.nft.chainId} to your wallet then try again`
                          );
                        }
                      }
                    }

                    const signer = library.getSigner();

                    const nftSwapSdk = new NftSwap(
                      library,
                      signer,
                      props.chainId,
                      {
                        zeroExExchangeProxyContractAddress:
                          zeroContractAddresses[Number(chainId)]
                            ? zeroContractAddresses[Number(chainId)]
                            : undefined,
                      }
                    );

                    const takerAsset: any = {
                      tokenAddress: props.signedOrder.erc20Token,
                      amount: props.signedOrder.erc20TokenAmount,
                      type: "ERC20",
                    };

                    // Check if we need to approve the NFT for swapping
                    const approvalStatusForUserB =
                      await nftSwapSdk.loadApprovalStatus(
                        takerAsset,
                        user.address
                      );
                    // If we do need to approve NFT for swapping, let's do that now
                    if (!approvalStatusForUserB.contractApproved) {
                      const approvalTx =
                        await nftSwapSdk.approveTokenOrNftByAsset(
                          takerAsset,
                          user.address
                        );
                      const approvalTxReceipt = await approvalTx.wait();
                      console.log(
                        `Approved ${takerAsset.tokenAddress} contract to swap with 0x. TxHash: ${approvalTxReceipt.transactionHash})`
                      );
                    }

                    const fillTx = await nftSwapSdk.fillSignedOrder(
                      props.signedOrder
                    );
                    const fillTxReceipt = await nftSwapSdk.awaitTransactionHash(
                      fillTx.hash
                    );

                    await fetch("/api/update-nft", {
                      method: "PUT",
                      body: JSON.stringify({
                        id: props.id,
                        status: "AVAILABLE",
                        fillTxReceipt,
                        userId: user.id,
                      }),
                      headers: {
                        "Content-Type": "application/json",
                      },
                    });

                    await fetch("/api/new-action", {
                      method: "POST",
                      body: JSON.stringify({
                        userId: user.id,
                        nftId: props.id,
                        name: "Buy",
                      }),
                      headers: {
                        "Content-Type": "application/json",
                      },
                    });

                    router.push(`/nfts/${user.id}`);
                  }}
                  loading={loading}
                >
                  Buy
                </Button>
                <br />
                <br />
              </>
            )}
          </>
        )}
        {status === "AUCTION" && (
          <>
            {props.erc1155 && (
              <>
                <b>Auction Amount: </b>
                <p>{props.auctionAmount}</p>
                <br />
              </>
            )}
            {props.bidOrders && props.bidOrders.length && (
              <>
                <b>Highest Offer</b>
                <p>
                  {props.solana
                    ? props.bidOrders[0].signedOrder.erc20TokenAmount
                    : fromWei(props.bidOrders[0].signedOrder.erc20TokenAmount) +
                      ` ${props.symbol}`}
                </p>
              </>
            )}
            {!(props.bidOrders && props.bidOrders.length) && (
              <>
                <b>Starting Price</b>
                <p>{fromWei(props.startingPrice) + ` ${props.symbol}`}</p>
              </>
            )}
            <b>Expiry Time: </b>
            <p>{timeString(endAuctionTime)}</p>
            {user && user.id !== props.userId && (
              <>
                <br />
                <br />
                <Button
                  type="primary"
                  style={{ margin: "auto" }}
                  onClick={() => router.push(`/nfts/bid/${props.id}`)}
                >
                  Bid
                </Button>
              </>
            )}
            <br />
            <br />
            <Button
              type="primary"
              style={{ margin: "auto" }}
              onClick={() => router.push(`/nfts/offers/${props.id}`)}
            >
              View Offers
            </Button>
            <br />
            <br />
          </>
        )}
        {status === "END AUCTION" && (
          <>
            <Button
              type="primary"
              style={{ margin: "auto" }}
              onClick={() => router.push(`/nfts/offers/${props.id}`)}
            >
              View Offers
            </Button>
            <br />
            <br />
          </>
        )}
        {status === "END AUCTION" && user.solana && highestBid && (
          <>
            <Button
              type="primary"
              style={{ margin: "auto" }}
              onClick={async () => {
                const itemData = await crawlItemData(
                  props.metadata,
                  props.user.address
                );
                const auctionOrderData = await getOrderData(props.auctionData);
                const { auctionView, bidRedemptions } = await getAuctionView(
                  auctionOrderData,
                  itemData
                );
                await getAuctionView(auctionOrderData, itemData);
                const obj = await getAuctionBidder(
                  connection,
                  auctionView.auction.pubkey
                );
                auctionView.auction = obj.auction;
                auctionView.myBidderPot = obj.bidderPotsByAuctionAndBidder;
                auctionView.myBidderMetadata =
                  obj.bidderMetadataByAuctionAndBidder;

                await sendRedeemBid(
                  connection,
                  wallet,
                  user.address,
                  auctionView,
                  new Map<string, TokenAccount>(),
                  {},
                  bidRedemptions,
                  []
                );

                await fetch("/api/update-nft", {
                  method: "PUT",
                  body: JSON.stringify({
                    id: props.id,
                    status: "AVAILABLE",
                    userId: user.id,
                  }),
                  headers: {
                    "Content-Type": "application/json",
                  },
                });
                router.push(`/nfts/${user.id}`);
              }}
            >
              Claim
            </Button>
            <br />
            <br />
          </>
        )}
        <Button
          type="primary"
          style={{ margin: "auto" }}
          onClick={() => {
            window.open(
              props.solana
                ? `https://explorer.solana.com/address/${props.metadata.mint}?cluster=devnet`
                : `${CHAIN_DATA[props.chainId]?.blockExplorerUrl}/token/${
                    props.erc1155
                      ? CHAIN_DATA[props.chainId]?.erc1155
                      : CHAIN_DATA[props.chainId]?.erc721
                  }?a=${props.tokenId}`,
              "_blank"
            );
          }}
        >
          View NFT
        </Button>
      </Card>
      <br />
    </>
  );
}

export default NftItem;
