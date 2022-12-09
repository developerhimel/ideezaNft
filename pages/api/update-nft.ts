import { MongoClient, ObjectId } from "mongodb";

async function handler(req: any, res: any) {
  if (req.method === "PUT") {
    const data = req.body;

    const client = await MongoClient.connect(process.env.MONGODB_URI as string);
    const db = client.db();

    const nftsCollection = db.collection("nfts");
    const actionsCollection = db.collection("actions");

    if (data.actionName) {
      await actionsCollection.insertOne({
        name: data.actionName,
        userId: data.actionUserId,
        nftId: data.id,
      });
      delete data.actionName;
      delete data.actionUserId;
    }

    const result = await nftsCollection.updateOne(
      { _id: new ObjectId(data.id) },
      { $set: data }
    );

    console.log(result);

    client.close();

    res.status(201).json({ message: "Collection inserted!" });
  }
}

export default handler;
