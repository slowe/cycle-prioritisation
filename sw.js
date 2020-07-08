const cacheName = "cycle-v1.1";
let reminders;
let checker;
const interval = 10000;
let inadvance;
let address;

self.addEventListener('install', function(e) {
	console.log('install ServiceWorker');
	e.waitUntil(
		caches.open(cacheName).then(function(cache) {
			return cache.addAll([
				'/cycle-prioritisation/',
				'/cycle-prioritisation/index.html',
				'/cycle-prioritisation/resources/leaflet.js',
				'/cycle-prioritisation/resources/leaflet.css',
				'/cycle-prioritisation/app.js',
				'/cycle-prioritisation/signals.geojson',
			]);
		})
	);
	console.log('install');
	reminders = {};
	inadvance = 86400000/2;
});


self.addEventListener('activate', function(e){
	console.log('activate');
	let cacheWhitelist = [cacheName] // the name of the new cache

	e.waitUntil(
		caches.keys().then (cacheNames => {
			return Promise.all(
				cacheNames.map( cacheName => {
					/* Deleting all the caches except the ones that are in cacheWhitelist array */
					if(cacheWhitelist.indexOf(cacheName) === -1){
						return caches.delete(cacheName)
					}
				})
			)
		})
	);
});


/* Evaluates the fetch request and checks to see if it is in the cache.
   The response is passed back to the webpage via event.respondWith() */
self.addEventListener('fetch', function(e){
	console.log('fetch '+e.request.url);
	e.respondWith(
		caches.match(e.request).then(function(response) {
			if(response) console.log('Using cached version of '+e.request.url);
			else console.log('Get resource '+e.request.url);
			return response || fetch(e.request)
		})
	);
});

