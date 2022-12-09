import { MongoClient } from "mongodb";
import { NextPage } from "next";
import NftList from "../../../../components/nfts/NftList";

const CollectionNfts: NextPage = (props: any) => {
  return <NftList nfts={props.nfts} />;
};

export async function getServerSideProps(ctx: any) {
  console.log(ctx);
  
  // fetch data from an API
  const client = await MongoClient.connect(process.env.MONGODB_URI as string);

  const db = client.db();

  const nftsCollection = db.collection("nfts");

  const nfts = await nftsCollection
    .find({ collectionId: ctx.params.collectionId })
    .toArray();

  client.close();

  return {
    props: {
      nfts: nfts.map((nft) => ({
        ...nft,
        id: nft._id.toString(),
        _id: null,
      })),
    },
  };
}

export default CollectionNfts;
