import { Button, InputGroup, Intent, Label } from "@blueprintjs/core";
import React, { useMemo, useState } from "react";
import createBlock from "roamjs-components/writes/createBlock";
import deleteBlock from "roamjs-components/writes/deleteBlock";
import getBasicTreeByParentUid from "roamjs-components/queries/getBasicTreeByParentUid";
import getFirstChildUidByBlockUid from "roamjs-components/queries/getFirstChildUidByBlockUid";
import updateBlock from "roamjs-components/writes/updateBlock";
import MenuItemSelect from "roamjs-components/components/MenuItemSelect";

const ALGORITHMS = [
  {
    name: "Default",
    fields: [],
  },
  {
    name: "Custom",
    fields: [
      {
        type: "javascript",
        name: "Function",
        description: "Write your own smart assistant logic using javascript",
      },
    ],
  },
];

const SearchAlgorithmsPanel = ({
  parentUid,
  uid: inputUid,
}: {
  uid?: string;
  parentUid: string;
}) => {
  const uid = useMemo(() => {
    if (inputUid) return inputUid;
    const newUid = window.roamAlphaAPI.util.generateUID();
    createBlock({
      node: { text: "hot keys", uid: newUid },
      parentUid,
      order: 4,
    });
    return newUid;
  }, [inputUid]);
  const [algorithms, setAlgorithms] = useState(() =>
    inputUid
      ? getBasicTreeByParentUid(uid).map(({ text, uid, children = [] }) => ({
          text,
          uid,
          fields: children.map((t) => t.text),
        }))
      : []
  );
  const [newAlgo, setNewAlgo] = useState("0");
  return (
    <>
      {algorithms.map((algo) => (
        <div
          key={algo.uid}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <p>{algo.text}</p>
          <Button
            icon={"trash"}
            style={{ width: 32, height: 32 }}
            minimal
            onClick={() => {
              deleteBlock(algo.uid).then(() =>
                setAlgorithms(algorithms.filter((a) => a.uid !== algo.uid))
              );
            }}
          />
        </div>
      ))}
      <hr />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <MenuItemSelect
          activeItem={newAlgo}
          onItemSelect={(a) => setNewAlgo(a)}
          transformItem={(i) => ALGORITHMS[Number(i)].name}
          items={ALGORITHMS.map((_, i) => `${i}`)}
        />
        <Button
          text={"Add Algorithm"}
          intent={Intent.PRIMARY}
          rightIcon={"plus"}
          minimal
          style={{ marginTop: 8 }}
          onClick={async () => {
            const text = ALGORITHMS[Number(newAlgo)].name;
            createBlock({
              parentUid: uid,
              order: algorithms.length,
              node: {
                text,
                children: [],
              },
            }).then((valueUid) =>
              setAlgorithms([
                ...algorithms,
                {
                  text,
                  fields: [],
                  uid: valueUid,
                },
              ])
            );
          }}
        />
      </div>
    </>
  );
};

export default SearchAlgorithmsPanel;
