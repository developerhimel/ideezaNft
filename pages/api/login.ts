// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { MongoClient } from "mongodb";
import jwt from "jsonwebtoken";
import { sign } from "tweetnacl";
import bs58 from "bs58";
import axios from "axios";
import { getStoreID } from "solana-helper";
// eslint-disable-next-line
const Web3 = require("web3");

type Data = {
  accessToken: string;
  refreshToken: string;
  user: any;
};

async function getProgramAccount(address: string) {
  const masterReq = {
    jsonrpc: "2.0",
    id: 1,
    method: "getProgramAccounts",
    params: [
      "p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98",
      {
        encoding: "base64",
        dataSlice: {
          offset: 0,
          length: 0,
        },
      },
    ],
  };
  const { data: masterRes } = await axios.post(
    "https://api.devnet.solana.com",
    masterReq
  );

  return masterRes.result.filter((x: any) => x.pubkey == address).length > 0;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const client = await MongoClient.connect(process.env.MONGODB_URI as string);

  const db = client.db();

  const usersCollection = db.collection("users");

  const web3 = new Web3();

  if (req.body.solana) {
    if (
      !sign.detached.verify(
        new TextEncoder().encode(req.body.message),
        bs58.decode(req.body.password),
        new Uint8Array(JSON.parse(req.body.publicKey))
      )
    ) {
      throw new Error("WRONG_SIGNATURE");
    }
  } else {
    try {
      const recover = await web3.eth.accounts.recover(
        req.body.message,
        req.body.password
      );

      const recoverConvert = Web3.utils.toChecksumAddress(recover);
      const addressConvert = Web3.utils.toChecksumAddress(req.body.username);

      if (addressConvert !== recoverConvert) {
        throw new Error("WRONG_SIGNATURE");
      }
    } catch (err) {
      throw new Error("WRONG_SIGNATURE");
    }
  }

  let user = await usersCollection.findOne({
    address: { $regex: new RegExp(req.body.username, "i") },
  });

  if (!user) {
    await usersCollection.insertOne({
      address: req.body.username,
      solana: req.body.solana,
    });
    user = await usersCollection.findOne({ address: req.body.username });
  }

  if (user) {
    if (user.solana && !user.store) {
      const storeAddress = await getStoreID(user.address);
      console.log(storeAddress, 'Line #96 login.ts');
      
      if (storeAddress) {
        user.store = await getProgramAccount(storeAddress);
        console.log(user.store, 'Line #98 login.ts');
        
        await usersCollection.updateOne(
          { _id: user._id },
          {
            $set: { store: user.store },
          }
        );
      }
    }
    const payload = {
      sub: user.id,
      address: user.address,
    };
    const accessTokenConfig = {
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION_TIME,
    };

    const refreshTokenPayload = { sub: user.id };
    const refreshTokenConfig = {
      expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRATION_TIME,
    };

    const response: Data = {
      accessToken: jwt.sign(
        payload,
        process.env.JWT_REFRESH_TOKEN_SECRET as string,
        accessTokenConfig
      ),
      refreshToken: jwt.sign(
        refreshTokenPayload,
        process.env.JWT_ACCESS_TOKEN_SECRET as string,
        refreshTokenConfig
      ),
      user,
    };

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: { refreshToken: response.refreshToken },
      }
    );

    res.status(200).json(response);
  }
}
