# Talented Europe: Translation builder

A gulp task that builds the translation files from the translation team Google Docs spreadsheet.

## Installing

Installing it in a few simple steps:

- Grab it from npm

		npm install te-translation-builder --save

- Get a [credentials file from google developer console](https://www.npmjs.com/package/google-spreadsheet#service-account-recommended-method)
- Add another key to the json file named spreadsheet, with the spreadsheet id (the long id sheet from the url), so it ends like this (minus the actual info).  

		{
		  "type": "service_account",
		  "project_id": "talented-europe",
		  "private_key_id": "",
		  "private_key": "",
		  "client_email": "",
		  "client_id": "",
		  "auth_uri": "",
		  "token_uri": "",
		  "auth_provider_x509_cert_url": "",
		  "client_x509_cert_url": "",
		  "spreadsheet": ""
		}
- Save it as translation-settings.json next to your gulpfile.
- Done

## Requirements.

It's actually meant to be a dependency of the Talented Europe project but it should run standalone with:
- Credentials file with spreadsheet id.
- NodeJS 
- Gulp

## Other notes.

In case you want to adapt it for your project you can download the example spreadsheet upload it to google docs and work from it.

## License

The Talented Europe project is open-sourced software licensed under the [MIT license](http://opensource.org/licenses/MIT).