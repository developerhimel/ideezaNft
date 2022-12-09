import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { create as ipfsHttpClient } from "ipfs-http-client";
import { v4 as uuidv4 } from "uuid";
import NewNftForm from "../../../components/nfts/NewNftForm";
import erc721ABI from "../../../contracts/abi/erc721ABI.json";
import erc1155ABI from "../../../contracts/abi/erc1155ABI.json";
import { Contract } from "@ethersproject/contracts";
import BigNumber from "bignumber.js";
import {
  ensureIpfsUriPrefix,
  makeNFTMetadata,
  stripIpfsUriPrefix,
} from "../../../helpers/contract";
import path from "path";
import { MongoClient } from "mongodb";
import web3 from "web3";
import useConnectionInfo from "../../../hooks/connectionInfo";
import { actions, Wallet } from "@metaplex/js";
import { CHAIN_DATA } from "../../../constants/chain";
import {
  CreateMasterEdition,
  CreateMetadata,
  Creator,
  MasterEdition,
  Metadata,
  MetadataDataData,
} from "@metaplex-foundation/mpl-token-metadata";
import BN from "bn.js";
import { parse as uuidParse } from "uuid";
// import {
//   Metaplex,
//   keypairIdentity,
//   bundlrStorage,
// } from "@metaplex-foundation/js";
// import { createMint } from "@solana/spl-token";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

BigNumber.config({ EXPONENTIAL_AT: 100000 });

const { toWei } = web3.utils;

const auth =
  "Basic " +
  Buffer.from(
    process.env.NEXT_PUBLIC_INFURA_PROJECT_ID +
      ":" +
      process.env.NEXT_PUBLIC_INFURA_PROJECT_SECRET
  ).toString("base64");

const client = ipfsHttpClient({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
  apiPath: "/api/v0",
  headers: {
    authorization: auth,
  },
});

