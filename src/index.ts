import toConfig from "roamjs-components/util/toConfigPageName";
import runExtension from "roamjs-components/util/runExtension";
import { createConfigObserver } from "roamjs-components/components/ConfigPage";
import addStyle from "roamjs-components/dom/addStyle";
import createHTMLObserver from "roamjs-components/dom/createHTMLObserver";
import getUids from "roamjs-components/dom/getUids";
import { PullBlock } from "roamjs-components/types";
import { render as smartPopupRender } from "./components/SmartPopup";
import getSubTree from "roamjs-components/util/getSubTree";
import getSettingIntFromTree from "roamjs-components/util/getSettingIntFromTree";

addStyle(`#unlink-finder-legend {
  margin-left: 4px;
  border-style: groove;
}`);

const ID = "smart-assistant";
const CONFIG = toConfig(ID);
runExtension(ID, () => {
  createConfigObserver({
    title: CONFIG,
    config: {
      tabs: [
        {
          id: "smart popup",
          fields: [
            {
              title: "results per page",
              type: "number",
              description: "Number of results that appear per page",
              defaultValue: 5,
            },
          ],
        },
      ],
    },
  }).then(({ pageUid }) => {
    const smartPopupConfig = getSubTree({
      parentUid: pageUid,
      key: "smart popup",
    }).children;
    const resultsPerPage = getSettingIntFromTree({
      tree: smartPopupConfig,
      key: "results per page",
      defaultValue: 5,
    });
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
          const injectBlockChanges = smartPopupRender({
            textarea: t,
            blockUid,
            resultsPerPage,
          });
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
          console.log("im here already");
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
});
