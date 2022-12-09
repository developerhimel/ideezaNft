import { MongoClient } from "mongodb";
import { NextPage } from "next";
import MyNftList from "../../../components/nfts/MyNftList";

const MyNfts: NextPage = (props: any) => {
  return <MyNftList nfts={props.nfts} />;
};

export async function getServerSideProps(ctx: any) {
  // fetch data from an API
  const client = await MongoClient.connect(process.env.MONGODB_URI as string);

  const db = client.db();

  const nftsCollection = db.collection("nfts");

  const nfts = await nftsCollection
    .aggregate([
      { $match: { userId: ctx.params.userId } },
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

export default MyNfts;
