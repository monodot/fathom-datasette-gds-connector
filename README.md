# Fathom Datasette Connector for Google Data Studio

This is a custom connector for Google Data Studio which can fetch data from a Datasette instance serving the (self-hosted) Fathom Analytics SQLite database.

**Warning - this is in no way production-ready software. Use at your own risk!**

Datasette exposes a web interface for viewing and searching a SQLite database. And Fathom uses SQLite! That's handy. (Datasette is possibly overkill here, but it's a good solution to start with.)

Currently supports:

- Fetching data from Fathom's _page_stats_ table.

## Get started

Start an instance of Datasette and point it at your Fathom SQLite `.db` file. I run it in a container with Podman and mount the `/opt/fathom` directory into the container, run on port _8001_ and listen on all interfaces (0.0.0.0):

    podman run --rm -v /opt/fathom:/mnt -p 8001:8001 -d \
        --name datasette-fathom \
        docker.io/datasetteproject/datasette:latest \
        datasette -p 8001 -h 0.0.0.0 /mnt/fathom.db

Optionally you may put a reverse proxy in front, such as Nginx.

You can also [publish your Datasette as a serverless app on Google Cloud Run instead, see the docs for details](https://docs.datasette.io/en/stable/publish.html).

Then when you install this script into Google Data Studio, you'll be prompted for configuration. Set the **baseUrl** to point to your Datasette instance, e.g. _http://datasette.example.com:8080/fathom_

## Development

Install [Clasp](https://developers.google.com/apps-script/guides/clasp) by Google (`npm install -g @google/clasp`).

Follow the instructions in the Clasp docs for installing this script into your own Google account.

**To run tests:** open the `Code.gs` file in the Google Apps Script web IDE, and run the _gastTestRunner_ method. You'l need to supply your own appropriate sample data in the _sampleRequest_ variable.


## Licence

GNU GPL v3.
