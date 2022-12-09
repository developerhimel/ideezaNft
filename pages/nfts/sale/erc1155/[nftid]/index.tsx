import React, { useState } from "react";
import { MongoClient, ObjectId } from "mongodb";
import { CHAIN_DATA } from "../../../../../constants/chain";
import { Button, Form, Input, InputNumber, Select, Upload } from "antd";
import { Contract } from "@ethersproject/contracts";
import { useRouter } from "next/router";
import useConnectionInfo from "../../../../../hooks/connectionInfo";
import erc1155trader from "../../../../../contracts/abi/erc1155trader.json";
import erc1155ABI from "../../../../../contracts/abi/erc1155ABI.json";
import erc20ABI from "../../../../../contracts/abi/erc20ABI.json";
import web3 from "web3";

const { toWei } = web3.utils;

const layout = {
  labelCol: {
    span: 8,
  },
  wrapperCol: {
    span: 16,
  },
};
/* eslint-disable no-template-curly-in-string */

const validateMessages = {
  required: "${label} is required!",
  types: {
    email: "${label} is not a valid email!",
    number: "${label} is not a valid number!",
  },
  number: {
    range: "${label} must be between ${min} and ${max}",
  },
};

const { Option } = Select;

function saleERC1155(props: any) {
  const router = useRouter();
  const chainId = props.nft.chainId;
  const { user, library } = useConnectionInfo();
  const [loading, setLoading] = useState(false);

  console.log(props);

  async function onFinish(values: any) {
    setLoading(true);
    const signer = library.getSigner();
    const amount = toWei(values.amount);
    values.erc20TokenAddress = values.erc20TokenAddress.toLowerCase();
    let symbol = CHAIN_DATA[Number(chainId)].symbol;

    if (
      values.erc20TokenAddress != "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
    ) {
      const contract = new Contract(values.erc20TokenAddress, erc20ABI, signer);
      symbol = await contract.symbol();
    }

    const contract1 = new Contract(
      CHAIN_DATA[Number(chainId)].erc1155 as string,
      erc1155ABI,
      signer
    );
    const contract2 = new Contract(
      CHAIN_DATA[Number(chainId)].trader as string,
      erc1155trader,
      signer
    );

    const left = (
      await contract1.balanceOf(user.address, props.nft.tokenId.toString())
    ).toString();

    const isApproved = await contract1.isApprovedForAll(
      user.address,
      CHAIN_DATA[Number(chainId)].trader
    );

    if (!isApproved) {
      router.push(`/nfts/sale/erc1155/approval`);
    } else {
      const listed = await contract2.addListing(
        CHAIN_DATA[Number(chainId)].erc1155,
        Number(amount),
        props.nft.tokenId
      );
      if (listed) {
        const updateNft = await fetch("/api/update-nft", {
          method: "PUT",
          body: JSON.stringify({
            id: props.nft.id,
            status: "LIST",
            symbol: symbol,
            price: values.amount,
            action: "List for sale",
            actionUserId: user.id,
            left: Number(left),
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (updateNft) {
          setLoading(false);
          router.push(`/nfts/${user.id}`);
        }
      }
    }
  }

  const tokenList = chainId
    ? !props.solana
      ? [
          {
            symbol: CHAIN_DATA[chainId].symbol,
            name: "Native Coin",
            address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
          },
          ...CHAIN_DATA[chainId].erc20,
        ]
      : CHAIN_DATA[chainId].erc20
    : [];

  return (
    <>
      {chainId && (
        <Form
          {...layout}
          name="nest-messages"
          onFinish={onFinish}
          validateMessages={validateMessages}
        >
          <Form.Item
            name="amount"
            label="Price"
            rules={[
              {
                required: true,
              },
            ]}
          >
            <div>
              <InputNumber />
              <span style={{ marginLeft: 10 }}>
                {CHAIN_DATA[props.nft.chainId]?.symbol}
              </span>
            </div>
          </Form.Item>
          <Form.Item
            name="erc20TokenAddress"
            label="Token Address"
            initialValue={tokenList[0].address}
            hasFeedback
          >
            <Select placeholder="Select payment token address">
              {tokenList.map((token: any) => (
                <Option key={token.address} value={token.address}>
                  {`${token.name} - ${token.symbol}`}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item wrapperCol={{ ...layout.wrapperCol, offset: 8 }}>
            <Button type="primary" htmlType="submit" loading={loading}>
              Submit
            </Button>
          </Form.Item>
        </Form>
      )}
    </>
  );
}

export async function getServerSideProps(ctx: any) {
  // fetch data from an API
  const client = await MongoClient.connect(process.env.MONGODB_URI as string);

  const db = client.db();

  const nftsCollection = db.collection("nfts");
  const usersCollection = db.collection("users");

  const nft: any = await nftsCollection.findOne({
    _id: new ObjectId(ctx.params.nftid),
  });
  const user: any = await usersCollection.findOne({
    _id: new ObjectId(nft.userId),
  });

  client.close();

  return {
    props: {
      nft: {
        ...nft,
        id: nft._id.toString(),
        _id: null,
      },
      user: {
        ...user,
        id: user._id.toString(),
        _id: null,
      },
    },
  };
}

export default saleERC1155;
