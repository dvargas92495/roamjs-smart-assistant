import toConfig from "roamjs-components/util/toConfigPageName";
import runExtension from "roamjs-components/util/runExtension";
import getSubTree from "roamjs-components/util/getSubTree";
import toFlexRegex from "roamjs-components/util/toFlexRegex";
import getSettingIntFromTree from "roamjs-components/util/getSettingIntFromTree";
import getAllPageNames from "roamjs-components/queries/getAllPageNames";
import getBasicTreeByParentUid from "roamjs-components/queries/getBasicTreeByParentUid";
import getPageUidByPageTitle from "roamjs-components/queries/getPageUidByPageTitle";
import { createConfigObserver } from "roamjs-components/components/ConfigPage";
import { render as unlinkFinderRender } from "./components/UnlinkFinderLegend";
import addStyle from "roamjs-components/dom/addStyle";
import createHTMLObserver from "roamjs-components/dom/createHTMLObserver";
import getUids from "roamjs-components/dom/getUids";
import { PullBlock } from "roamjs-components/types";
import { render as smartPopupRender } from "./components/SmartPopup";

let unlinkFinderElementToLink = null;
let unlinkFinderBackdrop = null;
let unlinkFinderMenu = null;
let unlinkFinderMenuOptions = null;
let unlinkFinderMenuVisible = false;
addStyle(`#unlink-finder-legend {
  margin-left: 4px;
  border-style: groove;
}`);

const ID = "smart-assistant";
const CONFIG = toConfig(ID);
runExtension(ID, () => {
  const { pageUid } = createConfigObserver({
    title: CONFIG,
    config: {
      tabs: [
        {
          id: "unlink finder",
          fields: [
            {
              title: "minimum characters",
              type: "number",
              description:
                "Minimum number of characters to detect an unlink finder match",
            },
            {
              title: "alias case sensitive",
              type: "flag",
              description: "Whether alias matching should be case sensitive",
            },
          ],
        },
      ],
    },
  });
  window.roamAlphaAPI.ui.commandPalette.addCommand({
    label: "Open Unlink Finder",
    callback: () => {
      const unlinkFinderPages = getAllPageNames().sort(function (a, b) {
        return b.length - a.length;
      });
      const unlinkFinderAliases = Object.fromEntries(
        window.roamAlphaAPI
          .q(
            `[:find (pull ?parentPage [:node/title]) (pull ?referencingBlock [:block/string])
                :where [?referencedPage :node/title "Aliases"] 
                       [?referencingBlock :block/refs ?referencedPage]
                       [?referencingBlock :block/page ?parentPage]
               ]`
          )
          .map((p) => ({
            title: p[0].title as string,
            aliases: (p[1].string as string)
              .replace(/^Aliases::/, "")
              .split(",")
              .map((a) => a.trim())
              .filter((a) => !!a),
          }))
          .flatMap((p) => p.aliases.map((a) => [a, p.title]))
      );
      const config = getBasicTreeByParentUid(
        getPageUidByPageTitle("roam/js/discourse-graph")
      );
      const unlinkFinderConfig = getSubTree({
        tree: config,
        key: "unlink finder",
      }).children;
      const minimumPageLength = getSettingIntFromTree({
        tree: unlinkFinderConfig,
        key: "Minimum Characters",
        defaultValue: 2,
      });
      const aliasCaseSensitive = unlinkFinderConfig.some((t) =>
        toFlexRegex("Alias case sensitive").test(t.text)
      );
      if (!document.getElementById("unlink-finder-legend")) {
        unlinkFinderRender({
          minimumPageLength,
          aliasCaseSensitive,
        });
      }
    },
  });
  /*
  turn off unlink finder
        document
          .getElementById("unlink-finder-icon")
          .setAttribute("status", "off");
        removeUnlinkFinderLegend();
        removeUnlinkTargets();
        document.removeEventListener("blur", runUnlinkFinder, true);
        window.removeEventListener("locationchange", runUnlinkFinder, true);
        */
  // createCustomContextMenu();
  // unlinkFinderBackdrop = document.querySelector(
  //   ".unlink-finder-context-backdrop"
  // );
  // unlinkFinderMenu = document.querySelector(".unlink-finder-context-menu");
  // unlinkFinderMenuOptions = document.querySelectorAll(
  //   ".unlink-finder-context-menu-option"
  // );
  // setupUnlinkFinderContextMenu();
  const blocksWatched: {
    [uid: string]: {
      pattern: string;
      entityId: string;
      callback: (before: PullBlock, after: PullBlock) => void;
    };
  } = {};
  createHTMLObserver({
    tag: "TEXTAREA",
    className: "rm-block-input",
    callback: (t: HTMLTextAreaElement) => {
      const { blockUid } = getUids(t);
      if (!blocksWatched[blockUid]) {
        const pattern = "[:block/string]";
        const entityId = `[:block/uid "${blockUid}"]`;
        const injectBlockChanges = smartPopupRender({ t, blockUid });
        blocksWatched[blockUid] = {
          pattern,
          entityId,
          callback: (_, after) => {
            injectBlockChanges.current(after[":block/string"]);
          },
        };
        window.roamAlphaAPI.data.addPullWatch(
          pattern,
          entityId,
          blocksWatched[blockUid].callback
        );
      } else {
        console.log('im here already')
      }
    },
    removeCallback: (t: HTMLTextAreaElement) => {
      const { blockUid } = getUids(t);
      if (blocksWatched[blockUid]) {
        const { pattern, entityId, callback } = blocksWatched[blockUid];
        window.roamAlphaAPI.data.removePullWatch(pattern, entityId, callback);
        delete blocksWatched[blockUid];
      }
    },
  });
});
