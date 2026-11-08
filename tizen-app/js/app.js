(function () {
  'use strict';

  var API = 'https://api.themoviedb.org/3';
  var IMG = 'https://image.tmdb.org/t/p/';
  var APP_KEY = 'streambert_tv_data_v2';
  var LEGACY_TOKEN = 'streambert_tv_tmdb_token';
  var LEGACY_LIST = 'streambert_tv_watchlist';
  var CACHE_TTL = 6 * 60 * 60 * 1000;
  var state = { data: loadData(), current: null, currentType: 'movie', previousView: 'home', requestId: 0, pages: { movie: 1, tv: 1 }, genres: { movie: [], tv: [] } };
  var views = ['home', 'movies', 'series', 'search', 'watchlist', 'details', 'player', 'settings'];
  var $ = function (id) { return document.getElementById(id); };

  function loadData() {
    var saved;
    try { saved = JSON.parse(localStorage.getItem(APP_KEY) || 'null'); } catch (_) { saved = null; }
    if (saved && saved.version === 2) return normalizeData(saved);
    var oldToken = localStorage.getItem(LEGACY_TOKEN) || '';
    var oldList = [];
    try { oldList = JSON.parse(localStorage.getItem(LEGACY_LIST) || '[]'); } catch (_) {}
    var migrated = { version: 2, token: oldToken, watchlist: (oldList || []).map(function (item) { return normalizeEntry(item); }).filter(Boolean), recent: [], cache: {} };
    try { localStorage.setItem(APP_KEY, JSON.stringify(migrated)); localStorage.removeItem(LEGACY_TOKEN); localStorage.removeItem(LEGACY_LIST); } catch (_) {}
    return migrated;
  }
  function normalizeData(data) { return { version: 2, token: typeof data.token === 'string' ? data.token : '', watchlist: Array.isArray(data.watchlist) ? data.watchlist.map(normalizeEntry).filter(Boolean) : [], recent: Array.isArray(data.recent) ? data.recent.map(normalizeEntry).filter(Boolean).slice(0, 20) : [], cache: data.cache && typeof data.cache === 'object' ? data.cache : {} }; }
  function normalizeEntry(item) { if (!item || item.id == null || (item.type !== 'movie' && item.type !== 'tv' && item.media_type !== 'movie' && item.media_type !== 'tv')) return null; return { id: item.id, type: item.type || item.media_type, title: item.title || item.name || 'Untitled', name: item.name || '', poster_path: item.poster_path || '', backdrop_path: item.backdrop_path || '', overview: item.overview || '', vote_average: Number(item.vote_average) || 0, release_date: item.release_date || '', first_air_date: item.first_air_date || '', genre_ids: item.genre_ids || [], media_type: item.type || item.media_type, savedAt: Number(item.savedAt) || Date.now() }; }
  function persist() { try { localStorage.setItem(APP_KEY, JSON.stringify(state.data)); } catch (_) { notify('TV storage is full or unavailable. Clear local data in Settings.', true); } }
  function notify(message, error) { var banner = $('statusBanner'); banner.textContent = message; banner.className = 'status-banner visible' + (error ? ' error' : ''); }
  function clearNotice() { $('statusBanner').className = 'status-banner'; }
  function imageUrl(path, size) { return path ? IMG + (size || 'w500') + path : ''; }
  function mediaName(item) { return item.title || item.name || item.original_title || item.original_name || 'Untitled'; }
  function mediaYear(item) { var date = item.release_date || item.first_air_date || ''; return date ? date.slice(0, 4) : 'Year unavailable'; }
  function titleType(type) { return type === 'tv' ? 'Series' : 'Movie'; }
  function updateCount() { $('watchlistCount').textContent = String(state.data.watchlist.length); }

  function showView(name, keepScroll) {
    views.forEach(function (view) { $(view + 'View').classList.toggle('hidden', view !== name); });
    document.querySelectorAll('.nav-item').forEach(function (button) { button.classList.toggle('active', button.getAttribute('data-view') === name || name === 'details' && button.getAttribute('data-view') === state.previousView); });
    if (!keepScroll) $('mainContent').scrollTop = 0;
    if (name === 'search') window.setTimeout(function () { $('searchInput').focus(); }, 80);
    else if (name === 'settings') { $('tmdbToken').value = state.data.token; window.setTimeout(function () { $('tmdbToken').focus(); }, 50); }
    else if (name === 'home') window.setTimeout(function () { $('heroExplore').focus(); }, 30);
    else if (name === 'watchlist') window.setTimeout(function () { var first = $('watchlistResults').querySelector('button'); (first || $('watchlistEmpty').querySelector('button')).focus(); }, 30);
    else if (name === 'movies') window.setTimeout(function () { $('movieGenre').focus(); }, 30);
    else if (name === 'series') window.setTimeout(function () { $('seriesGenre').focus(); }, 30);
    clearNotice();
  }

  function request(path) {
    if (!state.data.token) return Promise.reject(new Error('Add your TMDB Read Access Token in Settings first.'));
    return fetch(API + path + (path.indexOf('?') >= 0 ? '&' : '?') + 'language=en-US', { headers: { Authorization: 'Bearer ' + state.data.token, Accept: 'application/json' } }).then(function (response) {
      if (!response.ok) throw new Error(response.status === 401 ? 'TMDB rejected the token. Check it in Settings.' : 'TMDB request failed (' + response.status + ').');
      return response.json();
    });
  }
  function cachedRequest(key, path) {
    var entry = state.data.cache[key];
    if (entry && Date.now() - entry.savedAt < CACHE_TTL) return Promise.resolve(entry.value);
    return request(path).then(function (value) { state.data.cache[key] = { savedAt: Date.now(), value: value }; persist(); return value; });
  }

  function makeCard(item, type) {
    var button = document.createElement('button'); button.className = 'media-card focusable'; button.type = 'button';
    var poster = document.createElement('div'); poster.className = 'poster'; if (item.poster_path) poster.style.backgroundImage = 'url("' + imageUrl(item.poster_path, 'w500') + '")';
    var copy = document.createElement('div'); copy.className = 'card-copy';
    var title = document.createElement('div'); title.className = 'card-title'; title.textContent = mediaName(item);
    var subtitle = document.createElement('div'); subtitle.className = 'card-subtitle'; subtitle.textContent = titleType(type) + ' · ' + mediaYear(item);
    var rating = document.createElement('span'); rating.className = 'card-rating'; rating.textContent = item.vote_average ? '★ ' + Number(item.vote_average).toFixed(1) : '';
    copy.appendChild(title); copy.appendChild(subtitle); button.appendChild(poster); button.appendChild(copy); button.appendChild(rating);
    button.addEventListener('click', function () { openDetails(item, type); }); return button;
  }
  function renderRow(container, title, items, type) {
    if (!items || !items.length) return;
    var section = document.createElement('section'); section.className = 'row-section';
    var heading = document.createElement('div'); heading.className = 'row-heading'; var h = document.createElement('h2'); h.textContent = title; heading.appendChild(h);
    var row = document.createElement('div'); row.className = 'media-row'; row.setAttribute('aria-label', title);
    items.forEach(function (item) { row.appendChild(makeCard(item, type)); }); section.appendChild(heading); section.appendChild(row); container.appendChild(section);
  }
  function setHero(item) {
    if (!item) return; $('heroTitle').textContent = mediaName(item); $('heroOverview').textContent = item.overview || 'Explore the catalog and save titles to your list.';
    var image = imageUrl(item.backdrop_path || item.poster_path, 'w1280'); $('hero').style.backgroundImage = image ? 'url("' + image + '")' : '';
    $('heroMeta').textContent = (item.vote_average ? '★ ' + Number(item.vote_average).toFixed(1) + '   ·   ' : '') + mediaYear(item) + '   ·   ' + titleType(item.media_type === 'tv' || item.first_air_date ? 'tv' : 'movie');
    $('heroExplore').onclick = function () { openDetails(item, item.media_type === 'tv' || item.first_air_date ? 'tv' : 'movie'); };
  }
  function status(text) { $('connectionStatus').textContent = text; }

  function loadHome() {
    if (!state.data.token) { notify('Open Settings and add your TMDB token to load the catalog.'); status('Setup required'); return; }
    var id = ++state.requestId; status('Loading catalog…');
    Promise.all([cachedRequest('trending_movie', '/trending/movie/week'), cachedRequest('trending_tv', '/trending/tv/week'), cachedRequest('popular_movie', '/movie/popular?page=1'), cachedRequest('popular_tv', '/tv/popular?page=1'), cachedRequest('top_movie', '/movie/top_rated?page=1')]).then(function (data) {
      if (id !== state.requestId) return; var movies = data[0].results || []; var shows = data[1].results || []; var popularMovies = data[2].results || []; var popularTV = data[3].results || []; var top = data[4].results || [];
      movies.forEach(function (item) { item.media_type = 'movie'; }); shows.forEach(function (item) { item.media_type = 'tv'; });
      var rows = $('homeRows'); rows.innerHTML = ''; if (movies.length) setHero(movies[0]);
      renderRow(rows, 'Trending Movies', movies.slice(0, 16), 'movie'); renderRow(rows, 'Trending Series', shows.slice(0, 16), 'tv'); renderRow(rows, 'Popular Movies', popularMovies.slice(0, 16), 'movie'); renderRow(rows, 'Popular Series', popularTV.slice(0, 16), 'tv'); renderRow(rows, 'Top Rated Movies', top.slice(0, 16), 'movie'); renderRow(rows, 'Recently Viewed', state.data.recent, 'movie');
      status('Catalog ready'); clearNotice();
    }).catch(function (error) { if (id === state.requestId) { status('Catalog unavailable'); notify(error.message, true); } });
  }

  function openCatalog(type, page, append) {
    var isTV = type === 'tv'; var genre = $(isTV ? 'seriesGenre' : 'movieGenre').value; var sort = $(isTV ? 'seriesSort' : 'movieSort').value;
    var pageNo = page || 1; state.pages[type] = pageNo; var target = $(isTV ? 'seriesResults' : 'moviesResults'); var more = $(isTV ? 'seriesMore' : 'moviesMore');
    if (!append) target.innerHTML = ''; more.disabled = true; more.textContent = 'Loading…'; status('Loading ' + (isTV ? 'series' : 'movies') + '…');
    var params = 'page=' + pageNo + '&sort_by=' + encodeURIComponent(sort) + '&vote_count.gte=20'; if (genre) params += '&with_genres=' + encodeURIComponent(genre);
    request('/discover/' + type + '?' + params).then(function (data) {
      (data.results || []).forEach(function (item) { item.media_type = type; target.appendChild(makeCard(item, type)); });
      more.disabled = pageNo >= (data.total_pages || 1); more.textContent = more.disabled ? 'End of results' : 'Load more'; status('Page ' + pageNo + ' · ' + (data.total_results || 0) + ' titles');
      if (!append && !(data.results || []).length) notify('No titles match this selection.'); else clearNotice();
    }).catch(function (error) { more.disabled = false; more.textContent = 'Try again'; notify(error.message, true); status('Catalog unavailable'); });
  }
  function loadGenres(type) {
    var target = $(type === 'tv' ? 'seriesGenre' : 'movieGenre');
    request('/genre/' + type + '/list').then(function (data) { state.genres[type] = data.genres || []; state.genres[type].forEach(function (genre) { var option = document.createElement('option'); option.value = genre.id; option.textContent = genre.name; target.appendChild(option); }); }).catch(function () {});
  }

  function openDetails(item, type) {
    state.previousView = state.activeView || 'home'; state.current = item; state.currentType = type; state.activeView = 'details';
    var entry = normalizeEntry(Object.assign({}, item, { type: type }));
    if (entry) { state.data.recent = [entry].concat(state.data.recent.filter(function (old) { return !(old.id === entry.id && old.type === entry.type); })).slice(0, 12); persist(); }
    renderDetail(item, type); showView('details'); $('saveAction').focus();
    var cacheKey = 'detail_' + type + '_' + item.id;
    cachedRequest(cacheKey, '/' + type + '/' + item.id).then(function (details) { if (state.current && String(state.current.id) === String(item.id) && state.currentType === type) { state.current = Object.assign({}, item, details); renderDetail(state.current, type); } }).catch(function () {});
  }
  function renderDetail(item, type) {
    $('detailsHero').style.backgroundImage = item.backdrop_path ? 'linear-gradient(90deg,rgba(10,10,10,.94),rgba(10,10,10,.45)),url("' + imageUrl(item.backdrop_path, 'w1280') + '")' : '';
    $('detailsPoster').style.backgroundImage = item.poster_path ? 'url("' + imageUrl(item.poster_path, 'w500') + '")' : '';
    $('detailsType').textContent = type === 'tv' ? 'TV SERIES' : 'MOVIE'; $('detailsTitle').textContent = mediaName(item);
    var runtime = item.runtime ? ' · ' + item.runtime + ' min' : ''; var seasons = item.number_of_seasons ? ' · ' + item.number_of_seasons + ' season' + (item.number_of_seasons === 1 ? '' : 's') : '';
    $('detailsMeta').textContent = (item.vote_average ? '★ ' + Number(item.vote_average).toFixed(1) + ' / 10 · ' : '') + mediaYear(item) + runtime + seasons + (item.status ? ' · ' + item.status : ''); $('detailsOverview').textContent = item.overview || 'No overview is available for this title.';
    var genres = $('detailsGenres'); genres.innerHTML = ''; (item.genres || []).forEach(function (genre) { var tag = document.createElement('span'); tag.className = 'genre-tag'; tag.textContent = genre.name; genres.appendChild(tag); }); if (!(item.genres || []).length && item.genre_ids) item.genre_ids.slice(0, 4).forEach(function (id) { var found = state.genres[type].filter(function (g) { return String(g.id) === String(id); })[0]; if (found) { var tag = document.createElement('span'); tag.className = 'genre-tag'; tag.textContent = found.name; genres.appendChild(tag); } });
    updateSaveButton(); loadDetailRows(item, type);
  }
  function loadDetailRows(item, type) {
    var rows = $('detailExtraRows'); rows.innerHTML = '';
    Promise.all([cachedRequest('similar_' + type + '_' + item.id, '/' + type + '/' + item.id + '/similar?page=1'), cachedRequest('recommend_' + type + '_' + item.id, '/' + type + '/' + item.id + '/recommendations?page=1')]).then(function (data) {
      if (!state.current || String(state.current.id) !== String(item.id)) return;
      (data[0].results || []).forEach(function (entry) { entry.media_type = type; }); (data[1].results || []).forEach(function (entry) { entry.media_type = type; });
      renderRow(rows, 'More Like This', (data[1].results || []).slice(0, 16), type); renderRow(rows, 'Similar ' + (type === 'tv' ? 'Series' : 'Movies'), (data[0].results || []).slice(0, 16), type);
      if (type === 'tv') loadSeasons(item, rows);
      if (type === 'movie' && item.belongs_to_collection && item.belongs_to_collection.id) loadCollection(item.belongs_to_collection.id, rows);
    }).catch(function () {});
  }
  function loadSeasons(item, rows) {
    if (!item.seasons || !item.seasons.length) return;
    var block = document.createElement('section'); block.className = 'row-section season-block'; var heading = document.createElement('div'); heading.className = 'row-heading'; var h = document.createElement('h2'); h.textContent = 'Seasons'; heading.appendChild(h); block.appendChild(heading);
    var list = document.createElement('div'); list.className = 'season-list'; item.seasons.forEach(function (season) { if (!season.season_number) return; var card = document.createElement('article'); card.className = 'season-card'; var poster = document.createElement('div'); poster.className = 'season-poster'; if (season.poster_path) poster.style.backgroundImage = 'url("' + imageUrl(season.poster_path, 'w500') + '")'; var text = document.createElement('div'); text.className = 'season-copy'; var title = document.createElement('h3'); title.textContent = season.name || 'Season ' + season.season_number; var meta = document.createElement('p'); meta.textContent = (season.episode_count || '?') + ' episodes' + (season.air_date ? ' · ' + season.air_date.slice(0, 4) : ''); text.appendChild(title); text.appendChild(meta); card.appendChild(poster); card.appendChild(text); list.appendChild(card); }); block.appendChild(list); rows.appendChild(block);
  }
  function loadCollection(id, rows) { cachedRequest('collection_' + id, '/collection/' + id).then(function (data) { if (!state.current || !data.parts) return; data.parts.forEach(function (item) { item.media_type = 'movie'; }); renderRow(rows, data.name || 'Collection', data.parts.slice(0, 16), 'movie'); }).catch(function () {}); }

  function isSaved(item) { return state.data.watchlist.some(function (entry) { return String(entry.id) === String(item.id) && entry.type === state.currentType; }); }
  function updateSaveButton() { $('saveAction').textContent = state.current && isSaved(state.current) ? '✓  Remove from My List' : '＋  Add to My List'; }
  function toggleSaved() {
    if (!state.current) return; var found = isSaved(state.current);
    if (found) state.data.watchlist = state.data.watchlist.filter(function (entry) { return !(String(entry.id) === String(state.current.id) && entry.type === state.currentType); });
    else { var entry = normalizeEntry(Object.assign({}, state.current, { type: state.currentType, savedAt: Date.now() })); if (entry) state.data.watchlist.unshift(entry); }
    persist(); updateCount(); updateSaveButton(); renderWatchlist();
  }
  function renderWatchlist() { var results = $('watchlistResults'); results.innerHTML = ''; $('watchlistEmpty').classList.toggle('hidden', state.data.watchlist.length > 0); state.data.watchlist.forEach(function (entry) { results.appendChild(makeCard(entry, entry.type)); }); }

  function search(query) {
    var target = $('searchResults'); target.innerHTML = ''; if (!query.trim()) { notify('Enter a title to search.'); return; } status('Searching…'); notify('Searching…');
    Promise.all([request('/search/movie?query=' + encodeURIComponent(query)), request('/search/tv?query=' + encodeURIComponent(query))]).then(function (data) { var items = (data[0].results || []).map(function (item) { item.media_type = 'movie'; return item; }).concat((data[1].results || []).map(function (item) { item.media_type = 'tv'; return item; })); items.sort(function (a, b) { return (b.popularity || 0) - (a.popularity || 0); }); items.slice(0, 48).forEach(function (item) { target.appendChild(makeCard(item, item.media_type)); }); status('Search complete'); if (!items.length) notify('No matching titles found.'); else clearNotice(); }).catch(function (error) { notify(error.message, true); status('Search unavailable'); });
  }

  function playAuthorizedUrl() {
    if (!state.current) return; var url = window.prompt('Enter a direct MP4 or TV-compatible HLS URL for media you are authorized to play:'); if (!url) return;
    var parsed; try { parsed = new URL(url); } catch (_) { notify('Enter a valid http or https media URL.', true); return; }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') { notify('Only http and https URLs are supported.', true); return; }
    var video = $('videoPlayer'); video.pause(); video.removeAttribute('src'); video.load(); $('playerTitle').textContent = mediaName(state.current); $('playerMessage').textContent = 'If playback does not start, check the URL, access permissions, and TV-supported codec.'; video.src = parsed.toString(); showView('player'); video.focus(); video.play().catch(function () { $('playerMessage').textContent = 'Press Play on the remote. TV model codec support varies.'; });
  }
  function saveToken() { var token = $('tmdbToken').value.trim(); if (!token) { $('settingsMessage').textContent = 'Enter a token before saving.'; return; } state.data.token = token; state.data.cache = {}; persist(); $('settingsMessage').textContent = 'Token saved. Loading catalog…'; showView('home'); loadHome(); }
  function clearToken() { state.data.token = ''; state.data.cache = {}; persist(); $('tmdbToken').value = ''; $('settingsMessage').textContent = 'Token cleared from this TV.'; $('homeRows').innerHTML = ''; $('heroTitle').textContent = 'Discover something great'; $('heroOverview').textContent = 'Connect your TMDB token in Settings to explore movies and series.'; $('hero').style.backgroundImage = ''; notify('TMDB token cleared.'); }
  function clearLocalData() { if (!window.confirm('Clear saved titles, recent items, and cached metadata from this TV?')) return; var token = state.data.token; state.data = { version: 2, token: token, watchlist: [], recent: [], cache: {} }; persist(); updateCount(); renderWatchlist(); $('dataMessage').textContent = 'Watchlist, recent items, and cached metadata were cleared.'; }

  function bind() {
    document.querySelectorAll('.nav-item').forEach(function (button) { button.addEventListener('click', function () { var view = button.getAttribute('data-view'); state.activeView = view; if (view === 'watchlist') renderWatchlist(); if (view === 'movies') openCatalog('movie', 1, false); if (view === 'series') openCatalog('tv', 1, false); showView(view); }); });
    $('brandHome').addEventListener('click', function () { state.activeView = 'home'; showView('home'); }); $('heroSearch').addEventListener('click', function () { state.activeView = 'search'; showView('search'); });
    document.querySelectorAll('[data-go-view]').forEach(function (button) { button.addEventListener('click', function () { state.activeView = button.getAttribute('data-go-view'); showView(state.activeView); }); });
    $('searchForm').addEventListener('submit', function (event) { event.preventDefault(); search($('searchInput').value); });
    $('movieGenre').addEventListener('change', function () { openCatalog('movie', 1, false); }); $('movieSort').addEventListener('change', function () { openCatalog('movie', 1, false); }); $('seriesGenre').addEventListener('change', function () { openCatalog('tv', 1, false); }); $('seriesSort').addEventListener('change', function () { openCatalog('tv', 1, false); });
    $('moviesMore').addEventListener('click', function () { openCatalog('movie', state.pages.movie + 1, true); }); $('seriesMore').addEventListener('click', function () { openCatalog('tv', state.pages.tv + 1, true); });
    $('saveAction').addEventListener('click', toggleSaved); $('playAction').addEventListener('click', playAuthorizedUrl); $('detailsBack').addEventListener('click', function () { showView(state.previousView || 'home'); }); $('playerBack').addEventListener('click', closePlayer); $('saveToken').addEventListener('click', saveToken); $('clearToken').addEventListener('click', clearToken); $('clearLocalData').addEventListener('click', clearLocalData);
    document.addEventListener('keydown', function (event) { var key = event.key; var code = event.keyCode || event.which; if (key === 'Escape' || key === 'Back' || key === 'BrowserBack' || code === 10009) { if (document.activeElement && document.activeElement.tagName === 'INPUT' && document.activeElement.type !== 'search') return; event.preventDefault(); goBack(); } if (key === 'MediaPlayPause' && !$('playerView').classList.contains('hidden')) { event.preventDefault(); var player = $('videoPlayer'); if (player.paused) player.play(); else player.pause(); } });
    if (window.tizen && window.tizen.tvinputdevice) { try { window.tizen.tvinputdevice.registerKey('MediaPlayPause'); } catch (_) {} }
    window.addEventListener('storage', function (event) { if (event.key === APP_KEY) { state.data = loadData(); updateCount(); renderWatchlist(); } });
  }
  function goBack() { if (!$('playerView').classList.contains('hidden')) { closePlayer(); return; } if (!$('detailsView').classList.contains('hidden')) { state.activeView = state.previousView || 'home'; showView(state.activeView); return; } if (!$('searchView').classList.contains('hidden') || !$('watchlistView').classList.contains('hidden') || !$('settingsView').classList.contains('hidden') || !$('moviesView').classList.contains('hidden') || !$('seriesView').classList.contains('hidden')) { state.activeView = 'home'; showView('home'); return; } if (window.tizen && window.tizen.application) { try { window.tizen.application.getCurrentApplication().hide(); } catch (_) {} } }
  function closePlayer() { var video = $('videoPlayer'); video.pause(); video.removeAttribute('src'); video.load(); showView('details'); $('playAction').focus(); }
  function init() { bind(); updateCount(); renderWatchlist(); loadGenres('movie'); loadGenres('tv'); showView('home'); if (state.data.token) loadHome(); else { notify('Open Settings and add your TMDB token to begin.'); status('Setup required'); } }
  init();
}());
