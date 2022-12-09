import CollectionList from "../../../components/collections/CollectionList";
import { MongoClient } from "mongodb";
import { NextPage } from "next";

const MyCollections: NextPage = (props: any) => {
  return <CollectionList collections={props.collections} />;
};

export async function getServerSideProps(ctx: any) {
  // fetch data from an API
  const client = await MongoClient.connect(process.env.MONGODB_URI as string);

  const db = client.db();

  const collectionsCollection = db.collection("collections");

  const collections = await collectionsCollection.find({ userId: ctx.params.userId }).toArray();

  client.close();

  return {
    props: {
      collections: collections.map((collection) => ({
        ...collection,
        id: collection._id.toString(),
        _id: null,
      })),
    },
  };
}

export default MyCollections;
