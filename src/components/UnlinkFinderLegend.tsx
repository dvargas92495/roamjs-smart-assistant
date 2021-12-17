import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import createBlockObserver from "roamjs-components/dom/createBlockObserver";

const aliasWordMatchStyle = "rgba(125, 188, 255, 0.6)";
const exactWordMatchStyle = "rgba(71,151, 101, 0.4)";
const fuzzyWordMatchStyle = "rgba(220, 171, 121, 0.6)";
const partialWordMatchStyle = "rgba(229, 233, 236, 1.0)";
const redundantWordMatchStyle = "rgba(168, 42, 42, 0.4)";

const LegendElement = ({
  matchType,
  matchStyle,
  matchText,
}: {
  matchType: string;
  matchStyle: string;
  matchText: string;
}) => {
  useEffect(() => {
    document
      .querySelectorAll<HTMLElement>(`${matchType}-inactive`)
      .forEach((el) => {
        el.classList.remove(`${matchType}-inactive`);
        el.classList.add(matchType);
        el.style.position = `relative`;
        el.style.background = matchStyle;
      });
  }, [matchType, matchStyle]);
  return (
    <span
      className={`unlink-finder-legend unlink-finder ${matchType}`}
      data-text="Actual Page Name"
      style={{ marginRight: 4, position: "relative", background: matchStyle }}
    >
      {matchText}
    </span>
  );
};

const textNodesUnder = (inputNode: Node) => {
  let all: Node[] = [];
  for (let node = inputNode.firstChild; node; node = node.nextSibling) {
    const el = node as HTMLElement;
    if (node.nodeType === 3) all.push(node);
    else if (
      el.hasAttribute("data-link-title") ||
      el.hasAttribute("data-tag") ||
      el.hasAttribute("recommend")
    )
      all = all.concat(textNodesUnder(node));
  }
  return all;
};

type Props = {
  minimumPageLength: number;
  aliasCaseSensitive: boolean;
};

const UnlinkFinderLegend = ({
  minimumPageLength,
  aliasCaseSensitive,
}: Props) => {
  useEffect(() => {
    const [obs] = createBlockObserver((b) => {
      const textNodes = textNodesUnder(b);
      console.log(textNodes.length);
      // textNodes.forEach(spanWrapper)
      // addContextMenuListener();
    });
    return () => obs.disconnect();
  });
  return (
    <>
      <span
        className="unlink-finder-legend unlink-finder"
        style={{ margin: "0 4px" }}
      >
        Match Types:{" "}
      </span>
      <LegendElement
        matchType="alias-word-match"
        matchStyle={aliasWordMatchStyle}
        matchText="Alias"
      />
      <LegendElement
        matchType="exact-word-match"
        matchStyle={exactWordMatchStyle}
        matchText="Exact"
      />
      <LegendElement
        matchType="fuzzy-word-match"
        matchStyle={fuzzyWordMatchStyle}
        matchText="Fuzzy"
      />
      <LegendElement
        matchType="partial-word-match"
        matchStyle={partialWordMatchStyle}
        matchText="Partial"
      />
      <LegendElement
        matchType="redundant-word-match"
        matchStyle={redundantWordMatchStyle}
        matchText="Redundant"
      />
    </>
  );
};

export const render = (props: Props) => {
  const unlinkFinderLegend = document.createElement("div");
  unlinkFinderLegend.classList.add("unlink-finder-legend");
  unlinkFinderLegend.id = "unlink-finder-legend";
  const roamTopbar = document.querySelector(".rm-topbar");
  roamTopbar.insertBefore(unlinkFinderLegend, roamTopbar.childNodes[2]);
  ReactDOM.render(<UnlinkFinderLegend {...props} />, unlinkFinderLegend);
};

export default UnlinkFinderLegend;
