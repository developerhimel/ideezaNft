import { Button, Form, Input, InputNumber, Select, Upload } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import { useState } from "react";
import { CHAIN_DATA } from "../../constants/chain";
const { Dragger } = Upload;
const { Option } = Select;
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

const NewCollectionForm = (props: any) => {
  const [fileLen, setFileLen] = useState(0);

  const onFinish = (values: any) => {
    props.onAddCollection(values);
  };

  const normFile = (e: any) => {
    console.log("Upload event:", e);

    if (Array.isArray(e)) {
      setFileLen(e.length);
      return e;
    }

    setFileLen(e?.fileList?.length);

    return e?.fileList;
  };

  return (
    <Form
      {...layout}
      name="nest-messages"
      onFinish={onFinish}
      validateMessages={validateMessages}
    >
      <Form.Item
        name="image"
        label="Logo image"
        valuePropName="fileList"
        rules={[
          {
            required: true,
          },
          {
            validator: async () => {
              if (fileLen > 1) throw new Error("Single file only");
            },
            message: "Single file only",
          },
        ]}
        getValueFromEvent={normFile}
      >
        <Dragger name="image" multiple={false}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            Click or drag file to this area to upload
          </p>
          <p className="ant-upload-hint">
            This image will also be used for navigation. 350 x 350 recommended.
          </p>
        </Dragger>
      </Form.Item>
      <Form.Item
        name="name"
        label="Name"
        rules={[
          {
            required: true,
          },
        ]}
      >
        <Input />
      </Form.Item>
      <Form.Item name="description" label="Description">
        <Input.TextArea style={{ height: 100 }} />
      </Form.Item>
      <Form.Item
        name="chainId"
        label="Chain"
        hasFeedback
        required
      >
        <Select placeholder="Select the blockchain where you'd like new items from this collection to be added by default">
          {Object.keys(CHAIN_DATA).map(key => <Option value={key} key={key}>{CHAIN_DATA[key].name}</Option>)}
        </Select>
      </Form.Item>
      <Form.Item wrapperCol={{ ...layout.wrapperCol, offset: 8 }}>
        <Button type="primary" htmlType="submit" loading={props.loading}>
          Submit
        </Button>
      </Form.Item>
    </Form>
  );
};

export default NewCollectionForm;
