import { MongoClient } from "mongodb";

async function handler(req: any, res: any) {
    if (req.method === "POST") {
        const data = req.body;

        const client = await MongoClient.connect(process.env.MONGODB_URI as string);
        const db = client.db();

        const nftsCollection = db.collection("nfts");

        const metadata = data.metadata;
        const imageUrl = data.imageUrl;
        const assetURI = data.assetURI;
        const solana = data.solana;
        const creator = data.creator;
        const metadataURI = data.metadataURI;
        const collectionId = data.collectionId;
        const chainId = data.chainId;
        const status = data.status;
        const tokenId = data.tokenId;
        const userId = data.userId;
        const name = data.name;
        const royaltyFee = data.royaltyFee;
        const description = data.description;
        const erc1155 = data.erc1155;
        const amount = data.amount;
        const left = data.left;
        const baseNft = data.baseNft;

        await nftsCollection.insertOne({
            metadata,
            imageUrl,
            assetURI,
            solana,
            creator,
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
            left,
            baseNft
        })

        client.close();

        res.status(201).json({ message: "Collection inserted!" });
    }
}

export default handler;
