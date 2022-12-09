import OfferItem from "./OfferItem";
import useConnectionInfo from "../../hooks/connectionInfo";

function OfferList(props: any) {
  const { user } = useConnectionInfo();
  if (props.nft.bidOrders && props.nft.bidOrders.length) {
    props.nft.bidOrders[0].highestBidder = true;
  }
  return (
    <ul>
      {(props.nft.bidOrders || []).map((offer: any, index: number) => (
        <OfferItem
          key={index}
          id={props.nft.id}
          solana={props.nft.solana}
          chainId={props.nft.chainId}
          offer={offer.signedOrder}
          endAuctionTime={props.nft.endAuctionTime}
          highestBid={offer.highestBidder}
          userId={offer.userId}
          makerUserId={props.nft.userId}
          erc1155={props.nft.erc1155}
          userAddr={user.address}
          nft={props.nft}
        />
      ))}
    </ul>
  );
}

export default OfferList;
