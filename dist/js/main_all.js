'use strict';

(function () {
  function toArray(arr) {
    return Array.prototype.slice.call(arr);
  }

  function promisifyRequest(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () {
        resolve(request.result);
      };

      request.onerror = function () {
        reject(request.error);
      };
    });
  }

  function promisifyRequestCall(obj, method, args) {
    var request;
    var p = new Promise(function (resolve, reject) {
      request = obj[method].apply(obj, args);
      promisifyRequest(request).then(resolve, reject);
    });

    p.request = request;
    return p;
  }

  function promisifyCursorRequestCall(obj, method, args) {
    var p = promisifyRequestCall(obj, method, args);
    return p.then(function (value) {
      if (!value) return;
      return new Cursor(value, p.request);
    });
  }

  function proxyProperties(ProxyClass, targetProp, properties) {
    properties.forEach(function (prop) {
      Object.defineProperty(ProxyClass.prototype, prop, {
        get: function () {
          return this[targetProp][prop];
        },
        set: function (val) {
          this[targetProp][prop] = val;
        }
      });
    });
  }

  function proxyRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function (prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function () {
        return promisifyRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function proxyMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function (prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function () {
        return this[targetProp][prop].apply(this[targetProp], arguments);
      };
    });
  }

  function proxyCursorRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function (prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function () {
        return promisifyCursorRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function Index(index) {
    this._index = index;
  }

  proxyProperties(Index, '_index', [
    'name',
    'keyPath',
    'multiEntry',
    'unique'
  ]);

  proxyRequestMethods(Index, '_index', IDBIndex, [
    'get',
    'getKey',
    'getAll',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(Index, '_index', IDBIndex, [
    'openCursor',
    'openKeyCursor'
  ]);

  function Cursor(cursor, request) {
    this._cursor = cursor;
    this._request = request;
  }

  proxyProperties(Cursor, '_cursor', [
    'direction',
    'key',
    'primaryKey',
    'value'
  ]);

  proxyRequestMethods(Cursor, '_cursor', IDBCursor, [
    'update',
    'delete'
  ]);

  // proxy 'next' methods
  ['advance', 'continue', 'continuePrimaryKey'].forEach(function (methodName) {
    if (!(methodName in IDBCursor.prototype)) return;
    Cursor.prototype[methodName] = function () {
      var cursor = this;
      var args = arguments;
      return Promise.resolve().then(function () {
        cursor._cursor[methodName].apply(cursor._cursor, args);
        return promisifyRequest(cursor._request).then(function (value) {
          if (!value) return;
          return new Cursor(value, cursor._request);
        });
      });
    };
  });

  function ObjectStore(store) {
    this._store = store;
  }

  ObjectStore.prototype.createIndex = function () {
    return new Index(this._store.createIndex.apply(this._store, arguments));
  };

  ObjectStore.prototype.index = function () {
    return new Index(this._store.index.apply(this._store, arguments));
  };

  proxyProperties(ObjectStore, '_store', [
    'name',
    'keyPath',
    'indexNames',
    'autoIncrement'
  ]);

  proxyRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'put',
    'add',
    'delete',
    'clear',
    'get',
    'getAll',
    'getKey',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'openCursor',
    'openKeyCursor'
  ]);

  proxyMethods(ObjectStore, '_store', IDBObjectStore, [
    'deleteIndex'
  ]);

  function Transaction(idbTransaction) {
    this._tx = idbTransaction;
    this.complete = new Promise(function (resolve, reject) {
      idbTransaction.oncomplete = function () {
        resolve();
      };
      idbTransaction.onerror = function () {
        reject(idbTransaction.error);
      };
      idbTransaction.onabort = function () {
        reject(idbTransaction.error);
      };
    });
  }

  Transaction.prototype.objectStore = function () {
    return new ObjectStore(this._tx.objectStore.apply(this._tx, arguments));
  };

  proxyProperties(Transaction, '_tx', [
    'objectStoreNames',
    'mode'
  ]);

  proxyMethods(Transaction, '_tx', IDBTransaction, [
    'abort'
  ]);

  function UpgradeDB(db, oldVersion, transaction) {
    this._db = db;
    this.oldVersion = oldVersion;
    this.transaction = new Transaction(transaction);
  }

  UpgradeDB.prototype.createObjectStore = function () {
    return new ObjectStore(this._db.createObjectStore.apply(this._db, arguments));
  };

  proxyProperties(UpgradeDB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(UpgradeDB, '_db', IDBDatabase, [
    'deleteObjectStore',
    'close'
  ]);

  function DB(db) {
    this._db = db;
  }

  DB.prototype.transaction = function () {
    return new Transaction(this._db.transaction.apply(this._db, arguments));
  };

  proxyProperties(DB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(DB, '_db', IDBDatabase, [
    'close'
  ]);

  // Add cursor iterators
  // TODO: remove this once browsers do the right thing with promises
  ['openCursor', 'openKeyCursor'].forEach(function (funcName) {
    [ObjectStore, Index].forEach(function (Constructor) {
      Constructor.prototype[funcName.replace('open', 'iterate')] = function () {
        var args = toArray(arguments);
        var callback = args[args.length - 1];
        var nativeObject = this._store || this._index;
        var request = nativeObject[funcName].apply(nativeObject, args.slice(0, -1));
        request.onsuccess = function () {
          callback(request.result);
        };
      };
    });
  });

  // polyfill getAll
  [Index, ObjectStore].forEach(function (Constructor) {
    if (Constructor.prototype.getAll) return;
    Constructor.prototype.getAll = function (query, count) {
      var instance = this;
      var items = [];

      return new Promise(function (resolve) {
        instance.iterateCursor(query, function (cursor) {
          if (!cursor) {
            resolve(items);
            return;
          }
          items.push(cursor.value);

          if (count !== undefined && items.length == count) {
            resolve(items);
            return;
          }
          cursor.continue();
        });
      });
    };
  });

  var exp = {
    open: function (name, version, upgradeCallback) {
      var p = promisifyRequestCall(indexedDB, 'open', [name, version]);
      var request = p.request;

      request.onupgradeneeded = function (event) {
        if (upgradeCallback) {
          upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
        }
      };

      return p.then(function (db) {
        return new DB(db);
      });
    },
    delete: function (name) {
      return promisifyRequestCall(indexedDB, 'deleteDatabase', [name]);
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = exp;
    module.exports.default = module.exports;
  } else {
    self.idb = exp;
  }
}());
/**
 * Common database helper functions.
 */
class DBHelper {

    set dbPromise(value) {
        this._dbPromise = value;
    }

    get dbPromise() {
        return this._dbPromise;
    }

    set dbOpened(value) {
        this._dbOpened = value;
    }

    get dbOpened() {
        return this._dbOpened;
    }



    /**
     * Database URL.
     * Change this to restaurants.json file location on your server.
     */
    static get DATABASE_URL() {
        const port = 1337 // Change this to your server port
        return `http://localhost:${port}/restaurants`;
    }

    /**
     * Fetch all restaurants.
     */
    static fetchRestaurants(callback) {

        // open DB and set dbPromise
        return DBHelper.openDB().then(function (db) {
            if (db) {
                DBHelper.dbPromise = db;
                console.log(DBHelper.dbPromise);
                // Read restaurants from DB;
                return DBHelper.getRestaurantsFromDB().then(restaurants => {
                    if (restaurants.length) {
                        return callback(null, restaurants);
                    } else {
                        console.log('No restaurants in db');
                        DBHelper.fetchRestaurantsFromNetwork(callback);
                    }
                });
            } else {
                console.log('db not found');
                DBHelper.fetchRestaurantsFromNetwork(callback);
            }
        }).then(function () {}).catch(function () {
            console.log('Catch the promise error');
            DBHelper.fetchRestaurantsFromNetwork(callback);
        })
    }

    /**
     * Fetch all restaurants from network.
     */
    static fetchRestaurantsFromNetwork(callback) {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', DBHelper.DATABASE_URL);
        xhr.onload = () => {
            if (xhr.status === 200) { // Got a success response from server!
                const restaurants = JSON.parse(xhr.responseText);
                console.log('Ristoranti letti dal server');
                callback(null, restaurants);
                // write restaurants to db
                DBHelper.saveRestaurantsToDB(restaurants);
            } else { // Oops!. Got an error from server.
                const error = (`Request failed. Returned status of ${xhr.status}`);
                callback(error, null);
            }
        };
        xhr.send();
    }


    /**
     * Fetch a restaurant by its ID.
     */
    static fetchRestaurantById(id, callback) {
        // fetch all restaurants with proper error handling.
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                const restaurant = restaurants.find(r => r.id == id);
                if (restaurant) { // Got the restaurant
                    callback(null, restaurant);
                } else { // Restaurant does not exist in the database
                    callback('Restaurant does not exist', null);
                }
            }
        });
    }

    /**
     * Fetch restaurants by a cuisine type with proper error handling.
     */
    static fetchRestaurantByCuisine(cuisine, callback) {
        // Fetch all restaurants  with proper error handling
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Filter restaurants to have only given cuisine type
                const results = restaurants.filter(r => r.cuisine_type == cuisine);
                callback(null, results);
            }
        });
    }

    /**
     * Fetch restaurants by a neighborhood with proper error handling.
     */
    static fetchRestaurantByNeighborhood(neighborhood, callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Filter restaurants to have only given neighborhood
                const results = restaurants.filter(r => r.neighborhood == neighborhood);
                callback(null, results);
            }
        });
    }

    /**
     * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
     */
    static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                let results = restaurants
                if (cuisine != 'all') { // filter by cuisine
                    results = results.filter(r => r.cuisine_type == cuisine);
                }
                if (neighborhood != 'all') { // filter by neighborhood
                    results = results.filter(r => r.neighborhood == neighborhood);
                }
                callback(null, results);
            }
        });
    }

    /**
     * Fetch all neighborhoods with proper error handling.
     */
    static fetchNeighborhoods(callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Get all neighborhoods from all restaurants
                const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
                // Remove duplicates from neighborhoods
                const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
                callback(null, uniqueNeighborhoods);
            }
        });
    }

    /**
     * Fetch all cuisines with proper error handling.
     */
    static fetchCuisines(callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Get all cuisines from all restaurants
                const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
                // Remove duplicates from cuisines
                const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
                callback(null, uniqueCuisines);
            }
        });
    }

    /**
     * Restaurant page URL.
     */
    static urlForRestaurant(restaurant) {
        return (`./restaurant.html?id=${restaurant.id}`);
    }

    /**
     * Restaurant image URL.
     */
    static imageUrlForRestaurant(restaurant) {
        // use id instead photograph to avoid an error with Casa Enrique (a bug?)
        return (`/img/${restaurant.id}`);
    }

    /**
     * Restaurant image description.
     */
    static imageDescriptionForRestaurant(restaurant) {
        // Please note that I used Google Translate. Translations can be a little fun... 
        const altImg = [
            "Inside view of the Mission Chinese Food restaurant. Many people talk to each other",
            "A pizza cut into six slices",
            "Inside view of Kang Ho Dong Baekjeong restaurant. You can see various modern style tables and chairs",
            "Panoramic photo of the entrance. You can see the two streets on which the restaurant overlooks",
            "Inside view of the Roberto's Pizza. In the background, see the kitchen and some pizza makers",
            "Inside view of the Hometown BBQ restaurant. On the wall a huge US flag",
            "Two people walking around the restaurand. You can see some customers inside",
            "Detail of the The Dutch banner",
            "Inside view of the Mu Ramen restaurant. Some customers eat using the typical oriental chopsticks",
            "Inside view of restaurant. You see the counter with the window and several bottles."
        ];
        return (altImg[restaurant.id - 1]);
    }



    /**
     * Map marker for a restaurant.
     */
    static mapMarkerForRestaurant(restaurant, map) {
        const marker = new google.maps.Marker({
            position: restaurant.latlng,
            title: restaurant.name,
            url: DBHelper.urlForRestaurant(restaurant),
            map: map,
            animation: google.maps.Animation.DROP
        });
        return marker;
    }

    static openDB() {
        //check for support
        DBHelper.dbOpened = true;
        if (!('indexedDB' in window)) {
            console.log('This browser doesn\'t support IndexedDB');
            return Promise.resolve();
        }

        DBHelper.dbOpened = true;
        return idb.open('restaurants-reviews', 1, upgradeDb => {
            switch (upgradeDb.oldVersion) {
                case 0:
                    upgradeDb.createObjectStore('restaurants', {
                        keyPath: 'id'
                    });
                case 1:
                    // do something
            }
        });

    }

    static addRestaurantToDB(db, data) {
        if (!db) return;
        console.log('Adding record');
        const tx = db.transaction('restaurants', 'readwrite');
        const restaurantsStore = tx.objectStore('restaurants');
        restaurantsStore.put(data);
        console.log("Record added");
        return tx.complete;
    }

    static getRestaurantsFromDB() {
        const tx = DBHelper.dbPromise.transaction('restaurants', 'readonly');
        const restaurantsStore = tx.objectStore('restaurants');
        return restaurantsStore.getAll();
    }


    /*
     * Save data to local database
     */
    static saveRestaurantsToDB(data) {
        if (!(DBHelper.dbOpened)) {
            return
        }

        let tx = DBHelper.dbPromise.transaction('restaurants', 'readwrite');
        let restaurantsStore = tx.objectStore('restaurants');
        data.forEach(function (restaurant) {
            restaurantsStore.put(restaurant);
        });
        return tx.complete;
    }
}
let restaurants,
    neighborhoods,
    cuisines