function buf2hex(buffer: any) {
  // buffer is an ArrayBuffer
  return [...new Uint8Array(buffer)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

function NewNftPage(props: any) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState(props.collections);
  const { user, library, chainId, connection, wallet } = useConnectionInfo();
  
  // const payer = Keypair.caller();
  // // console.log(Signer);
  // console.log(payer);

  useEffect(() => {
    setCollections(
      props.collections.filter((col: any) => col.chainId == chainId)
    );
  }, [chainId, props.collections]);

  async function addNftHandler(enteredNftData: any) {
    setLoading(true);
    const numNft = enteredNftData.images.length;
    const assetCids = [] as any[];

    const ipfsAddAssets = enteredNftData.images.map((image: any) => {
      const filePath = image.originFileObj.name;
      const content = image.originFileObj;
      const basename = path.basename(filePath);
      const ipfsPath = "/nft/" + basename;

      return {
        path: ipfsPath,
        content: content,
      };
    });

    // for await (const file of client.addAll(ipfsAddAssets)) {
    for (const ipfsAddAsset of ipfsAddAssets) {
      const file = await client.add(ipfsAddAsset);

      assetCids.push(file.cid);
    }

    const processedDatas = {
      metadataURI: [] as string[],
      assetURI: [] as string[],
      imageUrl: [] as string[],
    };

    const ipfsAddMetadatas = await Promise.all(
      Array.from(Array(numNft).keys()).map(async (idx) => {
        const filePath = enteredNftData.images[idx].originFileObj.name;
        const basename = path.basename(filePath);
        const assetCid = assetCids[idx];
        const assetURI = ensureIpfsUriPrefix(assetCid) + "/" + basename;

        const metadata = await makeNFTMetadata(
          assetURI,
          user.address,
          enteredNftData.assets[idx]
        );

        processedDatas.assetURI.push(assetURI);
        processedDatas.imageUrl.push(
          `https://ipfs.io/ipfs/${stripIpfsUriPrefix(assetURI)}`
        );

        // add the metadata to IPFS
        return {
          path: `/nft/metadata.json`,
          content: JSON.stringify(metadata),
        };
      })
    );

    let tokenIds = [] as any;
    let metadatas = [] as any;

    // for await (const file of client.addAll(ipfsAddMetadatas)) {
    for (const ipfsAddMetadata of ipfsAddMetadatas) {
      const file = await client.add(ipfsAddMetadata);
      const metadataCid = file.cid;
      const metadataURI = ensureIpfsUriPrefix(metadataCid) + "/metadata.json";

      processedDatas.metadataURI.push(metadataURI);
    }

    // console.log(enteredNftData.assets);
    // setLoading(false);
    // return;

    if (!user.solana) {
      for (let i = 0; i < ipfsAddAssets.length; ++i) {
        tokenIds.push(
          new BigNumber(
            (
              user.address + buf2hex(uuidParse(uuidv4())).substring(0, 24)
            ).toLowerCase()
          ).toString()
        );
      }

      if (enteredNftData.multipleTokens) {
        const signer = library.getSigner();
        const contract = new Contract(
          CHAIN_DATA[Number(chainId)].erc1155 as string,
          erc1155ABI,
          signer
        );
        const totaltoken = (await contract.totalToken()).toNumber();
        const tokenId = Number(totaltoken) + 1;
        tokenIds = [];

        for (let i = 0; i < ipfsAddMetadatas.length; ++i) {
          tokenIds.push(tokenId + i);
        }

        const mint = await contract.mintBatch(
          tokenIds,
          enteredNftData.assets.map((asset: any) => asset.amount)
        );

        const tx = mint.wait();

        console.log(tx);
      } else if (!enteredNftData.lazyMint) {
        const signer = library.getSigner();
        const contract = new Contract(
          CHAIN_DATA[Number(chainId)].erc721 as string,
          erc721ABI,
          signer
        );
        const totalSupply = (await contract.totalSupply()).toNumber();

        await contract.mint(user.address, numNft, processedDatas.metadataURI, {
          value: 0,
        });
        const tokenId = Number(totalSupply) + 1;
        tokenIds = [];

        for (let i = 0; i < ipfsAddMetadatas.length; ++i) {
          tokenIds.push(tokenId + i);
        }
      }
    } else if (connection && wallet && wallet.publicKey) {
      const { publicKey } = wallet;
      const metadataUris = processedDatas.metadataURI;

      // const mint = await createMint(
      //   connection,
      //   payer,
      //   mintAuthority.publicKey,
      //   freezeAuthority.publicKey,
      //   9 // We are using 9 to match the CLI decimal default exactly
      // );

      // console.log(mint.toBase58());

      // setLoading(false);
      // return;

      const mintDatas = await Promise.all(
        Array.from(Array(ipfsAddMetadatas.length).keys()).map(async () => {
          const {
            mint,
            createMintTx,
            createAssociatedTokenAccountTx,
            mintToTx,
          } = await actions.prepareTokenAccountAndMintTxs(
            connection,
            publicKey
          );
          const metadataPDA = await Metadata.getPDA(mint.publicKey);
          const editionPDA = await MasterEdition.getPDA(mint.publicKey);
          return {
            mint,
            createMintTx,
            createAssociatedTokenAccountTx,
            mintToTx,
            metadataPDA,
            editionPDA,
          };
        })
      );

      const txs = ipfsAddMetadatas.map((data, index) => {
        const uri = `https://ipfs.io/ipfs/${stripIpfsUriPrefix(
          processedDatas.metadataURI[index]
        )}`;
        const {
          mint,
          createMintTx,
          createAssociatedTokenAccountTx,
          mintToTx,
          metadataPDA,
          editionPDA,
        } = mintDatas[index];
        const {
          name,
          symbol,
          seller_fee_basis_points,
          properties: { creators },
        } = JSON.parse(data.content);

        const creatorsData = (creators as Creator[]).reduce<Creator[]>(
          (memo, { address, share }) => {
            const verified = address === publicKey.toString();

            const creator = new Creator({
              address,
              share,
              verified,
            });

            memo = [...memo, creator];

            return memo;
          },
          []
        );

        const metadataData = new MetadataDataData({
          name,
          symbol,
          uri,
          sellerFeeBasisPoints: seller_fee_basis_points,
          creators: creatorsData,
        });

        const createMetadataTx = new CreateMetadata(
          {
            feePayer: publicKey,
          },
          {
            metadata: metadataPDA,
            metadataData,
            updateAuthority: publicKey,
            mint: mint.publicKey,
            mintAuthority: publicKey,
          }
        );

        const masterEditionTx: any = new CreateMasterEdition(
          { feePayer: publicKey },
          {
            edition: editionPDA,
            metadata: metadataPDA,
            updateAuthority: publicKey,
            mint: mint.publicKey,
            mintAuthority: publicKey,
            maxSupply: new BN(0),
          }
        );
        return {
          createMintTx,
          createMetadataTx,
          createAssociatedTokenAccountTx,
          mintToTx,
          masterEditionTx,
        };
      });

      const txIds = [] as any;

      for (let i = 0; i < txs.length; ++i) {
        const mint = mintDatas[i].mint;
        const {
          createMintTx,
          createMetadataTx,
          createAssociatedTokenAccountTx,
          mintToTx,
          masterEditionTx,
        } = txs[i];
        txIds.push(
          await actions.sendTransaction({
            connection,
            signers: [mint],
            txs: [
              createMintTx,
              createMetadataTx,
              createAssociatedTokenAccountTx,
              mintToTx,
              masterEditionTx,
            ],
            wallet: wallet as Wallet,
          })
        );
      }

      metadatas = mintDatas.map((x, index) => ({
        txId: txIds[index],
        mint: x.mint.publicKey,
        metadata: x.metadataPDA,
        edition: x.editionPDA,
      }));
    }

    await fetch("/api/new-nft", {
      method: "POST",
      body: JSON.stringify({
        imageUrls: processedDatas.imageUrl,
        assetURIs: processedDatas.assetURI,
        metadataURIs: processedDatas.metadataURI,
        assets: enteredNftData.assets,
        creator: user.address,
        collectionId: enteredNftData.collectionId,
        metadatas: metadatas,
        solana: user.solana,
        chainId: chainId?.toString(),
        status: "AVAILABLE",
        tokenIds: tokenIds,
        userId: user._id,
        amounts: enteredNftData.assets.map((asset: any) => asset.amount),
        erc1155: enteredNftData.multipleTokens,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    setLoading(false);

    router.push(`/nfts/${user.id}`);
  }

  return (
    <NewNftForm
      solana={user.solana}
      onAddNft={addNftHandler}
      collections={collections}
      chainId={chainId}
      loading={loading}
    />
  );
}

export async function getServerSideProps(ctx: any) {
  // fetch data from an API
  const client = await MongoClient.connect(process.env.MONGODB_URI as string);

  const db = client.db();

  const collectionsCollection = db.collection("collections");

  const collections = await collectionsCollection
    .find({ userId: ctx.params.userId })
    .toArray();

  client.close();

  return {
    props: {
      collections: collections.map((collection: any) => ({
        ...collection,
        id: collection._id.toString(),
        _id: null,
      })),
    },
  };
}

export default NewNftPage;
