import axios from "axios";

async function getMasterEdition(editionAddress: string) {
  const masterReq = {
    jsonrpc: "2.0",
    id: 1,
    method: "getMultipleAccounts",
    params: [
      [editionAddress],
      {
        commitment: "recent",
        encoding: "base64",
      },
    ],
  };
  const { data: masterRes } = await axios.post(
    "https://api.devnet.solana.com",
    masterReq
  );

  masterRes.result.value[0].data = masterRes.result.value[0].data[0];
  return {
    pubkey: editionAddress,
    account: masterRes.result.value[0],
  };
}

async function getTokenAccount(mintAddress: string, userAddress: string) {
  const tokenAccountReq = {
    jsonrpc: "2.0",
    id: 1,
    method: "getTokenAccountsByOwner",
    params: [
      userAddress,
      {
        mint: mintAddress,
      },
      {
        encoding: "jsonParsed",
      },
    ],
  };
  const { data: tokenAccountRes } = await axios.post(
    "https://api.devnet.solana.com",
    tokenAccountReq
  );
  return tokenAccountRes.result.value[0];
}

export async function crawlItemData(metadata: any, userAddress: string) {
  while (true) {
    try {
      const metadataData: any = await getMasterEdition(metadata.metadata);
      const masterEdition: any = await getMasterEdition(metadata.edition);
      const tokenAccount: any = await getTokenAccount(metadata.mint, userAddress);
      return { metadata: metadataData, masterEdition, tokenAccount };
    } catch (err) {
      console.log(err, "Line #117 test.ts");
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}
