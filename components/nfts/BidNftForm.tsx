import { Button, Form, Input, InputNumber, Select, Upload } from "antd";

import web3 from "web3";

const { fromWei } = web3.utils;

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

/* eslint-enable no-template-curly-in-string */

const BidNftForm = (props: any) => {
  const onFinish = (values: any) => {
    props.onBidNft(values);
  };

  return (
    <Form
      {...layout}
      name="nest-messages"
      onFinish={onFinish}
      validateMessages={validateMessages}
    >
      {props.nft.bidOrders && props.nft.bidOrders.length && (
              <div className="container">
                <b>Highest Offer</b>
                <p>
                  {props.nft.solana
                    ? props.nft.bidOrders[0].signedOrder.erc20TokenAmount
                    : fromWei(props.nft.bidOrders[0].signedOrder.erc20TokenAmount) +
                      ` ${props.nft.symbol}`}
                </p>
              </div>
            )}
      <Form.Item
        name="amount"
        label="Price"
        initialValue={props.minPrice}
        rules={[
          {
            required: true,
          },
        ]}
      >
        <InputNumber min={props.minPrice} />
      </Form.Item>
      <Form.Item wrapperCol={{ ...layout.wrapperCol, offset: 8 }}>
        <Button type="primary" htmlType="submit" loading={props.loading}>
          Submit
        </Button>
      </Form.Item>
    </Form>
  );
};

export default BidNftForm;
