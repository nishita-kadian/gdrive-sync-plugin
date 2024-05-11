import { file } from 'googleapis/build/src/apis/file';
import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Scope, Setting } from 'obsidian';
import {Plugin, PluginSettingTab, App, Setting} from 'obsidian';

const fs = require('fs');
const { google} = require('googleapis');

const apikeys = require('apikey.json');
const SCOPE = ['https://www.googleapis.com/auth/drive'];
const parentFolder = 'your-parent-folder-on-drive-side'; // add drive's parent folder(i.e last part of the url) 

interface MyPluginSettings {
	mySetting: string;
	isEnabled: boolean;
	apiKeyClientEmail: string;
	apiKeyPrivateKey: string;
	driveFolder: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default',
	isEnabled: true,
	apiKeyClientEmail: apikeys.client_email,
	apiKeyPrivateKey: apikeys.private_key,
	driveFolder: parentFolder,
}

export default class SyncPlugin extends Plugin {
	settings: MyPluginSettings;
	isCallInProgress: boolean = false;

	async onload() {
		await this.loadSettings();
		
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		this.addRibbonIcon('cloud', 'Sync', async () => {
			if(this.isCallInProgress){
				new Notice('A call is already in progress. Please wait for it to complete.');
				return;
			}

			try {
				
				this.isCallInProgress = true;
				const authClient = await this.authorize();
				const filesInDirectory = await this.listFilesInDirectory();
				const driveFiles = await this.listFilesInDrive(authClient, this.settings.driveFolder);

				for (const fileName of filesInDirectory) {
					var fileExt = fileName.split('.').pop();
					if(fileExt != 'md')
						continue;
					await this.uploadFile(authClient, fileName, this.settings.driveFolder);
				}

				await this.deleteExtraFilesFromDrive(authClient, filesInDirectory, driveFiles);
		
				new Notice('Sync completed successfully!');
			} catch (error) {
				console.error('Error syncing files:', error);
				new Notice('Error syncing files, check the console for details.');
			}
			finally{
				this.isCallInProgress = false;
			}
		});
		

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {
		
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}


	async listFilesInDirectory(): Promise<Set<string>> {
        return new Promise<Set<string>>((resolve, reject) => {
            const fileList: Set<string> = new Set();
            fs.readdir('path-to-plugin-folder', (err: any, files: string[]) => { // add path to the folder where all the files related to plugin are stored
                if (err) {
                    console.error('error reading directory:', err);
                    reject(err);
                    return;
                }
                files.forEach((file: string) => {
                    fileList.add(file);
                });
                resolve(fileList);
            });
        });
    }


	async listFilesInDrive(authClient: any, folderId: string): Promise<Map<string, string>> {
        try {
            const drive = google.drive({ version: 'v3', auth: authClient });
            const fileMap: Map<string, string> = new Map();

            let nextPageToken: string | undefined = undefined;
            do {
                const response: any = await drive.files.list({
                    q: `'${folderId}' in parents`,
                    fields: 'nextPageToken, files(id, name)',
                    pageToken: nextPageToken,
                });

                if (response && response.data && response.data.files && response.data.files.length > 0) {
                    response.data.files.forEach((file: { id: string, name: string }) => {
                        fileMap.set(file.name, file.id);
                    });
                }

                nextPageToken = response.data.nextPageToken;
            } while (nextPageToken);
			console.log(folderId);
            return fileMap;
        } catch (error) {
            console.error('Error listing files in folder:', error);
            throw error; // Throw the error to be caught by the caller
        }
    }


	async authorize(){
		const jwtClient = new google.auth.JWT(
			apikeys.client_email,
			// this.settings.apiKeyClientEmail,
			null,
			apikeys.private_key,
			// this.settings.apiKeyPrivateKey,
			SCOPE
		);
		await jwtClient.authorize();
		return jwtClient;
	}

	
	async uploadFile(authClient: any, fileName: string, folderId: string): Promise<void> {
        try {
			const drive = google.drive({ version: 'v3', auth: authClient });
            const fileId = await this.findFileIdByName(authClient, fileName);			
			const filePath = `path-to-plugin-folder/${fileName}`; // add path to the folder where all the files related to the plugin are stored
            const fileContents = fs.readFileSync(filePath, { encoding: 'utf8' });

			const fileMetadata ={
				name: fileName,
				parents: [folderId]
			};

			const media = {
				mimeType: 'text/markdown',
            	body: fileContents
			};

            if (!fileId) {
                // File doesn't exist, so upload it
                await drive.files.create({
                    resource: fileMetadata,
                    media: media,
                    fields: 'id'
                });
                console.log(`File ${fileName} uploaded.`);
            } else {
                // File exists, so update it
                await drive.files.update({
                    fileId: fileId,
                    // resource: fileMetadata,
                    media: media,
					addParents: [folderId],
                    fields: 'id'
                });
                console.log(`File ${fileName} updated.`);
            }
        } catch (error) {
            console.error('Error uploading or updating file:', error);
            throw error; // Throw the error to be caught by the caller
        }
    }
	

	async deleteExtraFilesFromDrive(authClient: any, localFiles: Set<string>, driveFiles: Map<string, string>): Promise<void> {
		try {
			const drive = google.drive({ version: 'v3', auth: authClient });
	
			// Find files in Google Drive that are not present locally and delete them
			for (const [fileName, fileId] of driveFiles.entries()) {
				if (!localFiles.has(fileName)) {
					await drive.files.delete({ fileId: fileId });
					console.log(`File ${fileName} deleted from Google Drive.`);
				}
			}
		} catch (error) {
			console.error('Error deleting extra files from Google Drive:', error);
			throw error;
		}
	}
	



	async findFileIdByName(authClient: any, fileName: string): Promise<string | null>{
		try{
			const drive = google.drive({ version: 'v3', auth: authClient });
			const response = await drive.files.list({
				q: `name='${encodeURIComponent(fileName)}'`,
				fields: 'files(id)',
			});

			if(response && response.data && response.data.files && response.data.files.length > 0){
				return response.data.files[0].id; 
			}
			else{
				console.log('File not found.');
				return null;
			}
		}
		catch (error) {
			console.error('Error searching for file:', error);
			return null;
		}
	}


}


class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: SyncPlugin;

