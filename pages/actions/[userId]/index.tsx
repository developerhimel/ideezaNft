import ActionList from "../../../components/actions/ActionList";
import { MongoClient } from "mongodb";
import { NextPage } from "next";

const MyActions: NextPage = (props: any) => {
  return <ActionList actions={props.actions} />;
};

export async function getServerSideProps(ctx: any) {
  // fetch data from an API
  const client = await MongoClient.connect(process.env.MONGODB_URI as string);

  const db = client.db();

  const actionsCollection = db.collection("actions");

  const actions = await actionsCollection.aggregate([
    {
      '$match': {
        'userId': ctx.params.userId
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

  return {
    props: {
      actions: actions.map((action) => ({
        ...action,
        id: action._id.toString(),
        _id: null,
        nft: {
          ...action.nft,
          id: action.nft._id.toString(),
          _id: null,
        }
      })),
    },
  };
}

export default MyActions;