// use var to define map to avoid an error with API
var map
var markers = []
var google

/**
 * create observe to show images only when they are in viewport
 */
let showImage = function (entries, observer) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            loadPicture(entry.target);
            observer.unobserve(entry.target);
        }
    });
};

const options = {
    root: null,
    rootMargin: '0px',
    threshold: [0]
}
let observer = new IntersectionObserver(showImage, options);

/**
 * loads the picture
 */
function loadPicture(picture) {
    const source_webp = picture.getElementsByTagName('source')[0]
    const source_jpg = picture.getElementsByTagName('source')[1]
    const img = picture.getElementsByTagName('img')[0]

    const src_webp = source_webp.dataset.src;
    const src_jpg = source_jpg.dataset.src;
    const src = img.dataset.src;
    if (!src) {
        return;
    }
    source_webp.srcset = src_webp;
    source_jpg.srcset = src_jpg;
    img.src = src;
}




/**
 * checks to see if the service worker API is available, and if it is, the service worker at /sw.js is registered
 */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js').then(function (registration) {
            // Registration was successful
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, function (err) {
            // registration failed :(
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
    fetchNeighborhoods();
    fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
const fetchNeighborhoods = () => {
    DBHelper.fetchNeighborhoods((error, neighborhoods) => {
        if (error) { // Got an error
            console.error(error);
        } else {
            self.neighborhoods = neighborhoods;
            fillNeighborhoodsHTML();
        }
    });
}

/**
 * Set neighborhoods HTML.
 */
const fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
    const select = document.getElementById('neighborhoods-select');
    neighborhoods.forEach(neighborhood => {
        const option = document.createElement('option');
        option.innerHTML = neighborhood;
        option.value = neighborhood;
        select.append(option);
    });
}

