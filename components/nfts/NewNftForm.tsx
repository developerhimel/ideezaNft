import {
  Button,
  Checkbox,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Upload,
} from "antd";
import { InboxOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./NewNftForm.module.css";
const { Dragger } = Upload;
const { Option } = Select;
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

const NewNftForm = (props: any) => {
  const [form] = Form.useForm();
  const [multipleTokens, setMultipleTokens] = useState(false);

  const onChangeMultipleTokens = useCallback(() => {
    const { multipleTokens } = form.getFieldsValue();
    setMultipleTokens(multipleTokens);
    if (multipleTokens) {
      console.log('xcvoiu');
      
      form.setFieldsValue({ lazyMint: false });
    }
  }, [form]);

  const onFinish = (values: any) => {
    props.onAddNft(values);
  };

  const normFile = (e: any) => {
    if (Array.isArray(e)) {
      return e;
    }

    return e?.fileList;
  };

  const onChange = (len: number) => {
    console.log(len);
    const fields = form.getFieldsValue();
    let { assets } = fields;

    if (!assets) {
      assets = [];
    }

    while (len > assets.length) {
      assets.push({ name: undefined, description: undefined, amount: undefined });
    }

    while (len < assets.length) {
      assets.pop();
    }

    console.log(assets.length, "assets.length");

    // Object.assign(projects[key], { type: value })
    form.setFieldsValue({ assets });
  };
console.log(props.solana);
  return (
    <Row
      gutter={{
        xs: 8,
        sm: 16,
        md: 24,
        lg: 32,
      }}
    >
      <Col className="gutter-row" span={2}></Col>
      <Col className="gutter-row" span={21}>
        <Form
          form={form}
          onFinish={onFinish}
          validateMessages={validateMessages}
        >
          {!props.solana && (
            <>
              <Form.Item
                label="Multiple Tokens"
                name="multipleTokens"
                valuePropName="checked"
              >
                <Checkbox onChange={onChangeMultipleTokens}>Multiple Tokens</Checkbox>
              </Form.Item>
              <Form.Item
                label="Lazy Minting"
                name="lazyMint"
                valuePropName="checked"
              >
                <Checkbox disabled={multipleTokens}>Lazy Minting</Checkbox>
              </Form.Item>
            </>
          )}
          <Form.Item
            name="images"
            label="File"
            valuePropName="fileList"
            rules={[
              {
                required: true,
              },
            ]}
            getValueFromEvent={normFile}
          >
            <Dragger
              name="image"
              multiple={true}
              onChange={(info) => onChange(info.fileList.length)}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">
                Click or drag file to this area to upload
              </p>
              <p className="ant-upload-hint">
                File types supported: JPG, PNG, GIF, SVG, MP4, WEBM, MP3, WAV,
                OGG, GLB, GLTF. Max size: 100 MB.
              </p>
            </Dragger>
          </Form.Item>
          <Form.List name="assets">
            {(fields) => (
              <>
                {fields.map(({ name, key }) => (
                  <Space
                    key={key}
                    style={{
                      display: "flex",
                      marginBottom: 8,
                    }}
                    align="baseline"
                    size={["small", "small"]}
                  >
                    <Form.Item
                      key={"name_" + key}
                      name={[name, "name"]}
                      label={"Name #" + (key + 1)}
                      rules={[
                        {
                          required: true,
                        },
                      ]}
                    >
                      <Input placeholder="Name" />
                    </Form.Item>
                    <Form.Item
                      key={"royaltyFee_" + key}
                      label={"Royalty fee #" + (key + 1)}
                      name={[name, "royaltyFee"]}
                      initialValue={5}
                      rules={[
                        {
                          required: true,
                        },
                      ]}
                    >
                      <InputNumber
                        min={0}
                        max={10}
                        formatter={(value) => `${value}%`}
                        parser={(value: any) => value.replace("%", "")}
                      />
                    </Form.Item>
                    {multipleTokens && (
                      <Form.Item
                        key={"amount_" + key}
                        label={"Amount #" + (key + 1)}
                        name={[name, "amount"]}
                        rules={[
                          {
                            required: true,
                          },
                        ]}
                      >
                        <InputNumber />
                      </Form.Item>
                    )}
                    <Form.Item
                      key={"description_" + key}
                      label={"Description #" + (key + 1)}
                      name={[name, "description"]}
                    >
                      <Input.TextArea
                        className={styles["text-area"]}
                        placeholder="Description"
                      />
                    </Form.Item>
                  </Space>
                ))}
              </>
            )}
          </Form.List>
          <Form.Item name="collectionId" label="Collection" hasFeedback>
            <Select placeholder="Select the collection where you want this nft to">
              {props.collections.map((collection: any) => (
                <Option key={collection.id} value={collection.id}>
                  {`${collection.name} - ${collection.id}`}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item wrapperCol={{ offset: 9 }}>
            <Button type="primary" htmlType="submit" loading={props.loading}>
              Submit
            </Button>
          </Form.Item>
        </Form>
      </Col>
    </Row>
  );
};

export default NewNftForm;
