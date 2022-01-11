import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { Card } from "@blueprintjs/core";
import updateBlock from "roamjs-components/writes/updateBlock";
import isControl from "roamjs-components/util/isControl";

type Props = {
  textarea: HTMLTextAreaElement;
  blockUid: string;
  resultsPerPage: number;
  algorithms: { fields: string[]; text: string; uid: string }[];
};

const BLOCK_TEXT_LENGTH_MAX = 250;

const SmartPopup = ({
  onChangeRef,
  blockUid,
  textarea,
  resultsPerPage,
}: {
  onChangeRef: { current: (s: string) => void };
} & Props) => {
  const [query, setQuery] = useState("");
  const [isActionMode, setIsActionMode] = useState(false);
  const actionModeRef = useRef(false);
  const cache = useMemo<{ [uid: string]: { text: string; uid: string }[] }>(
    () => ({}),
    []
  );
  const [excludedUids, setExcludedUids] = useState(new Set(blockUid));
  const excludedUidsRef = useRef(excludedUids);
  const results = useMemo(
    () =>
      query
        ? cache[query] ||
          (cache[query] = window.roamAlphaAPI
            .q(
              `[:find ?contents (pull ?block [:block/uid]) :where [?block :block/string ?contents] (or ${query
                .split(/\s/)
                .filter((s) => !!s.trim())
                .map((t) => `[(clojure.string/includes? ?contents  "${t}")]`)
                .join(" ")})]`
            )
            .map(([text, { uid }]: [string, { uid: string }]) => ({
              uid,
              text,
            }))
            .filter(({ uid }) => !excludedUids.has(uid))
            .slice(0, resultsPerPage))
        : [],
    [query, blockUid, excludedUids]
  );
  useEffect(() => {
    onChangeRef.current = (s) => {
      setQuery(s);
    };
    textarea.addEventListener("keydown", (e) => {
      if (isControl(e) && (e.key === "m" || e.code === "KeyM") && !e.shiftKey) {
        setIsActionMode(!actionModeRef.current);
        actionModeRef.current = !actionModeRef.current;
      } else if (actionModeRef.current) {
        const key = Number(e.key);
        if (!isNaN(key)) {
          const result = document.getElementById(
            "roamjs-smart-assistant-results"
          ).children[key - 1];
          if (result) {
            const { selectionStart, selectionEnd } = textarea;
            const oldText = textarea.value;
            const location = window.roamAlphaAPI.ui.getFocusedBlock();
            const dataUid = result.getAttribute("data-uid");
            updateBlock({
              uid: blockUid,
              text: `${oldText.slice(
                0,
                Math.min(selectionStart, selectionEnd)
              )}((${dataUid}))${oldText.slice(
                Math.max(selectionStart, selectionEnd)
              )}`,
            }).then(() => {
              window.roamAlphaAPI.ui.setBlockFocusAndSelection({
                location,
                selection: { start: selectionStart + dataUid.length + 4 },
              });
              excludedUidsRef.current.add(dataUid);
              setExcludedUids(excludedUidsRef.current);
            });
          }
        }
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }, [
    onChangeRef,
    textarea,
    setQuery,
    setIsActionMode,
    actionModeRef,
    excludedUidsRef,
    blockUid,
  ]);
  return (
    <Card
      style={{
        transition: "display 0.25s ease-in",
        display: !query ? "none" : "block",
      }}
    >
      <h4>Searching Related Blocks</h4>
      <div id={"roamjs-smart-assistant-results"}>
        {results.map((r, i) => (
          <div key={r.uid} data-uid={r.uid} style={{ display: "flex" }}>
            <span
              style={{ display: "inline-block", height: "100%", minWidth: 32 }}
            >
              {isActionMode ? `${i + 1} ` : "-> "}
            </span>
            <span>
              {r.text.length > BLOCK_TEXT_LENGTH_MAX
                ? `${r.text.slice(0, BLOCK_TEXT_LENGTH_MAX - 3)}...`
                : r.text}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};

export const render = (props: Props) => {
  const parent = props.textarea.parentElement;
  const container = document.createElement("div");
  parent.appendChild(container);
  const onChangeRef = { current: (_: string) => {} };
  ReactDOM.render(
    <SmartPopup onChangeRef={onChangeRef} {...props} />,
    container
  );
  return onChangeRef;
};

export default SmartPopup;
