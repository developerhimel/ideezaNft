import { NftSwapV4 as NftSwap } from "@traderxyz/nft-swap-sdk";
import { Button } from "antd";
// import { ObjectId } from "mongodb";
import { useState } from "react";
import web3 from "web3";
import { useRouter } from "next/router";
import { zeroContractAddresses } from "../../contracts/zeroExContracts";
import useConnectionInfo from "../../hooks/connectionInfo";
import { Contract } from "@ethersproject/contracts";
import { CHAIN_DATA } from "../../constants/chain";
import erc1155ABI from "../../contracts/abi/erc1155ABI.json";
import erc1155trader from "../../contracts/abi/erc1155trader.json";

const { fromWei } = web3.utils;
const { toWei } = web3.utils;

function OfferItem(props: any) {
  const { user, library, chainId } = useConnectionInfo();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const addr = props.userAddr as String;
  const address = typeof addr === "string" ? addr.toLowerCase() : "";
  return (
    <>
      <p>{`Bidder: ${
        address === props.offer.maker ? "You" : props.offer.maker
      }`}</p>
      <p>{`Amount: ${
        props.solana
          ? props.offer.erc20TokenAmount
          : fromWei(props.offer.erc20TokenAmount)
      }`}</p>

      {address === props.offer.maker &&
        props.highestBid &&
        props.erc1155 &&
        new Date(props.endAuctionTime).getTime() < Date.now() && (
          <Button
            type="primary"
            href="Confirm"
            loading={loading}
            onClick={async (e) => {
              e.preventDefault();
              setLoading(true);
              const cost = props.offer.erc20TokenAmount;
              const signer = library.getSigner();
              const contract = new Contract(
                CHAIN_DATA[Number(chainId)].trader as string,
                erc1155trader,
                signer
              );
              try {
                await contract.onwin(
                  CHAIN_DATA[Number(chainId)].erc1155 as string,
                  props.nft.tokenId,
                  props.nft.auctionAmount,
                  {
                    value: cost,
                  }
                );
              } catch (error) {
                console.log(error);
                setLoading(false);
                return;
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
                  amount: props.nft.auctionAmount,
                  erc1155: true,
                  left: props.nft.auctionAmount,
                  baseNft: props.nft.id,
                }),
                headers: {
                  "Content-Type": "application/json",
                },
              }).then(async () => {
                const left = props.nft.left - props.nft.auctionAmount;
                await fetch("/api/update-nft", {
                  method: "PUT",
                  body: JSON.stringify({
                    id: props.nft.id,
                    status: "AVAILABLE",
                    left: left,
                    bidOrders: null,
                  }),
                  headers: {
                    "Content-Type": "application/json",
                  },
                }).then(async () => {
                  await fetch("/api/new-action", {
                    method: "POST",
                    body: JSON.stringify({
                      userId: user.id,
                      nftId: props.id,
                      name: "Claimed offer",
                    }),
                    headers: {
                      "Content-Type": "application/json",
                    },
                  });
                  setLoading(false);
                  router.push(`/nfts/${user.id}`);
                });
              });
            }}
          >
            Claim
          </Button>
        )}

      {address === props.offer.maker &&
        props.highestBid &&
        !props.erc1155 &&
        new Date(props.endAuctionTime).getTime() < Date.now() && (
          <Button
            href="Confirm"
            loading={loading}
            onClick={async (e) => {
              e.preventDefault();
              setLoading(true);

              const { ethereum } = window;

              if (user.id && !user.solana && props.chainId != chainId) {
                try {
                  await ethereum.request({
                    method: "wallet_switchEthereumChain",
                    params: [
                      {
                        chainId: `0x${Number(props.chainId).toString(16)}`,
                      },
                    ], // chainId must be in hexadecimal numbers
                  });
                  router.reload();
                  await new Promise((resolve) => setTimeout(resolve, 5000));
                } catch (e: any) {
                  if (e.code === 4902) {
                    window.alert(
                      `Please add chain with id ${props.nft.chainId} to your wallet then try again`
                    );
                  }
                }
              }

              const signer = library.getSigner();

              let takerAsset: any = {
                tokenAddress: props.offer.erc721Token,
                tokenId: props.offer.erc721TokenId,
                type: "ERC721",
              };

              if (props.offer.erc1155TokenId) {
                takerAsset = {
                  tokenAddress: props.offer.erc1155Token,
                  tokenId: props.offer.erc1155TokenId,
                  type: "ERC1155",
                  amount: props.offer.erc1155Amount,
                };
              }

              const nftSwapSdk = new NftSwap(library, signer, chainId, {
                zeroExExchangeProxyContractAddress: zeroContractAddresses[
                  Number(chainId)
                ]
                  ? zeroContractAddresses[Number(chainId)]
                  : undefined,
              });

              // Check if we need to approve the NFT for swapping
              const approvalStatusForUserB =
                await nftSwapSdk.loadApprovalStatus(
                  takerAsset,
                  props.offer.taker
                );

              // If we do need to approve NFT for swapping, let's do that now
              if (!approvalStatusForUserB.contractApproved) {
                const approvalTx = await nftSwapSdk.approveTokenOrNftByAsset(
                  takerAsset,
                  props.offer.taker
                );
                const approvalTxReceipt = await approvalTx.wait();
                console.log(
                  `Approved ${takerAsset.tokenAddress} contract to swap with 0x. TxHash: ${approvalTxReceipt.transactionHash})`
                );
              }

              const fillTx = await nftSwapSdk.fillSignedOrder(props.offer);

              const fillTxReceipt = await nftSwapSdk.awaitTransactionHash(
                fillTx.hash
              );
              console.log(props.userId, "props.userId");

              await fetch("/api/update-nft", {
                method: "PUT",
                body: JSON.stringify({
                  id: props.id,
                  status: "AVAILABLE",
                  fillTxReceipt,
                  userId: props.userId,
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
                  name: "Confirm offer",
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
        )}
      <hr />
    </>
  );
}

export default OfferItem;
