# Streambert TV

A TV-first Samsung Tizen web app with a Streambert-inspired charcoal-and-red look. Browse TMDB movie and series metadata, search, inspect title details, and save a persistent local watchlist. It is separate from the Electron desktop app.

## TV app features
- Home page with trending, popular, and top-rated shelves.
- Dedicated Movies and Series catalogs with genre/sort filters and pagination.
- Search across TMDB movie and TV catalogs.
- Detail page with artwork, overview, rating, genres, movie collection recommendations, TV seasons, and similar-title shelves.
- Persistent watchlist, recently viewed titles, TMDB token, and a time-limited metadata cache stored in a versioned localStorage record. Existing v1 token/watchlist keys are migrated on first launch.
- Samsung remote/keyboard focus navigation, Back handling, and native video controls for direct media URLs the user is authorized to play.

TMDB provides catalog metadata and artwork, not video. The app does not discover, scrape, proxy, or embed third-party streaming sources. Playback requires a direct URL to content you are authorized to access, with a format and codec supported by the target TV.

## Project structure

```text
.
├── README.md
└── tizen-app/
    ├── config.xml
    ├── index.html
    ├── css/style.css
    ├── js/app.js
    └── scripts/package.sh
```

## Build and install on Samsung TV

1. Install Tizen Studio and the Samsung TV extensions using the [official Smart TV SDK guide](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tizen-studio.html).
2. In Tizen Studio Certificate Manager create a Samsung TV signing profile. For physical TV installation, follow Samsung's current device-registration steps and add the TV DUID. Never commit your private key or certificate passwords.
3. Ensure the `tizen` CLI is available in your terminal, and check your signing profile:

   ```sh
   tizen version
   tizen certificate-manager list-profiles
   ```

4. From the repository root, build and package the Tizen web app. Use the profile name exactly as listed by Certificate Manager:

   ```sh
   ./tizen-app/scripts/package.sh "YOUR_PROFILE_NAME"
   ```

   Or import `tizen-app` in Tizen Studio as a Tizen Web Application project, select the TV profile, then use **Project → Build Package**. The resulting signed `.wgt` will be under `tizen-app/.buildResult/` (output details can vary by SDK version).
5. On the TV, open Apps and enable Developer Mode using the instructions for that TV model/year. Set the development computer's IP and restart if requested. Connect both devices to the same network.
6. Discover the connected device and install the generated package (replace the example output name with the actual WGT filename):

   ```sh
   sdb devices
   sdb connect TV_IP_ADDRESS:26101
   tizen install --name tizen-app/.buildResult/ACTUAL_APP_NAME.wgt --target DEVICE_NAME
   ```

   Check `tizen install --help` for the installed SDK's exact CLI flags. The installation certificate must be trusted by the TV. Tizen Studio Device Manager is an alternative for connecting and installing.
7. Launch Streambert TV. Go to Settings and enter a TMDB API Read Access Token. The catalog and watchlist work only while the TV has suitable network access. Test on the target TV as emulator and browser support may differ from actual model firmware.

## Local storage and privacy

The app stores a single versioned JSON record (`streambert_tv_data_v2`) in browser localStorage. It includes the user's TMDB token, watchlist, last viewed items, and cached TMDB responses. Cache entries expire after six hours. **Clear watchlist and local data** in Settings removes list/recent/cache data but keeps the token; **Clear token** removes the token and metadata cache. Browser storage can be erased by TV settings or firmware resets. This is local to the app/browser profile and does not sync across devices.

## Limitations

This is not a feature-complete Electron conversion. Desktop downloads, native OS integrations, and Electron IPC are not part of Tizen. Season browsing currently exposes season metadata only. HLS playback depends on native TV support; this app does not bundle an HLS library or video source. Samsung certification and store release are separate processes.

## License

GPL-3.0. See [LICENSE](LICENSE).
