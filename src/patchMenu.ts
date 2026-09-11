import { Menu, MenuItem, Platform } from 'obsidian';
import { around, dedupe } from "monkey-around";
import CalloutMenuPlugin from './main';
import { i18n } from './localization';
import { Suggest } from './suggestModal';


export const patchMenu = async (plugin: CalloutMenuPlugin) => {
  plugin.uninstallCalloutMenuPatch = around(Menu.prototype, {
    showAtMouseEvent(old) {
      return dedupe("cm-patch-menu-around-key", old, function(...args) {
		const e = args[0]
		const target = e.target as HTMLElement

        if (target.closest(".cm-callout")) {
            editCalloutMenu(plugin, this, target)

        }
        
        return old && old.apply(this, args)
      })
    }    
  })
}



const calloutSuggester = async (plugin: CalloutMenuPlugin, values: string[]) => {
    const placeholder = i18n.t("calloutTypePlaceholder");
    const data = new Promise((resolve, reject) => {
        new Suggest(plugin.app, resolve, reject, values, placeholder).open();
    });
    return data;
}


const editCalloutMenu = async (plugin: CalloutMenuPlugin, menu: Menu, target: HTMLElement) => {
    //@ts-ignore
    menu?.dom?.classList.add("callout-menu")

    //@ts-ignore
    delete menu.submenuConfigs["type"]
    //@ts-ignore
    menu.items = menu.items.filter(item => {
        return item.section != "type"
    })
        

    const calloutEl = target.closest(".cm-callout") as any
    const callout = calloutEl.querySelector(".callout") as HTMLElement
    const link = target.closest("a") as HTMLAnchorElement

    const calloutNames = plugin.settings.types
        .split(",")
        .map((m) => m.trim());
    const calloutMetadata = plugin.settings.metaTypes
        .split(",")
        .map((m) => m.trim());
    const calloutNamesDafault = [
        "note",
        "info",
        "important",
        "tip",
        "success",
        "question",
        "warning",
        "example",
        "quote",
        "abstract",
        "summary",
        "tldr",
        "todo",
        "hint",
        "check",
        "done",
        "question",
        "faq",
        "help",
        "caution",
        "attention",
        "failure",
        "fail",
        "missing",
        "danger",
        "error",
        "bug",
        "example",
        "cite",
    ];

    const calloutClasses = callout.classList;

    const fold =
        callout.getAttribute(
            "data-callout-fold"
        );
    const widget = (calloutEl.cmTile?.widget ?? calloutEl.cmView?.widget) as any;
    const editor = widget.editor.editor;
    const lineNumStart = editor.offsetToPos(widget.start).line;
    const lineNumEnd = editor.offsetToPos(widget.end).line;
    const line = editor.getLine(lineNumStart);

    const lines: string[] = [];
    for (let l = lineNumStart; l <= lineNumEnd; l++) {
        lines.push(l);
    }

    const calloutDef = line.replace(/(.*?])(.*)/, "$1");
    const calloutType = widget
        .getType()
        .replace(/([^|]+)(.*)/, "$1");
    const addingMetadata = [...calloutMetadata];

    const existingMetadata = calloutMetadata.filter(
        (m) =>
            calloutDef.includes("|" + m + "|") ||
            calloutDef.includes("|" + m + "]")
    );
    const notExistingMetadata = addingMetadata.filter(
        (m) =>
            !calloutDef.includes("|" + m + "|") &&
            !calloutDef.includes("|" + m + "]")
    );


    menu.addItem((item: MenuItem) => item
    .setTitle(i18n.t("copyContent"))
    .setSection('edit')
    .onClick(() => {
        lines.shift()
        let content = ""
        for (const l of lines) {
            const line = editor.getLine(l);
            let newLine = line.replace(">", "");
            newLine = newLine.replace(/^ /, "");
            content += newLine + "\n"
        }
        content = content.trim()
        navigator.clipboard.writeText(content)
    }))


    if (link && link.className){
        if (link.className.includes("internal-link")) {		
            menu.addItem((item) =>
                item.setTitle(i18n.t("copyLinkPath"))
                .setSection('clipboard')
                .onClick(() => {
                    const linkPath = link.getAttribute("data-href") || ""
                    navigator.clipboard.writeText(linkPath)
                })
            );
        }
    }


    if (calloutClasses.contains("is-collapsible") && fold == "-") {
        menu.addItem((item) => {
            item.setTitle(i18n.t("expanded"))
                .setIcon("plus")
                .setSection('collapse')
                .onClick(() => {
                    editor.setLine(
                        lineNumStart,
                        line.replace("]-", "]+")
                    );
                });
        });
        menu.addItem((item) => {
            item.setTitle(i18n.t("removeCollapsing"))
                .setIcon("x")
                .setSection('collapse')
                .onClick(() => {
                    editor.setLine(
                        lineNumStart,
                        line.replace("]-", "]")
                    );
                });
        });
    } else if (
        calloutClasses.contains("is-collapsible") &&
        fold == "+"
    ) {
        menu.addItem((item) => {
            item.setTitle(i18n.t("collapsed"))
                .setIcon("minus")
                .setSection('collapse')
                .onClick(() => {
                    editor.setLine(
                        lineNumStart,
                        line.replace("]+", "]-")
                    );
                });
        });
        menu.addItem((item) => {
            item.setTitle(i18n.t("removeCollapsing"))
                .setIcon("x")
                .setSection('collapse')
                .onClick(() => {
                    editor.setLine(
                        lineNumStart,
                        line.replace("]+", "]")
                    );
                });
        });
    } else {
        menu.addItem((item) => {
            item.setTitle(i18n.t("collapsed"))
                .setIcon("minus")
                .setSection('collapse')
                .onClick(() => {
                    editor.setLine(
                        lineNumStart,
                        line.replace("]", "]-")
                    );
                });
        });
        menu.addItem((item) => {
            item.setTitle(i18n.t("expanded"))
                .setIcon("plus")
                .setSection('collapse')
                .onClick(() => {
                    editor.setLine(
                        lineNumStart,
                        line.replace("]", "]+")
                    );
                });
        });
    }




    if (Platform.isMobile) {
        for (const calloutName of calloutNames) {

            const title =
                calloutName[0].toUpperCase() +
                calloutName
                    .slice(1, calloutName.length)
                    .replace("|", " | ");

            menu.addItem((item) => {
                item.setTitle(title)
                    .setSection("custom-type")
                    .onClick(() => {
                        calloutEl.cmTile?.widget?.updateType(calloutName);
                    })
                    .setChecked(calloutType == calloutName);
            });
        }

        menu.addSeparator()

        if (notExistingMetadata.length > 0) {
            for (const metaName of notExistingMetadata) {
                const title =
                    metaName[0].toUpperCase() +
                    metaName
                        .slice(1, metaName.length)
                        .replace("|", " | ");
                menu.addItem((item) => {
                    item.setTitle(title)
                        .setSection("custom-type-metadata")
                        .setIcon("plus")
                        .onClick(() => {
                            editor.setLine(
                                lineNumStart,
                                line.replace("]", "|" + metaName + "]")
                            );
                        });
                });
            }
        }

        

        if (existingMetadata.length > 0) {
            for (const metaName of existingMetadata) {
                const title =
                    metaName[0].toUpperCase() +
                    metaName
                        .slice(1, metaName.length)
                        .replace("|", " | ");
                        
                menu.addItem((item) => {
                    item.setTitle(title)
                        .setSection("custom-type-metadata")
                        .setIcon("minus")
                        .onClick(() => {
                            editor.setLine(
                                lineNumStart,
                                line.replace("|" + metaName, "")
                            );
                        });
                });
            }
        }

    } else {
        menu.addItem((item) => {
            item.setTitle(i18n.t("calloutType"))
            .setSection('custom-type')
            //@ts-ignore
            const sub = item.setSubmenu();
            sub.dom.classList.add("callout-menu");
            for (const calloutName of calloutNames) {
                sub.addItem((item: MenuItem) => {
                    const title =
                        calloutName[0].toUpperCase() +
                        calloutName
                            .slice(1, calloutName.length)
                            .replace("|", " | ");
                    item.setTitle(title)
                        .onClick(() => {
                            calloutEl.cmTile?.widget?.updateType(
                                calloutName
                            );
                        })
                        .setChecked(calloutType == calloutName);
                });
            }

            sub.addItem((item: MenuItem) => {
                const title = i18n.t("other");
                item.setTitle(title).onClick(async () => {
                    
                    const defCalloutName = await calloutSuggester(
                        plugin,
                        calloutNamesDafault
                    );
                    calloutEl.cmTile?.widget?.updateType(defCalloutName);
                });
            });

            
        });

        if (notExistingMetadata.length > 0) {
            menu.addItem((item) => {
                item.setTitle(i18n.t("addMetadata"))
                .setSection('custom-type')
                //@ts-ignore
                const sub = item.setSubmenu();
                sub.dom.classList.add("callout-menu");
                for (const metaName of notExistingMetadata) {
                    sub.addItem((item: MenuItem) => {
                        const title =
                            metaName[0].toUpperCase() +
                            metaName
                                .slice(1, metaName.length)
                                .replace("|", " | ");
                        item.setTitle(title).onClick(() => {
                            editor.setLine(
                                lineNumStart,
                                line.replace("]", "|" + metaName + "]")
                            );
                        });
                    });
                }
            });
        }

        if (existingMetadata.length > 0) {
            menu.addItem((item) => {
                item.setTitle(i18n.t("removeMetadata"))
                .setSection('custom-type')
                //@ts-ignore
                const sub = item.setSubmenu();
                sub.dom.classList.add("callout-menu");
                for (const metaName of existingMetadata) {
                    sub.addItem((item: MenuItem) => {
                        const title =
                            metaName[0].toUpperCase() +
                            metaName
                                .slice(1, metaName.length)
                                .replace("|", " | ");
                        item.setTitle(title).onClick(() => {
                            editor.setLine(
                                lineNumStart,
                                line.replace("|" + metaName, "")
                            );
                        });
                    });
                }
            });
        }
    }


    menu.addItem((item) =>
        item
            .setTitle(i18n.t("clearFormatting"))
            .setIcon("eraser")
            .setSection("clear")
            .onClick(() => {
                for (const l of lines) {
                    const line = editor.getLine(l);
                    let newLine = line.replace(">", "");
                    if (l == lineNumStart) {
                        newLine = newLine
                            .replace("]+", "]")
                            .replace("]-", "]")
                            .replace(/(\[.*?\])(.*)/, "$2")
                            .replace(/^ /, "");
                    }
                    newLine = newLine.replace(/^ /, "");
                    editor.setLine(l, newLine);
                }
            })
    );





}
