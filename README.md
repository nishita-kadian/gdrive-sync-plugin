# Obsidian Google Drive Sync Plugin

This plugin allows you to sync files between your Obsidian vault and Google Drive. You can easily upload, update, and delete files from your Google Drive directly from within Obsidian.

## How to use

To use this plugin, you'll need to follow these steps:

1. Clone this repo.
2. Install NodeJS, then run `npm i` in the command line under your repo folder(Make sure your NodeJS is at least v16 (`node --version`)).
3. Make changes to `main.ts`(make changes to line 10, 148 and 211). Those changes should be automatically compiled into `main.js`.
4. These changes are:
  	- Replace parent folder ID on line 10. Obtain the ID of the parent folder on the Google Drive side where you want to sync your files. This will be your 		  default parent folder if you do not specify the parent folder at the time of running the plugin. This ID is part of the URL when you navigate to the folder 	  in Google Drive.
      For example, if your Google Drive folder URL is https://drive.google.com/drive/folders/1234567890, then 1234567890 is the folder ID.
   - Replace path to the local plugin directory on line 148 and line 211.
5. Create a file named `apikey.json` in the root directory of your plugin folder. This file should contain your Google API credentials, including your client email and private key. Here's an example of how the `apikey.json` file should look:

 ```json
   {
     "client_email": "your-client-email@example.com",
     "private_key": "-----BEGIN PRIVATE KEY-----\nYourPrivateKeyHere\n-----END PRIVATE KEY-----"
   }
```

 Make sure to replace "your-client-email@example.com" with your actual client email and "YourPrivateKeyHere" with your actual private key.

6. Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.
7. On the drive side do not forget to give editing rights to the API client email you are using.
8. `npm run dev` to start compilation in watch mode.
9. Reload Obsidian to load the new version of your plugin.
10. Enable plugin in settings window.
11. When you click on the cloud ribbon icon named as "Sync" on left sidebar, sync operation will be executed and you will be notified through a notice on top right.

# Settings

You can customize the plugin settings by navigating to Settings > Community Plugins > Sync Plugin. The following settings are available:

	Sync: Configure your syncing preferences.
	Enable Feature: Toggle the feature on or off.
	API Client Email: Enter your API client email.
	API Private Key: Enter your API private key. This field is password-protected and cannot be copied.
	Parent Folder: Enter the ID of the parent folder on the Google Drive side.

# Ribbon Icon

You'll find a ribbon icon named "Sync" shaped as a cloud on the left sidebar. Clicking this icon triggers a sync operation between your Obsidian vault and Google Drive.

# Additional Notes

1. Ensure that you have the necessary permissions and access rights to the Google Drive files and folders you want to sync.
2. Avoid naming two or more files with the same name and introducing space within the name, as this may cause conflicts during syncing.
3. Remember to refresh the plugin after making any changes before using it.
4. If you encounter any issues or have any feedback, feel free to open an issue on the GitHub repository.

## API Documentation

See https://github.com/obsidianmd/obsidian-api
