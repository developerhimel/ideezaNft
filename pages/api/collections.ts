import type { NextApiRequest } from "next";
import { MongoClient } from "mongodb";

export default async function handler(req: NextApiRequest, res: any) {
  const client = await MongoClient.connect(process.env.MONGODB_URI as string);

  const db = client.db();

  const collectionsCollection = db.collection("collections");

  const filter = {} as any;
  if (req.query.userId) {
    filter.userId = req.query.userId;
  }
  if (req.query.chainId) {
    filter.chainId = req.query.chainId;
  }

  const collections = await collectionsCollection.find(filter).toArray();

  res.status(200).json(
    collections.map((collection) => ({
      ...collection,
      id: collection._id.toString(),
      _id: null,
    }))
  );
}
