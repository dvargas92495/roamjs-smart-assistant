import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { Card } from "@blueprintjs/core";
import updateBlock from "roamjs-components/writes/updateBlock";
import isControl from "roamjs-components/util/isControl";
import { runAlgorithm } from "./SearchAlgorithmsPanel";
import { getRoamUrlByPage } from "roamjs-components";

type Props = {
  textarea: HTMLTextAreaElement;
  blockUid: string;
  resultsPerPage: number;
  algorithms: { fields: string[]; text: string; uid: string }[];
  frequency: string;
};

const BLOCK_TEXT_LENGTH_MAX = 250;

const SmartPopup = ({
  onChangeRef,
  blockUid,
  textarea,
  resultsPerPage,
  algorithms,
  frequency,
}: {
  onChangeRef: { current: (s: string) => void };
} & Props) => {
  const [disabled, setDisabled] = useState(frequency !== "always");
  const disabledRef = useRef(disabled);
  const [query, setQuery] = useState("");
  const [isActionMode, setIsActionMode] = useState(false);
  const actionModeRef = useRef(false);
  const cache = useMemo<{ [uid: string]: { text: string; uid: string }[] }>(
    () => ({}),
    []
  );
  const [excludedUids, setExcludedUids] = useState(new Set(blockUid));
  const excludedUidsRef = useRef(excludedUids);
  const [results, setResults] = useState([]);
  useEffect(() => {
    if (!query) {
      setResults([]);
    } else if (cache[query]) {
      setResults(cache[query]);
    } else {
      Promise.all(
        algorithms.map((a) =>
          runAlgorithm({ name: a.text, params: a.fields, text: query })
        )
      ).then((res) => setResults((cache[query] = res.flat())));
    }
  }, [query, blockUid, excludedUids, algorithms]);
  const resultsInView = useMemo(
    () =>
      results
        .filter(({ uid }) => !excludedUids.has(uid))
        .slice(0, resultsPerPage),
    [results, resultsPerPage, excludedUids]
  );
  useEffect(() => {
    onChangeRef.current = (s) => {
      setQuery(s);
    };
    textarea.addEventListener("keydown", (e) => {
      if (isControl(e) && (e.key === "m" || e.code === "KeyM")) {
        if (!e.shiftKey) {
          setIsActionMode(!actionModeRef.current);
          actionModeRef.current = !actionModeRef.current;
          e.preventDefault();
          e.stopPropagation();
        } else if (frequency === "hotkey") {
          setDisabled(!disabledRef.current);
          disabledRef.current = !disabledRef.current;
          e.preventDefault();
          e.stopPropagation();
        }
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
    frequency,
    disabledRef,
    setDisabled
  ]);
  return (
    <Card
      style={{
        transition: "display 0.25s ease-in",
        display: disabled || !query ? "none" : "block",
      }}
    >
      {algorithms.length ? (
        <>
          <h4>Searching Related Blocks</h4>
          <div id={"roamjs-smart-assistant-results"}>
            {resultsInView.length
              ? resultsInView.map((r, i) => (
                  <div key={r.uid} data-uid={r.uid} style={{ display: "flex" }}>
                    <span
                      style={{
                        display: "inline-block",
                        height: "100%",
                        minWidth: 32,
                      }}
                    >
                      {isActionMode ? `${i + 1} ` : "-> "}
                    </span>
                    <span>
                      {r.text.length > BLOCK_TEXT_LENGTH_MAX
                        ? `${r.text.slice(0, BLOCK_TEXT_LENGTH_MAX - 3)}...`
                        : r.text}
                    </span>
                  </div>
                ))
              : "No related blocks found"}
          </div>
        </>
      ) : (
        <>
          <h4>No Algorithms Configured</h4>
          <div>
            Head to the{" "}
            <a
              onClick={() =>
                window.roamAlphaAPI.ui.mainWindow.openPage({
                  page: { title: "roam/js/smart-assistant" },
                })
              }
            >
              roam/js/smart-assistant
            </a>{" "}
            page to add one.
          </div>
        </>
      )}
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
