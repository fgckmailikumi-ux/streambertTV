(function () {
  'use strict';

  var TMDB_API = 'https://api.themoviedb.org/3';
  var TMDB_IMAGE = 'https://image.tmdb.org/t/p/';
  var TOKEN_KEY = 'streambert_tv_tmdb_token';
  var LIST_KEY = 'streambert_tv_watchlist';
  var state = { token: localStorage.getItem(TOKEN_KEY) || '', watchlist: readList(), current: null, currentType: 'movie', previousView: 'home', requestId: 0 };
  var views = ['home', 'search', 'watchlist', 'details', 'player', 'settings'];
  var $ = function (id) { return document.getElementById(id); };

  function readList() { try { return JSON.parse(localStorage.getItem(LIST_KEY) || '[]'); } catch (_) { return []; } }
  function writeList() { try { localStorage.setItem(LIST_KEY, JSON.stringify(state.watchlist)); } catch (_) { notify('Unable to save the watchlist on this TV.', true); } }
  function safeText(value) { return value == null ? '' : String(value); }
  function imageUrl(path, size) { return path ? TMDB_IMAGE + (size || 'w500') + path : ''; }
  function notify(message, error) { var banner = $('statusBanner'); banner.textContent = message; banner.className = 'status-banner visible' + (error ? ' error' : ''); }
  function clearNotice() { $('statusBanner').className = 'status-banner'; }
  function updateCount() { $('watchlistCount').textContent = String(state.watchlist.length); }

  function showView(name, keepScroll) {
    views.forEach(function (view) { $(view + 'View').classList.toggle('hidden', view !== name); });
    document.querySelectorAll('.nav-item').forEach(function (button) {
      button.classList.toggle('active', button.getAttribute('data-view') === name || (name === 'details' && state.previousView === 'home'));
    });
    if (!keepScroll) $('mainContent').scrollTop = 0;
    if (name === 'search') { window.setTimeout(function () { $('searchInput').focus(); }, 80); }
    else if (name === 'settings') { $('tmdbToken').value = state.token; window.setTimeout(function () { $('tmdbToken').focus(); }, 80); }
    else if (name === 'home') { window.setTimeout(function () { $('heroExplore').focus(); }, 30); }
    else if (name === 'watchlist') { window.setTimeout(function () { var first = $('watchlistResults').querySelector('button'); (first || $('watchlistEmpty').querySelector('button')).focus(); }, 30); }
    clearNotice();
  }

  function request(path) {
    if (!state.token) return Promise.reject(new Error('Add your TMDB Read Access Token in Settings first.'));
    return fetch(TMDB_API + path + (path.indexOf('?') >= 0 ? '&' : '?') + 'language=en-US', {
      headers: { Authorization: 'Bearer ' + state.token, Accept: 'application/json' }
    }).then(function (response) {
      if (!response.ok) throw new Error(response.status === 401 ? 'TMDB rejected the token. Check it in Settings.' : 'TMDB request failed (' + response.status + ').');
      return response.json();
    });
  }

  function mediaName(item) { return item.title || item.name || 'Untitled'; }
  function mediaYear(item) { var date = item.release_date || item.first_air_date || ''; return date ? date.slice(0, 4) : 'Year unavailable'; }
  function card(item, type) {
    var button = document.createElement('button'); button.className = 'media-card focusable'; button.type = 'button';
    var poster = document.createElement('div'); poster.className = 'poster'; if (item.poster_path) poster.style.backgroundImage = 'url("' + imageUrl(item.poster_path, 'w500') + '")';
    var copy = document.createElement('div'); copy.className = 'card-copy';
    var title = document.createElement('div'); title.className = 'card-title'; title.textContent = mediaName(item);
    var subtitle = document.createElement('div'); subtitle.className = 'card-subtitle'; subtitle.textContent = (type === 'tv' ? 'Series' : 'Movie') + ' · ' + mediaYear(item);
    copy.appendChild(title); copy.appendChild(subtitle); button.appendChild(poster); button.appendChild(copy);
    button.addEventListener('click', function () { openDetails(item, type); });
    return button;
  }

  function renderRow(container, title, items, type) {
    var section = document.createElement('section'); section.className = 'row-section';
    var heading = document.createElement('div'); heading.className = 'row-heading';
    var h = document.createElement('h2'); h.textContent = title; heading.appendChild(h);
    var count = document.createElement('span'); count.textContent = 'Explore the latest'; heading.appendChild(count);
    var row = document.createElement('div'); row.className = 'media-row'; row.setAttribute('aria-label', title);
    items.forEach(function (item) { row.appendChild(card(item, type)); });
    section.appendChild(heading); section.appendChild(row); container.appendChild(section);
  }

  function setHero(item) {
    if (!item) return;
    var title = mediaName(item); $('heroTitle').textContent = title;
    $('heroOverview').textContent = item.overview || 'Discover more details, explore the catalog, and save titles to your list.';
    var image = imageUrl(item.backdrop_path || item.poster_path, 'w1280');
    $('hero').style.backgroundImage = image ? 'url("' + image + '")' : '';
    $('heroExplore').onclick = function () { openDetails(item, item.media_type === 'tv' || item.first_air_date ? 'tv' : 'movie'); };
  }

  function loadHome() {
    if (!state.token) { notify('Add your TMDB Read Access Token in Settings to load the catalog.'); $('connectionStatus').textContent = 'Setup required'; return; }
    var requestId = ++state.requestId; $('connectionStatus').textContent = 'Loading catalog…';
    Promise.all([request('/trending/movie/week'), request('/trending/tv/week')]).then(function (results) {
      if (requestId !== state.requestId) return;
      var movies = results[0].results || []; var shows = results[1].results || [];
      var rows = $('homeRows'); rows.innerHTML = '';
      if (movies.length) setHero(movies[0]);
      renderRow(rows, 'Trending Movies', movies.slice(0, 20), 'movie');
      renderRow(rows, 'Trending Series', shows.slice(0, 20), 'tv');
      $('connectionStatus').textContent = 'Catalog ready'; clearNotice();
      if (!movies.length && !shows.length) notify('No titles returned. Try again later.');
    }).catch(function (error) { if (requestId === state.requestId) { $('connectionStatus').textContent = 'Catalog unavailable'; notify(error.message, true); } });
  }

  function openDetails(item, type) {
    state.current = item; state.currentType = type; state.previousView = state.previousView || 'home';
    $('detailsPoster').style.backgroundImage = item.poster_path ? 'url("' + imageUrl(item.poster_path, 'w500') + '")' : '';
    $('detailsType').textContent = type === 'tv' ? 'SERIES' : 'MOVIE'; $('detailsTitle').textContent = mediaName(item);
    $('detailsMeta').textContent = mediaYear(item) + '  ·  ' + (item.vote_average ? Number(item.vote_average).toFixed(1) + ' / 10' : 'Rating unavailable');
    $('detailsOverview').textContent = item.overview || 'No overview is available for this title.';
    updateSaveButton(); showView('details'); $('saveAction').focus();
  }

  function isSaved(item) { return state.watchlist.some(function (entry) { return entry.id === item.id && entry.type === state.currentType; }); }
  function updateSaveButton() { $('saveAction').textContent = isSaved(state.current) ? '✓  Remove from My List' : '＋  Add to My List'; }
  function toggleSaved() {
    if (!state.current) return;
    if (isSaved(state.current)) state.watchlist = state.watchlist.filter(function (entry) { return !(entry.id === state.current.id && entry.type === state.currentType); });
    else state.watchlist.push({ id: state.current.id, type: state.currentType, title: mediaName(state.current), poster_path: state.current.poster_path || '', overview: state.current.overview || '', vote_average: state.current.vote_average || 0, release_date: state.current.release_date || '', first_air_date: state.current.first_air_date || '' });
    writeList(); updateCount(); updateSaveButton(); renderWatchlist();
  }

  function renderWatchlist() {
    var results = $('watchlistResults'); results.innerHTML = '';
    $('watchlistEmpty').classList.toggle('hidden', state.watchlist.length > 0);
    state.watchlist.forEach(function (entry) { results.appendChild(card(entry, entry.type)); });
  }

  function search(query) {
    var results = $('searchResults'); results.innerHTML = '';
    if (!query.trim()) { notify('Enter a title to search.'); return; }
    notify('Searching…'); $('connectionStatus').textContent = 'Searching…';
    Promise.all([request('/search/movie?query=' + encodeURIComponent(query)), request('/search/tv?query=' + encodeURIComponent(query))]).then(function (data) {
      var merged = (data[0].results || []).map(function (item) { item.media_type = 'movie'; return item; }).concat((data[1].results || []).map(function (item) { item.media_type = 'tv'; return item; }));
      merged.sort(function (a, b) { return (b.popularity || 0) - (a.popularity || 0); });
      merged.slice(0, 36).forEach(function (item) { results.appendChild(card(item, item.media_type)); });
      $('connectionStatus').textContent = 'Search complete';
      if (!merged.length) notify('No matching titles found.'); else clearNotice();
    }).catch(function (error) { notify(error.message, true); $('connectionStatus').textContent = 'Search unavailable'; });
  }

  function playAuthorizedUrl() {
    if (!state.current) return;
    var url = window.prompt('Enter a direct MP4 or TV-compatible HLS URL for media you are authorized to play:');
    if (!url) return;
    var parsed;
    try { parsed = new URL(url); } catch (_) { notify('Enter a valid http or https media URL.', true); return; }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') { notify('Only http and https URLs are supported.', true); return; }
    var video = $('videoPlayer'); video.pause(); video.removeAttribute('src'); video.load();
    $('playerTitle').textContent = mediaName(state.current); $('playerMessage').textContent = 'If playback does not start, check that the URL is direct, accessible, and encoded in a format supported by your TV.';
    video.src = parsed.toString(); showView('player'); video.focus();
    video.play().catch(function () { $('playerMessage').textContent = 'Press Play on the remote. Some TV models cannot play every MP4 or HLS codec.'; });
  }

  function bind() {
    document.querySelectorAll('.nav-item').forEach(function (button) { button.addEventListener('click', function () { var view = button.getAttribute('data-view'); if (view === 'watchlist') renderWatchlist(); showView(view); }); });
    $('brandHome').addEventListener('click', function () { state.previousView = 'home'; showView('home'); });
    $('heroSearch').addEventListener('click', function () { showView('search'); });
    document.querySelectorAll('[data-go-view]').forEach(function (button) { button.addEventListener('click', function () { showView(button.getAttribute('data-go-view')); }); });
    $('searchForm').addEventListener('submit', function (event) { event.preventDefault(); search($('searchInput').value); });
    $('saveAction').addEventListener('click', toggleSaved); $('playAction').addEventListener('click', playAuthorizedUrl);
    $('detailsBack').addEventListener('click', function () { showView(state.previousView || 'home'); });
    $('playerBack').addEventListener('click', closePlayer); $('saveToken').addEventListener('click', saveToken); $('clearToken').addEventListener('click', clearToken);
    document.addEventListener('keydown', function (event) {
      var key = event.key; var code = event.keyCode || event.which;
      if (key === 'Escape' || key === 'Back' || key === 'BrowserBack' || code === 10009) { event.preventDefault(); goBack(); }
      if (key === 'MediaPlayPause' && $('playerView').className.indexOf('hidden') < 0) { event.preventDefault(); var v = $('videoPlayer'); if (v.paused) v.play(); else v.pause(); }
    });
    if (window.tizen && window.tizen.tvinputdevice) {
      try { window.tizen.tvinputdevice.registerKey('MediaPlayPause'); } catch (_) {}
    }
  }

  function goBack() {
    if (!$('playerView').classList.contains('hidden')) { closePlayer(); return; }
    if (!$('detailsView').classList.contains('hidden')) { showView(state.previousView || 'home'); return; }
    if (!$('searchView').classList.contains('hidden') || !$('watchlistView').classList.contains('hidden') || !$('settingsView').classList.contains('hidden')) { showView('home'); return; }
    if (window.tizen && window.tizen.application) { try { window.tizen.application.getCurrentApplication().hide(); } catch (_) {} }
  }
  function closePlayer() { var video = $('videoPlayer'); video.pause(); video.removeAttribute('src'); video.load(); showView('details'); $('playAction').focus(); }
  function saveToken() {
    var token = $('tmdbToken').value.trim();
    if (!token) { $('settingsMessage').textContent = 'Enter a token before saving.'; return; }
    state.token = token; localStorage.setItem(TOKEN_KEY, token); $('settingsMessage').textContent = 'Token saved. Loading catalog…'; showView('home'); loadHome();
  }
  function clearToken() { state.token = ''; localStorage.removeItem(TOKEN_KEY); $('tmdbToken').value = ''; $('settingsMessage').textContent = 'Token cleared from this app.'; $('homeRows').innerHTML = ''; $('heroTitle').textContent = 'Welcome to Streambert'; $('heroOverview').textContent = 'Connect your TMDB token in Settings to explore trending movies and series.'; $('hero').style.backgroundImage = ''; notify('TMDB token cleared.'); }

  function init() {
    bind(); updateCount(); renderWatchlist(); showView('home');
    if (state.token) loadHome(); else { notify('Open Settings and add your TMDB Read Access Token to begin.'); $('connectionStatus').textContent = 'Setup required'; }
  }
  init();
}());