	constructor(app: App, plugin: SyncPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
		containerEl.createEl('h2', { text: 'Plugin Settings' });
		

		new Setting(containerEl)
			.setName('Sync')
			.setDesc('Enter the ')
			.addText(text => text
                .setPlaceholder('Enter setting value')
                .setValue(this.plugin.settings.mySetting)
                .onChange(async (value) => {
                    this.plugin.settings.mySetting = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Enable Feature')
            .setDesc('Toggle feature on/off')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.isEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.isEnabled = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('API Client Email')
            .setDesc('Enter your API CLient Email')
            .addText(text => text
                .setPlaceholder('Enter API Client Email')
                .setValue(this.plugin.settings.apiKeyClientEmail)
                .onChange(async (value) => {
                    this.plugin.settings.apiKeyClientEmail = value;
                    await this.plugin.saveSettings();
                }));
		
		new Setting(containerEl)
			.setName('API Private Key')
			.setDesc('Enter your API Private Key')
			.addText(text => text
				.setPlaceholder('Enter API Private Key')
				.setValue(this.plugin.settings.apiKeyPrivateKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKeyPrivateKey = value;
					await this.plugin.saveSettings();
					new Notice('New private key added')
				})
				.inputEl.type = 'password'
			);
		
		new Setting(containerEl)
            .setName('Parent Folder')
            .setDesc('Enter your parent folder id')
            .addText(text => text
                .setPlaceholder('Enter parent folder id')
                .setValue(this.plugin.settings.driveFolder)
                .onChange(async (value) => {
                    this.plugin.settings.driveFolder = value;
                    await this.plugin.saveSettings();
                }));
	}
}
