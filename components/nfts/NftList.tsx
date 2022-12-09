import { Col, Row } from "antd";
import NftItem from "./NftItem";

function NftList(props: any) {
  
  console.log(props, 'spoicv');
  
  
  return (
    <Row
      gutter={{
        xs: 8,
        sm: 16,
        md: 24,
        lg: 32,
      }}
    >
      {props.nfts.map((nft: any) => (
        <Col className="gutter-row" span={6} xs={24} sm={12} xl={6} key={nft.id}>
          <NftItem
            key={nft.id}
            solana={nft.solana}
            metadata={nft.metadata}
            erc1155={nft.erc1155}
            amount={nft.amount}
            left={nft.left}
            saleAmount={nft.saleAmount}
            auctionAmount={nft.auctionAmount}
            id={nft.id}
            imageUrl={nft.imageUrl}
            tokenId={nft.tokenId}
            name={nft.name}
            user={nft.user}
            address={nft.address}
            userId={nft.userId}
            price={nft.price}
            auctionData={nft.auctionData}
            saleOrderData={nft.saleOrderData}
            saleData={nft.saleData}
            endAuctionTime={nft.endAuctionTime}
            status={nft.status}
            symbol={nft.symbol}
            bidOrders={nft.bidOrders}
            startingPrice={nft.startingPrice}
            chainId={nft.chainId}
            signedOrder={nft.signedOrder}
            nft={nft}
          />
        </Col>
      ))}
    </Row>
  );
}

export default NftList;
