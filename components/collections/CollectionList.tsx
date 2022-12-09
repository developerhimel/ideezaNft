import { Col, Row } from "antd";
import CollectionItem from "./CollectionItem";

function CollectionList(props: any) {
  return (
    <Row
      gutter={{
        xs: 8,
        sm: 16,
        md: 24,
        lg: 32,
      }}
    >
      {props.collections.map((collection: any) => (
        <Col
          className="gutter-row"
          span={6}
          xs={24}
          sm={12}
          xl={6}
          key={collection.id}
        >
          <CollectionItem
            key={collection.id}
            id={collection.id}
            imageUrl={collection.imageUrl}
            description={collection.description}
            name={collection.name}
            chainId={collection.chainId}
          />
        </Col>
      ))}
    </Row>
  );
}

export default CollectionList;
