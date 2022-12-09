import React from "react";
import { Button, Row } from "antd";
import StorageUtils from "../../utils/storage";
import { useRouter } from "next/router";
import bs58 from "bs58";
import {
  ConnectButton,
  sendTransactions,
  sendTransactionWithRetry,
  SequenceType,
  useConnection,
  useSolanaWallet,
  WalletSigner,
  WhitelistedCreator,
} from "solana-helper";
import { setStore } from "solana-helper/dist/common/models/metaplex/setStore";
import { setWhitelistedCreator } from "solana-helper/dist/common/models/metaplex/setWhitelistedCreator";
import { Connection, Keypair, TransactionInstruction } from "@solana/web3.js";
import { WalletNotConnectedError } from "@solana/wallet-adapter-base";

// TODO if this becomes very slow move to batching txns like we do with settle.ts
// but given how little this should be used keep it simple
export async function saveAdmin(
  connection: Connection,
  wallet: WalletSigner,
  isPublic: boolean,
  whitelistedCreators: WhitelistedCreator[]
) {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const signers: Array<Keypair[]> = [];
  const instructions: Array<TransactionInstruction[]> = [];

  const storeSigners: Keypair[] = [];
  const storeInstructions: TransactionInstruction[] = [];

  signers.push(storeSigners);
  instructions.push(storeInstructions);
  
  await setStore(
    isPublic,
    wallet.publicKey.toBase58(),
    wallet.publicKey.toBase58(),
    storeInstructions
  );
  for (let i = 0; i < whitelistedCreators.length; i++) {
    const wc = whitelistedCreators[i];
    const wcSigners: Keypair[] = [];
    const wcInstructions: TransactionInstruction[] = [];

    await setWhitelistedCreator(
      wc.address,
      wc.activated,
      wallet.publicKey.toBase58(),
      wallet.publicKey.toBase58(),
      wcInstructions
    );
    signers.push(wcSigners);
    instructions.push(wcInstructions);
  }

  instructions.length === 1
    ? await sendTransactionWithRetry(
        connection,
        wallet,
        instructions[0],
        signers[0],
        "single"
      )
    : await sendTransactions(
        connection,
        wallet,
        instructions,
        signers,
        SequenceType.StopOnFailure,
        "single"
      );
}

// Default styles that can be overridden by your app
require("@solana/wallet-adapter-react-ui/styles.css");

export default function ConnectSolana() {
  const wallet = useSolanaWallet();
  const { publicKey, signMessage, disconnect } = wallet;
  const connection = useConnection();
  const router = useRouter();
  
// console.log(publicKey?.toBase58());

  async function loginHandler(loginData: any) {
    const response = await fetch("/api/login", {
      method: "POST",
      body: JSON.stringify(loginData),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log(data.user, "data");
    if (data.user.solana && !data.user.store && wallet && publicKey) {
      await saveAdmin(connection, wallet, false, [
        new WhitelistedCreator({
          address: publicKey.toBase58(),
          activated: true,
        }),
      ]);
    }

    const { user, accessToken, refreshToken } = data;
    StorageUtils.setUser({ ...user, id: user._id.toString() });
    StorageUtils.setToken(accessToken);
    StorageUtils.setRefreshToken(refreshToken);
    window.alert(`Success!\n\n${loginData.password}`);

    router.push("/");
  }

  return (
    <>
      <Row style={{ marginBottom: "10px" }} align="middle" justify="center">
        <ConnectButton type="primary" size="large" allowWalletChange />
      </Row>

      {wallet && signMessage && publicKey && (
        <>
          <Row style={{ marginBottom: "10px" }} align="middle" justify="center">
            {wallet && (
              <Button onClick={disconnect} type="primary" size="large">
                Disconnect
              </Button>
            )}
          </Row>
          <Row align="middle" justify="center">
            <Button
              size="large"
              type="primary"
              onClick={async () => {
                const rawMessage = `Welcome to Bao's Marketplace!\n\nClick to sign in and accept the Bao's Marketplace Terms of Service.\n\nThis request will not trigger a blockchain transaction or cost any gas fees.\n\nYour authentication status will reset after 24 hours.\n\nWallet address:\n${publicKey}\n`;
                const message = new TextEncoder().encode(rawMessage);

                const signature = await signMessage(message);

                await loginHandler({
                  publicKey: JSON.stringify(Array.from(publicKey.toBytes())),
                  username: publicKey.toString(),
                  password: bs58.encode(signature),
                  message: rawMessage,
                  solana: true,
                });
              }}
            >
              Login
            </Button>
          </Row>
        </>
      )}
    </>
  );
}
