import { Button, Intent } from "@blueprintjs/core";
import React, { useMemo, useState } from "react";
import createBlock from "roamjs-components/writes/createBlock";
import deleteBlock from "roamjs-components/writes/deleteBlock";
import getBasicTreeByParentUid from "roamjs-components/queries/getBasicTreeByParentUid";
import MenuItemSelect from "roamjs-components/components/MenuItemSelect";
import { render as renderToast } from "roamjs-components/components/Toast";
import { Controlled as CodeMirror } from "react-codemirror2";
import "codemirror/mode/javascript/javascript";

const AsyncFunction: FunctionConstructor = new Function(
  `return Object.getPrototypeOf(async function(){}).constructor`
)();

const JS_REGEX = new RegExp("```javascript\n(.*)```", "s");

type Results = { uid: string; text: string }[];

const ALGORITHMS: {
  name: string;
  fields: { type: "javascript"; name: string; description: string }[];
  search: (p: { text: string; params: string[] }) => Promise<Results> | Results;
}[] = [
  {
    name: "Default",
    fields: [],
    search: ({ text }) =>
      window.roamAlphaAPI
        .q(
          `[:find ?contents (pull ?block [:block/uid]) :where [?block :block/string ?contents] (or ${text
            .split(/\s/)
            .filter((s) => !!s.trim())
            .map((t) => `[(clojure.string/includes? ?contents  "${t}")]`)
            .join(" ")})]`
        )
        .map(([text, { uid }]: [string, { uid: string }]) => ({
          uid,
          text,
        })),
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
    search: ({ params: [logic = ""], text }) => {
      if (!logic) return [];
      try {
        const code = JS_REGEX.exec(logic)?.[1] || logic;
        return Promise.resolve(new AsyncFunction("args", code)({ text })).then(
          (output) => {
            if (!output) {
              return [];
            }
            if (!Array.isArray(output)) {
              return [];
            }
            return output
              .filter(
                (o) =>
                  typeof o === "object" &&
                  typeof o.uid === "string" &&
                  typeof o.text === "string"
              )
              .map((o) => ({ text: o.text as string, uid: o.uid as string }));
          }
        );
      } catch (e) {
        renderToast({
          id: "smart-assistant-user-error",
          content: `Your custom search algorithm failed with the following error:\n\n${e.message}`,
          intent: Intent.DANGER,
        });
        return [];
      }
    },
  },
];

const algorithmByName = Object.fromEntries(
  ALGORITHMS.map(({ name, ...alg }) => [name, alg])
);

export const runAlgorithm = ({
  name,
  params,
  text,
}: {
  name: string;
  params: string[];
  text: string;
}) => {
  const { search } = algorithmByName[name];
  return search({ params, text });
};

const SearchAlgorithmsPanel = ({
  parentUid,
  uid,
}: {
  uid: string;
  parentUid: string;
}) => {
  const [algorithms, setAlgorithms] = useState(() =>
    getBasicTreeByParentUid(uid).map(({ text, uid, children = [] }) => ({
      text,
      uid,
      fields: children.map((t) => t.text),
    }))
  );
  const [newAlgo, setNewAlgo] = useState("0");
  const [newFields, setNewFields] = useState<string[]>([]);
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
          marginBottom: 16,
        }}
      >
        <MenuItemSelect
          activeItem={newAlgo}
          onItemSelect={(a) => {
            setNewFields(ALGORITHMS[Number(a)].fields.map(() => ""));
            setNewAlgo(a);
          }}
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
                children: newFields.map((text) => ({ text })),
              },
            }).then((valueUid) => {
              setAlgorithms([
                ...algorithms,
                {
                  text,
                  fields: newFields,
                  uid: valueUid,
                },
              ]);
              setNewFields(newFields.map(() => ""));
            });
          }}
        />
      </div>
      <div>
        {ALGORITHMS[Number(newAlgo)].fields.map((s, index) => (
          <div key={index} onKeyDown={(e) => e.stopPropagation()}>
            {s.type === "javascript" && (
              <CodeMirror
                value={JS_REGEX.exec(newFields[index])?.[1] || ""}
                options={{
                  mode: { name: "javascript" },
                  lineNumbers: true,
                  lineWrapping: true,
                }}
                onBeforeChange={(_, __, v) => {
                  setNewFields(
                    newFields.map((f, j) =>
                      j === index ? `\`\`\`javascript\n${v}\`\`\`` : f
                    )
                  );
                }}
              />
            )}
          </div>
        ))}
      </div>
    </>
  );
};

export default SearchAlgorithmsPanel;
