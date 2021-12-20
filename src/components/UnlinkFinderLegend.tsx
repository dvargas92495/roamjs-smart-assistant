import React, { useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import createBlockObserver from "roamjs-components/dom/createBlockObserver";
import { Button } from "@blueprintjs/core";
import addStyle from "roamjs-components/dom/addStyle";

addStyle(`.alias-word-match {
  position: relative;
  background: rgba(125, 188, 255, 0.6);
}
.exact-word-match { 
  position: relative;
  background: rgba(71,151, 101, 0.4);
}
.fuzzy-word-match {
  position: relative;
  background: rgba(220, 171, 121, 0.6);
}

.partial-word-match { 
  position: relative;
  background: rgba(229, 233, 236, 1.0);
}

.redundant-word-match { 
  position: relative;
  background: rgba(168, 42, 42, 0.4);
}
`);

const LegendElement = ({ matchType }: { matchType: string }) => {
  const matchClass = useMemo(
    () => `${matchType.toLowerCase()}-word-match`,
    [matchType]
  );
  useEffect(() => {
    document
      .querySelectorAll<HTMLElement>(`${matchClass}-inactive`)
      .forEach((el) => {
        el.classList.remove(`${matchClass}-inactive`);
        el.classList.add(matchClass);
      });
    return () => {
      document.querySelectorAll<HTMLElement>(matchClass).forEach((el) => {
        el.classList.add(`${matchClass}-inactive`);
        el.classList.remove(matchClass);
      });
    };
  }, [matchClass]);
  return (
    <span
      className={`unlink-finder-legend unlink-finder ${matchClass}`}
      data-text="Actual Page Name"
      style={{ marginRight: 4 }}
    >
      {matchType}
    </span>
  );
};

const textNodesUnder = (inputNode: Node) => {
  let all: Node[] = [];
  for (let node = inputNode.firstChild; node; node = node.nextSibling) {
    const el = node as HTMLElement;
    if (node.nodeType === 3) all.push(node);
    else if (
      !(
        el.hasAttribute("data-link-title") ||
        el.hasAttribute("data-tag") ||
        el.hasAttribute("recommend")
      )
    )
      all = all.concat(textNodesUnder(node));
  }
  return all;
};

const pageTaggedInParent = (node: Node, page: string) => {
  let parent = node.parentElement;
  while (parent.classList.contains("roam-article") == false) {
    parent = parent.parentElement;
    if (parent.hasAttribute("data-page-links")) {
      const linkedPages = JSON.parse(parent.getAttribute("data-page-links"));
      if (linkedPages.includes(page)) {
        return true;
      }
    }
  }
  return false;
};

type Props = {
  minimumPageLength: number;
  aliasCaseSensitive: boolean;
  pages: { title: string; uid: string }[];
  aliases: Record<string, string>;
};

const UnlinkFinderLegend = ({
  minimumPageLength,
  aliasCaseSensitive,
  aliases,
  pages,
}: Props) => {
  const flags = aliasCaseSensitive ? "" : "i";
  useEffect(() => {
    const [obs] = createBlockObserver((b) => {
      const textNodes = textNodesUnder(b);
      textNodes.forEach((node) => {
        try {
          Object.entries(aliases)
            .filter(([key]) =>
              /^\w+$/.test(key)
                ? new RegExp(`(^|[^-])\\b${key}\\b($|[^-])`, flags).test(
                    node.textContent
                  )
                : new RegExp(key, flags).test(node.textContent)
            )
            .forEach(([key, value]) => {
              const start = node.textContent
                .toLowerCase()
                .indexOf(key.toLowerCase());
              const end = start + key.length;
              const beforeLinkText = node.textContent.slice(0, start);
              const linkText = node.textContent.slice(start, end);
              const afterLinkText = node.textContent.slice(end);
              // create span with page name
              var matchSpan = document.createElement("span");
              matchSpan.classList.add("unlink-finder");
              matchSpan.setAttribute("data-text", value);
              matchSpan.classList.add("alias-word-match");
              matchSpan.setAttribute("recommend", "underline");
              matchSpan.innerText = linkText;
              // truncate existing text node
              node.textContent = beforeLinkText;
              // add that span after the text node
              node.parentNode.insertBefore(matchSpan, node.nextSibling);
              // create a text node with the remainder text
              const remainderText = document.createTextNode(afterLinkText);
              // add that remainder text after inserted node
              node.parentNode.insertBefore(
                remainderText,
                node.nextSibling.nextSibling
              );
            });
          pages
            .filter(
              ({ title }) =>
                title.length < minimumPageLength &&
                node.textContent.toLowerCase().includes(title.toLowerCase())
            )
            .forEach((page) => {
              const start = node.textContent
                .toLowerCase()
                .indexOf(page.title.toLowerCase());
              const end = start + page.title.length;
              const beforeLinkText = node.textContent.slice(0, start);
              const firstCharBeforeMatch = node.textContent.slice(start - 1)[0];
              const firstCharAfterMatch = node.textContent
                .slice(start)
                .substr(page.title.length)[0];
              const linkText = node.textContent.slice(start, end);
              const afterLinkText = node.textContent.slice(end);
              // create span with page name
              const matchSpan = document.createElement("span");
              matchSpan.classList.add("unlink-finder");
              matchSpan.classList.add("exact-word-match");
              matchSpan.setAttribute("recommend", "underline");
              matchSpan.setAttribute("data-text", page.title);
              if (linkText != page.title) {
                matchSpan.classList.add("fuzzy-word-match");
                matchSpan.classList.remove("exact-word-match");
              }
              if (
                (![
                  ".",
                  " ",
                  ",",
                  "!",
                  "?",
                  "_",
                  "/",
                  ":",
                  ";",
                  "'",
                  '"',
                  "@",
                  ")",
                  "(",
                  "{",
                  "}",
                  "[",
                  "]",
                  "^",
                  "*",
                  "#",
                ].includes(firstCharAfterMatch) &&
                  end != node.textContent.length) ||
                (![
                  ".",
                  " ",
                  ",",
                  "!",
                  "?",
                  "_",
                  "/",
                  ":",
                  ";",
                  "'",
                  '"',
                  "@",
                  ")",
                  "(",
                  "{",
                  "}",
                  "[",
                  "]",
                  "^",
                  "*",
                  "#",
                ].includes(firstCharBeforeMatch) &&
                  start != 0)
              ) {
                matchSpan.classList.add("partial-word-match");
                matchSpan.classList.remove("exact-word-match");
              }
              if (pageTaggedInParent(node, page.title) == true) {
                matchSpan.classList.add("redundant-word-match");
                matchSpan.classList.remove("exact-word-match");
              }
              matchSpan.innerText = linkText;
              // truncate existing text node
              node.textContent = beforeLinkText;
              // add that span after the text node
              node.parentNode.insertBefore(matchSpan, node.nextSibling);
              // create a text node with the remainder text
              const remainderText = document.createTextNode(afterLinkText);
              // add that remainder text after inserted node
              node.parentNode.insertBefore(
                remainderText,
                node.nextSibling.nextSibling
              );
            });
        } catch (err) {
          return false;
        }
      });
      // addContextMenuListener();
    });
    return () => obs.disconnect();
  }, []);
  return (
    <>
      <span
        className="unlink-finder-legend unlink-finder"
        style={{ margin: "0 4px" }}
      >
        Match Types:{" "}
      </span>
      <LegendElement matchType="Alias" />
      <LegendElement matchType="Exact" />
      <LegendElement matchType="Fuzzy" />
      <LegendElement matchType="Partial" />
      <LegendElement matchType="Redundant" />
      <Button
        icon={"cross"}
        minimal
        onClick={() => {
          const root = document.getElementById("unlink-finder-legend");
          ReactDOM.unmountComponentAtNode(root);
          root.remove();
        }}
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
