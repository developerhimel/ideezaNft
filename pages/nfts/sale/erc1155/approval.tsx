import { Contract } from "@ethersproject/contracts";
import { useRouter } from "next/router";
import React from "react";
import useConnectionInfo from "../../../../hooks/connectionInfo";
import { CHAIN_DATA } from "../../../../constants/chain";
import erc1155ABI from "../../../../contracts/abi/erc1155ABI.json";

export default function approval() {
  const router = useRouter();
  const { user, library, chainId, connection, wallet } = useConnectionInfo();
  return (
    <div className="container">
      <div className="wrapper">
        <h1 className="text-xl py-5">
          Approve this website to trade your nfts
        </h1>
        <button
          onClick={async () => {
            const signer = library.getSigner();
            const contract = new Contract(
              CHAIN_DATA[Number(chainId)].erc1155 as string,
              erc1155ABI,
              signer
            );
            const isApproved = await contract.isApprovedForAll(
              user.address,
              CHAIN_DATA[Number(chainId)].trader
            );
            if (!isApproved) {
              const approved = await contract.setApprovalForAll(
                CHAIN_DATA[Number(chainId)].trader,
                true
              );
              approved.wait();
              if (approved) {
                alert(
                  "you have successfully approved. Please wait until the approval transaction is completed."
                );
                router.push(`/`);
              }
            } else {
              alert(
                "You have already approved this website to trade your nfts"
              );
              router.push(`/`);
            }
          }}
          type="button"
          className="approve-btn"
        >
          Approve
        </button>
      </div>
    </div>
  );
}
