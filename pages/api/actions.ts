import type { NextApiRequest } from "next";
import { MongoClient } from "mongodb";

export default async function handler(req: NextApiRequest, res: any) {
  // fetch data from an API
  const client = await MongoClient.connect(process.env.MONGODB_URI as string);

  const db = client.db();

  const actionsCollection = db.collection("actions");

  const actions = await actionsCollection.aggregate([
    {
      '$match': {
        'userId': req.query.userId
      }
    },
    {
      '$project': {
        'userId': 1, 
        'name': 1, 
        'nftId': {
          '$toObjectId': '$nftId'
        }
      }
    }, {
      '$lookup': {
        'from': 'nfts', 
        'localField': 'nftId', 
        'foreignField': '_id', 
        'as': 'nft'
      }
    }, {
      '$project': {
        'name': 1, 
        'nftId': {
          '$toString': '$nftId'
        }, 
        'userId': 1, 
        'nft': {
          '$arrayElemAt': [
            '$nft', 0
          ]
        }
      }
    }
  ]).toArray()

  client.close();

  res.status(200).json(
    actions.map((action) => ({
      ...action,
      id: action._id.toString(),
      _id: null,
      nft: {
        ...action.nft,
        id: action.nft._id.toString(),
        _id: null,
      }
    })),
  );
}
