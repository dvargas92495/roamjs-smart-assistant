import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactDOM from "react-dom";
import { Button, Card, Tooltip } from "@blueprintjs/core";
import updateBlock from "roamjs-components/writes/updateBlock";
import isControl from "roamjs-components/util/isControl";
import { runAlgorithm } from "./SearchAlgorithmsPanel";
import getRoamUrlByPage from "roamjs-components/dom/getRoamUrlByPage";
import openBlockInSidebar from "roamjs-components/writes/openBlockInSidebar";
import type { SidebarWindow } from "roamjs-components/types";
import getChildrenLengthByPageUid from "roamjs-components/queries/getChildrenLengthByPageUid";
import createBlock from "roamjs-components/writes/createBlock";

type Props = {
  textarea: HTMLTextAreaElement;
  blockUid: string;
  resultsPerPage: number;
  algorithms: { fields: string[]; text: string; uid: string }[];
  frequency: string;
};

type ActionProps = {
  result: Element;
  addExcludedUid: (s: string) => void;
  textarea: HTMLTextAreaElement;
  blockUid: string;
};

const BLOCK_TEXT_LENGTH_MAX = 250;

const aliasAction = ({
  textarea,
  blockUid,
  result,
  addExcludedUid,
}: ActionProps) => {
  if (result) {
    const { selectionStart, selectionEnd } = textarea;
    const oldText = textarea.value;
    const location = window.roamAlphaAPI.ui.getFocusedBlock();
    const dataUid = result.getAttribute("data-uid");
    return updateBlock({
      uid: blockUid,
      text: `${oldText.slice(
        0,
        Math.min(selectionStart, selectionEnd)
      )}[](((${dataUid})))${oldText.slice(
        Math.max(selectionStart, selectionEnd)
      )}`,
    })
      .then(() => {
        return window.roamAlphaAPI.ui.setBlockFocusAndSelection({
          location,
          selection: { start: selectionStart + 1 },
        });
      })
      .then(() => addExcludedUid(dataUid));
  }
};

const referenceAction = ({
  textarea,
  blockUid,
  result,
  addExcludedUid,
}: ActionProps) => {
  if (result) {
    const { selectionStart, selectionEnd } = textarea;
    const oldText = textarea.value;
    const location = window.roamAlphaAPI.ui.getFocusedBlock();
    const dataUid = result.getAttribute("data-uid");
    return updateBlock({
      uid: blockUid,
      text: `${oldText.slice(
        0,
        Math.min(selectionStart, selectionEnd)
      )}((${dataUid}))${oldText.slice(Math.max(selectionStart, selectionEnd))}`,
    })
      .then(() => {
        return window.roamAlphaAPI.ui.setBlockFocusAndSelection({
          location,
          selection: { start: selectionStart + 4 + dataUid.length },
        });
      })
      .then(() => addExcludedUid(dataUid));
  }
};

const openInSidebarAction = ({
  textarea,
  blockUid,
  result,
  addExcludedUid,
}: ActionProps) => {
  if (result) {
    const { selectionStart, selectionEnd } = textarea;
    const dataUid = result.getAttribute("data-uid");
    return openBlockInSidebar(dataUid)
      .then(() => {
        return window.roamAlphaAPI.ui.setBlockFocusAndSelection({
          location: {
            "block-uid": blockUid,
            "window-id":
              window.roamAlphaAPI.ui.getFocusedBlock()?.["window-id"],
          },
          selection: { start: selectionStart, end: selectionEnd },
        });
      })
      .then(() => addExcludedUid(dataUid));
  }
};

const addAsChildAction = ({
  blockUid,
  result,
  addExcludedUid,
}: ActionProps) => {
  if (result) {
    const location = window.roamAlphaAPI.ui.getFocusedBlock();
    const dataUid = result.getAttribute("data-uid");
    const order = getChildrenLengthByPageUid(blockUid);
    return createBlock({
      parentUid: blockUid,
      node: {
        text: `[](((${dataUid})))`,
      },
      order,
    })
      .then((uid) => {
        return window.roamAlphaAPI.ui.setBlockFocusAndSelection({
          location: { "block-uid": uid, "window-id": location["window-id"] },
          selection: { start: 1 },
        });
      })
      .then(() => addExcludedUid(dataUid));
  }
};

const navigateAction = ({ result }: ActionProps) => {
  if (result) {
    const dataUid = result.getAttribute("data-uid");
    return window.roamAlphaAPI.ui.mainWindow.openBlock({
      block: { uid: dataUid },
    });
  }
};

