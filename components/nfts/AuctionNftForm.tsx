import { useWeb3React } from "@web3-react/core";
import { Button, Form, Input, InputNumber, Select, Upload } from "antd";
import { CHAIN_DATA } from "../../constants/chain";
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

/* eslint-enable no-template-curly-in-string */

const AuctionNftForm = (props: any) => {
  const { chainId } = props;
  const onFinish = (values: any) => {
    console.log(values, "values");

    props.onAuctionNft(values);
  };

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
            name="expiry"
            label="Expiry"
            rules={[
              {
                required: true,
              },
            ]}
          >
            <InputNumber />
          </Form.Item>
          <Form.Item
            name="startingPrice"
            label="Starting Price"
            rules={[
              {
                required: true,
              },
            ]}
          >
            <InputNumber />
          </Form.Item>
          {props.erc1155 && <Form.Item
            name="amount"
            label="Amount"
            rules={[
              {
                required: true,
              },
            ]}
          >
            <InputNumber />
          </Form.Item>}
          <Form.Item
            name="erc20TokenAddress"
            label="Token Address"
            initialValue={CHAIN_DATA[chainId].erc20[0].address}
            hasFeedback
          >
            <Select placeholder="Select payment token address">
              {CHAIN_DATA[chainId].erc20.map((token: any) => (
                <Option key={token.address} value={token.address}>
                  {`${token.name} - ${token.symbol}`}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item wrapperCol={{ ...layout.wrapperCol, offset: 8 }}>
            <Button type="primary" htmlType="submit" loading={props.loading}>
              Submit
            </Button>
          </Form.Item>
        </Form>
      )}
    </>
  );
};

export default AuctionNftForm;
