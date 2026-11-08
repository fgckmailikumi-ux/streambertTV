# Streambert TV

A TV-first Samsung Tizen web app scaffold with a Streambert-inspired dark catalog UI. This is a separate app from the Electron desktop project.

## Features

- Browse and search movie/TV metadata from TMDB.
- Save a local watchlist on the TV.
- Navigate with a Samsung TV remote or keyboard.
- Optional HTML5 playback of a direct media URL that you are authorized to access. The app does not discover, scrape, proxy, or embed third-party streaming sources.
- Package the web project as a signed Tizen `.wgt` using Tizen Studio.

> **Content and rights:** TMDB supplies metadata and artwork, not video. Playback requires a direct MP4 or HLS URL you are authorized to use, and compatibility depends on the TV model and stream format. Do not enter links to unauthorized content. The app does not include media sources.

## Project layout

```text
.
├── README.md
└── tizen-app/
    ├── config.xml       # Tizen TV web-app manifest
    ├── index.html
    ├── css/style.css
    ├── js/app.js
    └── scripts/package.sh
```

## Requirements

- Tizen Studio with the **TV Extensions** and Web App development tools installed.
- A Samsung account and a TV signing certificate created in Tizen Studio Certificate Manager.
- A Samsung Tizen TV (or the TV emulator) for testing. Supported codecs and APIs vary by model/year.
- A TMDB API Read Access Token. The token is stored in this app's local storage on the TV; do not use a shared/public device if you do not trust its users.

## Create a signed WGT

1. Install Tizen Studio from [Samsung Developer](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tizen-studio.html). In Package Manager, install the TV extensions and tools.
2. Open **Tools → Certificate Manager** and create a Samsung certificate profile. For a real TV, register the TV's DUID as directed by Samsung. Keep private keys private; do not commit them.
3. In Tizen Studio, choose **File → Import → Tizen → Tizen Project**, import the `tizen-app` directory, and select the TV profile. If using the CLI, make sure `tizen` is on `PATH` and the profile is available:

   ```sh
   tizen version
   tizen certificate-manager list-profiles
   ```

4. From the repository root, build and package using the included helper. Supply the profile name exactly as listed above:

   ```sh
   ./tizen-app/scripts/package.sh "YOUR_CERTIFICATE_PROFILE"
   ```

   The script runs `tizen build-web` and `tizen package --type wgt --sign ...`. The generated signed `.wgt` is placed in `tizen-app/.buildResult/` (the precise output location can vary by Tizen Studio version). You can also use **Project → Build Package** in Tizen Studio and choose the same security profile.

5. On the TV, open **Apps**, use the remote's number sequence required by your model to open Developer Mode, enable it, enter the development computer's IP address, and restart the TV. Samsung may change this menu flow between model years; follow the current Samsung TV developer documentation for your model.
6. Connect the TV and development computer to the same network. Find the TV's device name with `sdb devices`, connect if needed, then install from Tizen Studio Device Manager or CLI:

   ```sh
   sdb connect TV_IP_ADDRESS:26101
   tizen install --name tizen-app/.buildResult/StreambertTV.wgt --target DEVICE_NAME
   ```

   Replace the example WGT path and device name with the actual build output and `sdb devices` result. If your Tizen Studio version uses different option syntax, run `tizen install --help` and use the equivalent options. The TV and app must use a matching trusted certificate for installation.

7. Launch **Streambert TV** on the TV. Open Settings, enter the TMDB Read Access Token, and save it. Browse, search, and add titles to your watchlist. To test playback, open a title and enter a direct media URL for content you are authorized to play.

## Local development

Open `tizen-app` as a Tizen TV Web Application in Tizen Studio and use the TV emulator or a signed physical TV target. The app is static HTML/CSS/JavaScript and has no npm dependencies. Browser testing can help with layout, but it does not replace TV testing: remote key behavior, media codecs, cross-origin restrictions, and TV firmware vary.

## App limitations

This is a TV-first metadata/watchlist client, not a feature-complete Electron conversion. Desktop downloads, subtitles management, OS integrations, and Electron IPC are intentionally not included. TMDB API credentials and watchlist data are stored locally on the TV. Video playback uses the browser's native `<video>` element and will only work for supported, authorized direct media URLs.

## License

GPL-3.0. See [LICENSE](LICENSE).
