import type { NextApiRequest } from "next";
import { MongoClient } from "mongodb";

export default async function handler(req: NextApiRequest, res: any) {
  const client = await MongoClient.connect(process.env.MONGODB_URI as string);

  const db = client.db();

  const nftsCollection = db.collection("nfts");
  const filter = {} as any;
  if (req.query.userId) {
    filter.userId = req.query.userId;
  }
  if (req.query.collectionId) {
    filter.collectionId = req.query.collectionId;
  }
  if (req.query.nftId) {
    filter.nftId = req.query.nftId;
  }

  const nfts = await nftsCollection
    .find(filter)
    .toArray();
  
  res.status(200).json(
    nfts.map((nft) => ({
      ...nft,
      id: nft._id.toString(),
      _id: null,
    }))
  );
}
