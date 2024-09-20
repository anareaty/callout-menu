import {
	App,
	Plugin,
	PluginSettingTab,
	FuzzySuggestModal,
	FuzzyMatch,
	Setting,
	Menu,
	MenuItem,
	Platform
} from "obsidian";

const LocaleMap: any = {
	edit: {
		en: "Edit",
		ru: "Редактировать",
	},
	collapsed: {
		en: "Collapsed by default",
		ru: "Свёрнутый по умолчанию",
	},
	expanded: {
		en: "Expanded by default",
		ru: "Развёрнутый по умолчанию",
	},
	removeCollapsing: {
		en: "Remove collapsing",
		ru: "Убрать сворачивание",
	},
	calloutType: {
		en: "Callout type",
		ru: "Тип выносного блока",
	},
	other: {
		en: "Other...",
		ru: "Другие...",
	},
	calloutTypePlaceholder: {
		en: "Callout type...",
		ru: "Введите тип выносного блока...",
	},
	addMetadata: {
		en: "Add callout metadata",
		ru: "Добавить метаданные",
	},
	removeMetadata: {
		en: "Remove callout metadata",
		ru: "Удалить метаданные",
	},
	clearFormatting: {
		en: "Clear formatting",
		ru: "Очистить форматирование",
	},
	calloutTypes: {
		en: "Callout types",
		ru: "Типы выносных блоков",
	},
	calloutTypesDesc: {
		en: "Write a list of callout types (separated by commas) that should appear in context menu.",
		ru: "Введите список типов выносных блоков, которые будут отображаться в контекстном меню (через запятую).",
	},
	metadataTypes: {
		en: "Callout metadata types",
		ru: "Типы метаданных для выносных блоков",
	},
	metadataTypesDesc: {
		en: "Write a list of callout metadata types (separated by commas) that should appear in context menu.",
		ru: "Введите список типов метаданных для выносных блоков, которые будут отображаться в контекстном меню (через запятую).",
	},
};

interface CMSettings {
	types: string;
	metaTypes: string;
}

const DEFAULT_SETTINGS: CMSettings = {
	types: "note, info, tip",
	metaTypes: "no-icon, no-title",
};

