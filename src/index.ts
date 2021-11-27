import { toConfig, runExtension, getAllPageNames } from "roam-client";
import { createConfigObserver } from "roamjs-components";

let unlinkFinderElementToLink = null;
let unlinkFinderBackdrop = null;
let unlinkFinderMenu = null;
let unlinkFinderMenuOptions = null;
let unlinkFinderMenuVisible = false;
const aliasWordMatchStyle = "rgba(125, 188, 255, 0.6)";
const exactWordMatchStyle = "rgba(71,151, 101, 0.4)";
const fuzzyWordMatchStyle = "rgba(220, 171, 121, 0.6)";
const partialWordMatchStyle = "rgba(229, 233, 236, 1.0)";
const redundantWordMatchStyle = "rgba(168, 42, 42, 0.4)";

const ID = "smart-assistant";
const CONFIG = toConfig(ID);
runExtension(ID, () => {
  createConfigObserver({ title: CONFIG, config: { tabs: [] } });
  window.roamAlphaAPI.ui.commandPalette.addCommand({
    label: "Open Unlink Finder",
    callback: () => {
      const unlinkFinderPages = getAllPageNames().sort(function (a, b) {
        return b.length - a.length;
      });
      console.log(unlinkFinderPages.length)
      /*
      unlinkFinderAliases = getAllAliases();
      unlinkFinderConfig = getConfigFromPage("Unlink Finder");
      if (unlinkFinderConfig["Minimum Characters"]) {
        minimumPageLength = parseInt(unlinkFinderConfig["Minimum Characters"]);
      } else {
        minimumPageLength = 2;
      }
      if (unlinkFinderConfig["Alias Case-Sensitive"] == "Y") {
        aliasCaseSensitive = true;
      } else {
        aliasCaseSensitive = false;
      }
      matchFound = false;

      if (
        document.getElementById("unlink-finder-icon").getAttribute("status") ==
        "off"
      ) {
        document
          .getElementById("unlink-finder-icon")
          .setAttribute("status", "on");
        addUnlinkFinderLegend();
        reAddUnlinkTargets();
        do {
          let blocks = document.getElementsByClassName("roam-block");
          matchFound = findTargetNodes(
            blocks,
            unlinkFinderPages,
            unlinkFinderAliases
          );
        } while (matchFound == true);
        document.addEventListener("blur", runUnlinkFinder, true);
        window.addEventListener("locationchange", runUnlinkFinder, true);
        addContextMenuListener();
      } else {
        document
          .getElementById("unlink-finder-icon")
          .setAttribute("status", "off");
        removeUnlinkFinderLegend();
        removeUnlinkTargets();
        document.removeEventListener("blur", runUnlinkFinder, true);
        window.removeEventListener("locationchange", runUnlinkFinder, true);
      }
      */
    },
  });
  // createCustomContextMenu();
  // unlinkFinderBackdrop = document.querySelector(
  //   ".unlink-finder-context-backdrop"
  // );
  // unlinkFinderMenu = document.querySelector(".unlink-finder-context-menu");
  // unlinkFinderMenuOptions = document.querySelectorAll(
  //   ".unlink-finder-context-menu-option"
  // );
  // setupUnlinkFinderContextMenu();
});
