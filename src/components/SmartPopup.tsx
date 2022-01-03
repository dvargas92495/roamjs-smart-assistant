import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { Card } from "@blueprintjs/core";
import updateBlock from "roamjs-components/writes/updateBlock";

type Props = {
  textarea: HTMLTextAreaElement;
  blockUid: string;
  resultsPerPage: number;
};

const SmartPopup = ({
  onChangeRef,
  blockUid,
  textarea,
  resultsPerPage,
}: {
  onChangeRef: { current: (s: string) => void };
} & Props) => {
  const [query, setQuery] = useState("");
  const [alt, setAlt] = useState(false);
  const cache = useMemo<{ [uid: string]: { text: string; uid: string }[] }>(
    () => ({}),
    []
  );
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
            .filter(({ uid }) => uid !== blockUid)
            .slice(0, resultsPerPage))
        : [],
    [query, blockUid]
  );
  useEffect(() => {
    onChangeRef.current = (s) => {
      setQuery(s);
    };
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Alt") {
        setAlt(true);
      } else {
        const key = Number(e.key);
        if (e.altKey && !isNaN(key)) {
          const result = document.getElementById(
            "roamjs-smart-assistant-results"
          ).children[key - 1];
          if (result) {
            const { selectionStart, selectionEnd } = textarea;
            const oldText = textarea.value;
            updateBlock({
              uid: blockUid,
              text: `${oldText.slice(
                0,
                Math.min(selectionStart, selectionEnd)
              )}((${result.getAttribute("data-uid")}))${oldText.slice(
                Math.max(selectionStart, selectionEnd)
              )}`,
            });
          }
        }
      }
    });
    textarea.addEventListener("keyup", (e) => {
      setAlt(e.altKey);
    });
  }, [onChangeRef, textarea, setQuery, setAlt, blockUid]);
  return (
    <Card
      style={{
        transition: "display 0.25s ease-in",
        display: !query ? "none" : "block",
      }}
    >
      <h4>
        Searching blocks related to <i>{query.slice(0, 20)}</i>
        {query ? "..." : ""}
      </h4>
      <div id={"roamjs-smart-assistant-results"}>
        {results.map((r, i) => (
          <div key={r.uid} data-uid={r.uid}>
            <span>{alt ? `${i + 1} ` : "-> "}</span>
            <span>{r.text}</span>
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
