import { Col, Row } from "antd";
import MyNftItem from "./MyNftItem";

function MyNftList(props: any) {
  console.log(props);
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
        <Col
          className="gutter-row"
          span={6}
          xs={24}
          sm={12}
          xl={6}
          key={nft.id}
        >
          <MyNftItem
            key={nft.id}
            id={nft.id}
            solana={nft.solana}
            erc1155={nft.erc1155}
            amount={nft.amount}
            left={nft.left}
            metadata={nft.metadata}
            imageUrl={nft.imageUrl}
            tokenId={nft.tokenId}
            name={nft.name}
            address={nft.address}
            user={nft.user}
            endAuctionTime={nft.endAuctionTime}
            saleData={nft.saleData}
            status={nft.status}
            chainId={nft.chainId}
            signedOrder={nft.signedOrder}
            auctionData={nft.auctionData}
          />
        </Col>
      ))}
    </Row>
  );
}

export default MyNftList;
