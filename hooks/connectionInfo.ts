import { useWeb3React } from "@web3-react/core";
import { useEffect, useState } from "react";
import { useConnection, useSolanaWallet } from "solana-helper";
import StorageUtils from "../utils/storage";

const useConnectionInfo = () => {
  const [user, setUser] = useState({} as any);
  const connection = useConnection();
  const wallet = useSolanaWallet();
  const context = useWeb3React();
  const { chainId, library } = context;

  useEffect(() => {
    setUser(StorageUtils.getUser());
  }, []);

  return {
    user,
    chainId: (user && user.solana) ? 103 : chainId,
    connection,
    wallet,
    library,
  }
};

export default useConnectionInfo;