export default class CalloutMenuPlugin extends Plugin {
	settings: CMSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new CMSettingTab(this.app, this));

		this.registerDomEvent(document, "mouseup", (e: MouseEvent) => {
			if (e.button == 2) {
				this.createCalloutMenu(e);
			}
		});

		let timer: any;
		this.registerDomEvent(document, "touchstart", (e: TouchEvent) => {
			timer = setTimeout(() => {
				timer = null;
				this.createCalloutMenu(e)
			}, 500);
		});
		this.registerDomEvent(document, "touchend", (e: TouchEvent) => {
			clearTimeout(timer);
		});
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	getPath(e: any) {
		const getPathFromNode: any = (node: Node) => {
			const getIndex = (node: Node) => {
				const parent = node.parentElement || node.parentNode;
				let i = -1;
				let child;
				while (parent && (child = parent.childNodes[++i]))
					if (child == node) return i;
				return -1;
			};
			let parent,
				path = [];
			const index = getIndex(node);
			(parent = node.parentElement || node.parentNode) &&
				(path = getPathFromNode(parent));
			index > -1 && path.push(node);
			return path;
		};

		let path = e.path;
		if (!path) {
			path = e.composedPath();
		}
		if (!path || path.length == 0) {
			path = getPathFromNode(e.target);
		}
		return path;
	}

	createCalloutMenu(e: Event) {
		const calloutNames = this.settings.types
			.split(",")
			.map((m) => m.trim());
		const calloutMetadata = this.settings.metaTypes
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

		const path = this.getPath(e);
		const calloutEl = path.find(
			(el: Element) => el.classList && el.classList.contains("cm-callout")
		);

		if (calloutEl) {
			const calloutClasses = calloutEl.children[0].children[0].classList;
			const fold =
				calloutEl.children[0].children[0].getAttribute(
					"data-callout-fold"
				);
			const widget = calloutEl.cmView.widget;
			const editor = widget.editor.editor;
			const lineNumStart = editor.offsetToPos(widget.start).line;
			const lineNumEnd = editor.offsetToPos(widget.end).line;
			const line = editor.getLine(lineNumStart);

			const lines: string[] = [];
			for (let l = lineNumStart; l <= lineNumEnd; l++) {
				lines.push(l);
			}

			const calloutDef = line.replace(/(.*?])(.*)/, "$1");
			const calloutType = calloutEl.cmView.widget
				.getType()
				.replace(/([^|]+)(.*)/, "$1");
			let addingMetadata = [...calloutMetadata];

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

			const menu = new Menu();

			menu.addItem((item) =>
				item.setTitle(this.getLocalStrings().edit).onClick(() => {
					(e.target as HTMLElement).click();
				})
			);

			menu.addSeparator();

			// Добавить или убрать сворачивание
			if (calloutClasses.contains("is-collapsible") && fold == "-") {
				menu.addItem((item) => {
					item.setTitle(this.getLocalStrings().expanded)
						.setIcon("plus")
						.onClick(() => {
							editor.setLine(
								lineNumStart,
								line.replace("]-", "]+")
							);
						});
				});
				menu.addItem((item) => {
					item.setTitle(this.getLocalStrings().removeCollapsing)
						.setIcon("x")
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
					item.setTitle(this.getLocalStrings().collapsed)
						.setIcon("minus")
						.onClick(() => {
							editor.setLine(
								lineNumStart,
								line.replace("]+", "]-")
							);
						});
				});
				menu.addItem((item) => {
					item.setTitle(this.getLocalStrings().removeCollapsing)
						.setIcon("x")
						.onClick(() => {
							editor.setLine(
								lineNumStart,
								line.replace("]+", "]")
							);
						});
				});
			} else {
				menu.addItem((item) => {
					item.setTitle(this.getLocalStrings().collapsed)
						.setIcon("minus")
						.onClick(() => {
							editor.setLine(
								lineNumStart,
								line.replace("]", "]-")
							);
						});
				});
				menu.addItem((item) => {
					item.setTitle(this.getLocalStrings().expanded)
						.setIcon("plus")
						.onClick(() => {
							editor.setLine(
								lineNumStart,
								line.replace("]", "]+")
							);
						});
				});
			}

			menu.addSeparator();
			if (Platform.isMobile) {
				for (const calloutName of calloutNames) {
					menu.addItem((item) => {
						const title =
							calloutName[0].toUpperCase() +
							calloutName
								.slice(1, calloutName.length)
								.replace("|", " | ");
						item.setTitle(title)
							.onClick(() => {
								calloutEl.cmView.widget.updateType(calloutName);
							})
							.setChecked(calloutType == calloutName);
					});
				}

				menu.addItem((item) => {
					const title = this.getLocalStrings().other;
					item.setTitle(title).onClick(async () => {
						const defCalloutName = await this.calloutSuggester(
							calloutNamesDafault
						);
						calloutEl.cmView.widget.updateType(defCalloutName);
					});
				});

				menu.addSeparator();

				if (notExistingMetadata.length > 0) {
					for (const metaName of notExistingMetadata) {
						menu.addItem((item) => {
							const title =
								metaName[0].toUpperCase() +
								metaName
									.slice(1, metaName.length)
									.replace("|", " | ");
							item.setTitle(title)
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

				menu.addSeparator();

				if (existingMetadata.length > 0) {
					for (const metaName of existingMetadata) {
						menu.addItem((item) => {
							const title =
								metaName[0].toUpperCase() +
								metaName
									.slice(1, metaName.length)
									.replace("|", " | ");
							item.setTitle(title)
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
					item.setTitle(this.getLocalStrings().calloutType);
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
									calloutEl.cmView.widget.updateType(
										calloutName
									);
								})
								.setChecked(calloutType == calloutName);
						});
					}

					sub.addItem((item: MenuItem) => {
						const title = this.getLocalStrings().other;
						item.setTitle(title).onClick(async () => {
							const defCalloutName = await this.calloutSuggester(
								calloutNamesDafault
							);
							calloutEl.cmView.widget.updateType(defCalloutName);
						});
					});
				});

				if (notExistingMetadata.length > 0) {
					menu.addItem((item) => {
						item.setTitle(this.getLocalStrings().addMetadata);
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
						item.setTitle(this.getLocalStrings().removeMetadata);
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

			menu.addSeparator();

			menu.addItem((item) =>
				item
					.setTitle(this.getLocalStrings().clearFormatting)
					.setIcon("eraser")
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

			menu.showAtMouseEvent(e as MouseEvent);
			//@ts-ignore
			menu.dom.classList.add("callout-menu");

			setTimeout(() => {
				const oldMenu = document.querySelectorAll(
					".menu:not(.callout-menu)"
				);
				oldMenu.forEach((menu) => {
					if (menu.parentNode) {
						menu.parentNode.removeChild(menu);
					}
				});
			}, 10);
		}
	}

	async calloutSuggester(values: string[]) {
		const placeholder = this.getLocalStrings().calloutTypePlaceholder;
		const data = new Promise((resolve, reject) => {
			new Suggest(this.app, resolve, reject, values, placeholder).open();
		});
		return data;
	}

	getLocalStrings() {
		const lang: string = window.localStorage.getItem("language") ?? "en";
		const localStrings = { ...LocaleMap };
		for (const key in localStrings) {
			const stringValues = localStrings[key];
			localStrings[key] = stringValues[lang] ?? stringValues["en"];
		}
		return localStrings;
	}
}

class Suggest extends FuzzySuggestModal<string> {
	resolve: any;
	reject: any;
	values: string[];
	placeholder: string;
	constructor(
		app: App,
		resolve: any,
		reject: any,
		values: string[],
		placeholder: string
	) {
		super(app);
		this.resolve = resolve;
		this.reject = reject;
		this.values = values;
		this.placeholder = placeholder;
	}
	getItems() {
		return this.values;
	}
	getItemText(val: string) {
		this.setPlaceholder(this.placeholder);
		return val;
	}
	renderSuggestion(val: FuzzyMatch<string>, el: Element) {
		const text = val.item;
		el.createEl("div", { text: text });
	}
	onChooseItem(val: string) {
		this.resolve(val);
	}
}

class CMSettingTab extends PluginSettingTab {
	plugin: CalloutMenuPlugin;

	constructor(app: App, plugin: CalloutMenuPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName(this.plugin.getLocalStrings().calloutTypes)
			.setDesc(this.plugin.getLocalStrings().calloutTypesDesc)
			.addTextArea((text) =>
				text
					.setValue(this.plugin.settings.types)
					.onChange(async (value) => {
						this.plugin.settings.types = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(this.plugin.getLocalStrings().metadataTypes)
			.setDesc(this.plugin.getLocalStrings().metadataTypesDesc)
			.addTextArea((text) =>
				text
					.setValue(this.plugin.settings.metaTypes)
					.onChange(async (value) => {
						this.plugin.settings.metaTypes = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
