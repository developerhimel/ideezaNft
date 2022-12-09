import { Card, Image } from "antd";
import Link from "next/link";
import { CHAIN_DATA } from "../../constants/chain";
const { Meta } = Card;

function CollectionItem(props: any) {
  return (
    <Link href={`/collections/nfts/${props.id}`}>
      <Card
        hoverable
        style={{
          width: 240,
        }}
        cover={<Image alt="example" src={props.imageUrl} />}
      >
        <Meta title={props.name} description={CHAIN_DATA[props.chainId]?.name} />
      </Card>
    </Link>
  );
}

export default CollectionItem;
