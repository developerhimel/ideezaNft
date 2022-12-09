import { Card, Image } from "antd";
import Link from "next/link";
const { Meta } = Card;

function ActionItem(props: any) {
  console.log(props);
  
  return (
    <Link href={`/collections/nfts/${props.id}`}>
      <Card
        hoverable
        style={{
          width: 240,
        }}
        cover={<Image alt="example" src={props.nft.imageUrl} />}
      >
        <Meta title={props.name} description={`${props.nft.name} - ${props.nft.id}`} />
      </Card>
    </Link>
  );
}

export default ActionItem;
