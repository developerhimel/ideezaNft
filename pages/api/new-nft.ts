import { MongoClient } from "mongodb";

async function handler(req: any, res: any) {
  if (req.method === "POST") {
    const data = req.body;

    const client = await MongoClient.connect(process.env.MONGODB_URI as string);
    const db = client.db();

    const nftsCollection = db.collection("nfts");

    for (let idx = 0; idx < data.assets.length; ++idx) {
      const metadata = data.metadatas[idx];
      const imageUrl = data.imageUrls[idx];
      const assetURI = data.assetURIs[idx];
      const metadataURI = data.metadataURIs[idx];
      const { name, description, royaltyFee } = data.assets[idx];
      const tokenId = data.tokenIds[idx];
      const collectionId = data.collectionId;
      const chainId = data.chainId;
      const status = data.status;
      const userId = data.userId;
      const erc1155 = data.erc1155;
      const amount = data.amounts[idx];
      const left = data.amounts[idx];

      await nftsCollection.insertOne({
        metadata,
        imageUrl,
        assetURI,
        solana: data.solana,
        creator: data.creator,
        metadataURI,
        collectionId,
        chainId,
        status,
        tokenId,
        userId,
        name,
        royaltyFee,
        description,
        erc1155,
        amount,
        left
      })
    }

    client.close();

    res.status(201).json({ message: "Collection inserted!" });
  }
}

export default handler;