const actions: {
  content: string;
  icon: string;
  action: (a: ActionProps) => Promise<void>;
}[] = [
  { content: "Insert Alias", icon: "a", action: aliasAction },
  { content: "Insert Reference", icon: "r", action: referenceAction },
  { content: "Open In Sidebar", icon: "o", action: openInSidebarAction },
  { content: "Add As Child", icon: "c", action: addAsChildAction },
  { content: "Navigate To Block", icon: "n", action: navigateAction },
];

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
  const [isActionMode, _setIsActionMode] = useState(false);
  const actionModeRef = useRef(false);
  const setIsActionMode = useCallback(
    (k: boolean) => {
      actionModeRef.current = k;
      _setIsActionMode(k);
    },
    [_setIsActionMode, actionModeRef]
  );
  const cache = useMemo<{ [uid: string]: { text: string; uid: string }[] }>(
    () => ({}),
    []
  );
  const [excludedUids, _setExcludedUids] = useState(new Set(blockUid));
  const excludedUidsRef = useRef(excludedUids);
  const addExcludedUid = useCallback(
    (k: string) => {
      excludedUidsRef.current.add(k);
      _setExcludedUids(new Set(excludedUidsRef.current));
    },
    [_setExcludedUids, excludedUidsRef]
  );
  const [results, setResults] = useState([]);
  const [moreOptionsKey, _setMoreOptionsKey] = useState(0);
  const moreOptionsKeyRef = useRef(moreOptionsKey);
  const setMoreOptionsKey = useCallback(
    (k: number) => {
      moreOptionsKeyRef.current = k;
      _setMoreOptionsKey(k);
    },
    [_setMoreOptionsKey, moreOptionsKeyRef]
  );
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
      if (disabledRef.current) {
        if (
          frequency === "hotkey" &&
          isControl(e) &&
          (e.key === "m" || e.code === "KeyM") &&
          e.shiftKey
        ) {
          setDisabled(false);
          disabledRef.current = false;
          e.preventDefault();
          e.stopPropagation();
        }
      } else {
        if (isControl(e) && (e.key === "m" || e.code === "KeyM")) {
          if (!e.shiftKey) {
            setIsActionMode(!actionModeRef.current);
          } else {
            setDisabled(true);
            disabledRef.current = true;
          }
          setMoreOptionsKey(0);
          e.preventDefault();
          e.stopPropagation();
        } else if (actionModeRef.current) {
          const key = Number(e.key);
          if (!isNaN(key)) {
            const result = document.getElementById(
              "roamjs-smart-assistant-results"
            ).children[key - 1];
            if (isControl(e)) {
              setMoreOptionsKey(key);
            } else {
              aliasAction({
                textarea,
                blockUid,
                result,
                addExcludedUid,
              }).then(() => setIsActionMode(false));
            }
          } else if (moreOptionsKeyRef.current) {
            const action = actions.find(
              ({ icon }) =>
                e.key === icon || e.code === `Key${icon.toUpperCase()}`
            )?.action;
            if (action) {
              const result = document.getElementById(
                "roamjs-smart-assistant-results"
              ).children[moreOptionsKeyRef.current - 1];
              action({ textarea, blockUid, result, addExcludedUid }).then(() =>
                setIsActionMode(false)
              );
            }
          }
          e.preventDefault();
          e.stopPropagation();
        }
      }
    });
  }, [
    onChangeRef,
    textarea,
    setQuery,
    setIsActionMode,
    actionModeRef,
    excludedUidsRef,
    setMoreOptionsKey,
    moreOptionsKeyRef,
    blockUid,
    frequency,
    disabledRef,
    setDisabled,
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
          <h4>Related Blocks</h4>
          <h5>
            <i>
              {isActionMode
                ? `Hit the number to enter as an alias reference. Hit ${
                    isControl(new MouseEvent("click", { metaKey: true }))
                      ? "CMD"
                      : "CTRL"
                  }+ the number for more options`
                : `Hit ${
                    isControl(new MouseEvent("click", { metaKey: true }))
                      ? "CMD"
                      : "CTRL"
                  }+m to switch focus to this dialog`}
            </i>
          </h5>
          <div id={"roamjs-smart-assistant-results"}>
            {resultsInView.length
              ? resultsInView.map((r, i) => (
                  <>
                    <div
                      key={r.uid}
                      data-uid={r.uid}
                      style={{ display: "flex" }}
                    >
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
                    {isActionMode && moreOptionsKey === i + 1 && (
                      <div>
                        {actions.map((action) => (
                          <Tooltip
                            content={`${action.content} (${action.icon})`}
                          >
                            <Button
                              minimal
                              style={{ background: "#eeeeee", margin: "0 8px" }}
                              text={action.icon}
                              onClick={() =>
                                action.action({
                                  textarea,
                                  blockUid,
                                  addExcludedUid,
                                  result: document.getElementById(
                                    "roamjs-smart-assistant-results"
                                  ).children[i],
                                })
                              }
                            />
                          </Tooltip>
                        ))}
                      </div>
                    )}
                  </>
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
