import { Button, Col, Row } from "antd";
import { useRouter } from "next/router";
import React from "react";

function AllConnect() {
  const router = useRouter();

  return (
    <>
      <Row style={{ marginBottom: "20px" }} align="middle" justify="center">
        <Button
          type="primary"
          size="large"
          href="/wallet/solana-connect"
        >
          Connect to Solana chain
        </Button>
      </Row>
      <Row align="middle" justify="center">
        <Button
          type="primary"
          size="large"
          onClick={() => router.push("/wallet/connect")}
        >
          Connect to EVM chain
        </Button>
      </Row>
    </>
  );
}

export default AllConnect;
