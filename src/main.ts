import {
	Plugin,
	getLanguage,
} from "obsidian";
import { i18n } from './localization';
import { patchMenu } from "./patchMenu";
import { CMSettings, CMSettingTab, DEFAULT_SETTINGS } from "./settings";


export default class CalloutMenuPlugin extends Plugin {
	declare settings: CMSettings;
	uninstallCalloutMenuPatch!: () => void

	async onload() {
		await this.loadSettings();
		let locale = "en"
		if (getLanguage) {
			locale = getLanguage()
		} else {
			locale = window.localStorage.language
		}
    	i18n.setLocale(locale);
		
		patchMenu(this)
		this.addSettingTab(new CMSettingTab(this.app, this));
	}

	onunload() {
		this.uninstallCalloutMenuPatch()
	}

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

	
}




