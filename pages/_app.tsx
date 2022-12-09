import Layout from "../components/layout/Layout";
import "../styles/globals.css";
import type { AppProps } from "next/app";
import { Web3ReactProvider } from "@web3-react/core";
import { Web3Provider } from "@ethersproject/providers";
import { useRouter } from "next/router";
import React from "react";
import {
  WalletProvider,
  ConnectionProvider,
  StoreProvider,
  SPLTokenListProvider,
} from "solana-helper";
import useConnectionInfo from "../hooks/connectionInfo";

function getLibrary(provider: any) {
  const library = new Web3Provider(provider);
  library.pollingInterval = 2000;
  return library;
}

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { user } = useConnectionInfo();
  console.log(user);

  return (
    <ConnectionProvider endpointIndex={2}>
      <WalletProvider>
        <SPLTokenListProvider>
          <StoreProvider
            ownerAddress={user?.solana ? user?.address : ""}
            storeAddress={process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS_ADDRESS}
          >
            <Web3ReactProvider getLibrary={getLibrary}>
              <Layout key={router.asPath}>
                <Component {...pageProps} />
              </Layout>
            </Web3ReactProvider>
          </StoreProvider>
        </SPLTokenListProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default MyApp;
