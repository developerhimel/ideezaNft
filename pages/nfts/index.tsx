import type { NextPage } from "next";
import { MongoClient } from "mongodb";
import NftList from "../../components/nfts/NftList";

const Nfts: NextPage = (props: any) => {
  return <NftList nfts={props.nfts} />;
};

export async function getServerSideProps() {
  // fetch data from an API
  const client = await MongoClient.connect(process.env.MONGODB_URI as string);

  const db = client.db();

  const nftsCollection = db.collection("nfts");

  const nfts = await nftsCollection
    .aggregate([
      { $addFields: { userIdd: { $toObjectId: "$userId" } } },
      {
        $lookup: {
          from: "users",
          localField: "userIdd",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unset: "userIdd" },
    ])
    .toArray();

  client.close();

  return {
    props: {
      nfts: nfts.map((nft) => ({
        ...nft,
        user: {
          ...nft.user[0],
          id: nft.user[0]?._id.toString(),
          _id: null,
        },
        id: nft._id.toString(),
        _id: null,
      })),
    },
  };
}

export default Nfts;
