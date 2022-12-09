import { MongoClient } from "mongodb";

async function handler(req: any, res: any) {
  if (req.method === "POST") {
    const data = req.body;

    const client = await MongoClient.connect(process.env.MONGODB_URI as string);
    const db = client.db();

    const actionsCollection = db.collection("actions");

    const result = await actionsCollection.insertOne(data);

    console.log(result);

    client.close();

    res.status(201).json({ message: "Collection inserted!" });
  }
}

export default handler;
