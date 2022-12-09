import ActionItem from "./ActionItem";

function ActionList(props: any) {
  return (
    <ul>
      {props.actions.map((action: any) => (
        <ActionItem
          key={action.id}
          id={action.id}
          name={action.name}
          nft={action.nft}
        />
      ))}
    </ul>
  );
}

export default ActionList;