/**
 * Fetch all cuisines and set their HTML.
 */
const fetchCuisines = () => {
    DBHelper.fetchCuisines((error, cuisines) => {
        if (error) { // Got an error!
            console.error(error);
        } else {
            self.cuisines = cuisines;
            fillCuisinesHTML();
        }
    });
}

/**
 * Set cuisines HTML.
 */
const fillCuisinesHTML = (cuisines = self.cuisines) => {
    const select = document.getElementById('cuisines-select');

    cuisines.forEach(cuisine => {
        const option = document.createElement('option');
        option.innerHTML = cuisine;
        option.value = cuisine;
        select.append(option);
    });
}

/**
 * Update page and map for current restaurants.
 */
const updateRestaurants = () => {
    const cSelect = document.getElementById('cuisines-select');
    const nSelect = document.getElementById('neighborhoods-select');

    const cIndex = cSelect.selectedIndex;
    const nIndex = nSelect.selectedIndex;

    const cuisine = cSelect[cIndex].value;
    const neighborhood = nSelect[nIndex].value;

    DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
        if (error) { // Got an error!
            console.error(error);
        } else {
            resetRestaurants(restaurants);
            fillRestaurantsHTML();
        }
    })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
const resetRestaurants = (restaurants) => {
    // Remove all restaurants
    self.restaurants = [];
    const ul = document.getElementById('restaurants-list');
    ul.innerHTML = '';

    // Remove all map markers
    self.restaurants = restaurants;
    //exit if Google Maps is disabled
    if (document.getElementById('map').classList.contains('inactive')) {
        return;
    }
    self.markers.forEach(m => m.setMap(null));
    self.markers = [];
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
const fillRestaurantsHTML = (restaurants = self.restaurants) => {
    const ul = document.getElementById('restaurants-list');
    restaurants.forEach(restaurant => {
        ul.append(createRestaurantHTML(restaurant));
    });
    if (document.getElementById('image-blurred-text').hidden) {
        addMarkersToMap();
    }
}

/**
 * Create restaurant HTML.
 */
const createRestaurantHTML = (restaurant) => {

    const li = document.createElement('li');

    const picture = document.createElement('picture');

    const picture_source_webp = document.createElement('source');
    picture_source_webp.setAttribute('type', 'image/webp');
    picture.append(picture_source_webp);

    const picture_source_jpg = document.createElement('source');
    picture_source_jpg.setAttribute('type', 'image/jpeg');
    picture.append(picture_source_jpg);

    const image = document.createElement('img');
    image.className = 'restaurant-img';
    image.alt = DBHelper.imageDescriptionForRestaurant(restaurant);
    // lazy load images only if the browser support Intersection Observer
    if ('IntersectionObserver' in window) {
        picture_source_webp.setAttribute('data-src', `${DBHelper.imageUrlForRestaurant(restaurant)}.webp`);
        picture_source_jpg.setAttribute('data-src', `${DBHelper.imageUrlForRestaurant(restaurant)}.jpg`);
        image.setAttribute('data-src', `${DBHelper.imageUrlForRestaurant(restaurant)}.jpg`);
    } else {
        picture_source_webp.setAttribute('srcset', `${DBHelper.imageUrlForRestaurant(restaurant)}.webp`);
        picture_source_jpg.setAttribute('srcset', `${DBHelper.imageUrlForRestaurant(restaurant)}.jpg`);
        image.src = `${DBHelper.imageUrlForRestaurant(restaurant)}.jpg`;
    }
    picture.append(image);
    li.append(picture);
    observer.observe(picture);

    const name = document.createElement('h1');
    name.innerHTML = restaurant.name + " ";
    const favorite_icon = document.createElement('i');
    favorite_icon.innerHTML = 'favorite';
    favorite_icon.classList.add('material-icons');
    favorite_icon.classList.add('restaurant-name_favorite');
    name.append(favorite_icon);
    li.append(name);

    const neighborhood = document.createElement('p');
    neighborhood.innerHTML = restaurant.neighborhood;
    li.append(neighborhood);

    const address = document.createElement('p');
    address.innerHTML = restaurant.address;
    li.append(address);

    const more = document.createElement('button');
    more.innerHTML = 'View Details';
    more.addEventListener("click", function () {
        window.location.href = DBHelper.urlForRestaurant(restaurant);
    });
    li.append(more)

    return li
}

/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = (restaurants = self.restaurants) => {
    restaurants.forEach(restaurant => {
        // Add marker to the map
        const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
        google.maps.event.addListener(marker, 'click', () => {
            window.location.href = marker.url
        });
        self.markers.push(marker);
    });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
    let loc = {
        lat: 40.722216,
        lng: -73.987501
    };
    self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 12,
        center: loc,
        gestureHandling: 'cooperative'
    });
    updateRestaurants();
    document.getElementById('map').classList.remove('inactive');
    document.getElementById('image-blurred').classList.remove('blur');
    document.getElementById('image-blurred-text').hidden = true;
}

window.googleMapsError = () => {
    console.log('Google Maps Error to handle');
}

function gm_authFailure() {
    console.log('Google Maps Error to handle');
}

function showMap() {
    const scrMaps = document.getElementById('GoogleMaps');
    scrMaps.src = scrMaps.dataset.src;
}

window.addEventListener('load', (event) => {
    updateRestaurants();
    document.getElementById('map-container').addEventListener("click", showMap);
});
//# sourceMappingURL=main_all.js.map
