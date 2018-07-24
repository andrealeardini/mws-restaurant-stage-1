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
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  static get DATABASE_REVIEWS_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/reviews`;
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
    });
  }

  /**
   * Fetch all restaurants from network.
   */
  static fetchRestaurantsFromNetwork(callback, saveToDB = true) {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', DBHelper.DATABASE_URL);
    xhr.onload = () => {
      if (xhr.status === 200) { // Got a success response from server!
        const restaurants = JSON.parse(xhr.responseText);
        console.log('Ristoranti letti dal server');
        callback(null, restaurants);
        // write restaurants to db
        if (saveToDB) {
          DBHelper.saveRestaurantsToDB(restaurants);
        }
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
        let results = restaurants;
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
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
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
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
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
      'Inside view of the Mission Chinese Food restaurant. Many people talk to each other',
      'A pizza cut into six slices',
      'Inside view of Kang Ho Dong Baekjeong restaurant. You can see various modern style tables and chairs',
      'Panoramic photo of the entrance. You can see the two streets on which the restaurant overlooks',
      'Inside view of the Roberto\'s Pizza. In the background, see the kitchen and some pizza makers',
      'Inside view of the Hometown BBQ restaurant. On the wall a huge US flag',
      'Two people walking around the restaurand. You can see some customers inside',
      'Detail of the The Dutch banner',
      'Inside view of the Mu Ramen restaurant. Some customers eat using the typical oriental chopsticks',
      'Inside view of restaurant. You see the counter with the window and several bottles.'
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

    return idb.open('restaurants-reviews', 4, upgradeDb => {
      switch (upgradeDb.oldVersion) {
        case 0:
          upgradeDb.createObjectStore('restaurants', {
            keyPath: 'id'
          });
        case 1:
          upgradeDb.createObjectStore('reviews', {
            keyPath: 'id'
          });
          var reviewsStore = upgradeDb.transaction.objectStore('reviews');
          reviewsStore.createIndex('restaurant', 'restaurant_id');
        case 2:
          upgradeDb.createObjectStore('offline-reviews', {
            keyPath: 'id',
            autoIncrement: true
          });
        case 3:
          upgradeDb.createObjectStore('offline-favorites', {
            keyPath: 'id',
            autoIncrement: true
          });
      }
    });

  }

  /**
   * Delete a restaurants from local DB
   */
  static deleteRestaurantsFromDB(db = DBHelper.db) {
    if (!db) return;
    const tx = db.transaction('restaurants', 'readwrite');
    const restaurantsStore = tx.objectStore('restaurants');
    restaurantsStore.clear();
    console.log('Restaurants deleted');
    return tx.complete;
  }

  /**
   * Save the restaurant in the local DB
   */
  static addRestaurantToDB(db, data) {
    if (!db) return;
    console.log('Adding record');
    const tx = db.transaction('restaurants', 'readwrite');
    const restaurantsStore = tx.objectStore('restaurants');
    restaurantsStore.put(data);
    console.log('Record added');
    return tx.complete;
  }

  /**
   * Get all restaurants from local DB
   */
  static getRestaurantsFromDB() {
    if (!DBHelper.dbPromise) return;
    const tx = DBHelper.dbPromise.transaction('restaurants', 'readonly');
    const restaurantsStore = tx.objectStore('restaurants');
    return restaurantsStore.getAll();
  }


  /*
   * Save data to local database
   */
  static saveRestaurantsToDB(data) {
    if (!(DBHelper.dbOpened)) {
      return;
    }
    if (navigator.onLine == true) {
      DBHelper.deleteRestaurantsFromDB();
      let tx = DBHelper.dbPromise.transaction('restaurants', 'readwrite');
      let restaurantsStore = tx.objectStore('restaurants');
      data.forEach(function (restaurant) {
        restaurantsStore.put(restaurant);
      });
      console.log('Local DB Updated from Network');
      return tx.complete;
    } else {
      return false;
    }
  }

  /*
   * Update favorite to local database
   */
  static updateRestaurantLocalDB(restaurant) {
    if (!(DBHelper.dbOpened)) {
      return;
    }
    let tx = DBHelper.dbPromise.transaction('restaurants', 'readwrite');
    let restaurantsStore = tx.objectStore('restaurants');
    restaurantsStore.put(restaurant);
    return tx.complete;
  }

  /*
   * add review to offline db (will be synch when online)
   */
  static addReviewToOfflineDB(review) {
    if (!(DBHelper.dbOpened)) {
      return;
    }
    let tx = DBHelper.dbPromise.transaction('offline-reviews', 'readwrite');
    let offlineStore = tx.objectStore('offline-reviews');
    offlineStore.put(review);
    return tx.complete;
  }

  /**
   * Get all offline reviews from local DB
   */
  static getReviewsOffline() {
    if (!DBHelper.dbPromise) return;
    const tx = DBHelper.dbPromise.transaction('offline-reviews', 'readonly');
    const offlineStore = tx.objectStore('offline-reviews');
    return offlineStore.getAll();
  }

  /**
   * Delete review from offline-reviews db.
   */
  static deleteReviewFromOffline(review) {
    const tx = DBHelper.dbPromise.transaction('offline-reviews', 'readwrite');
    const offlineStore = tx.objectStore('offline-reviews');
    return offlineStore.delete(review.id);
  }

  /*
   * add favorite to offline db (will be synch when online)
   */
  static addFavoriteToOfflineDB(favorite) {
    if (!(DBHelper.dbOpened)) {
      return;
    }
    let tx = DBHelper.dbPromise.transaction('offline-favorites', 'readwrite');
    let offlineStore = tx.objectStore('offline-favorites');
    offlineStore.put(favorite);
    return tx.complete;
  }


  /**
   * Get favorites from offline-favorites db.
   */
  static getFavoritesOffline() {
    if (!DBHelper.dbPromise) return;
    const tx = DBHelper.dbPromise.transaction('offline-favorites', 'readonly');
    const offlineStore = tx.objectStore('offline-favorites');
    return offlineStore.getAll();
  }

  /**
   * Delete favorites from offline-favorites db.
   */
  static deleteFavoriteFromOffline(favorite) {
    const tx = DBHelper.dbPromise.transaction('offline-favorites', 'readwrite');
    const offlineStore = tx.objectStore('offline-favorites');
    return offlineStore.delete(favorite.id);
  }

  /**
   * Update the favorite status of the restaurant
   */
  static updateFavorite(favorite) {
    return fetch(`${DBHelper.DATABASE_URL}/${favorite.id}/?is_favorite=${favorite.value}`, {
      method: 'PUT',
    }).then(function () {
      console.log(`Sended PUT with favorite=${favorite.value}`);
    }).catch(function (error) {
      console.log('Error when try to fetch data on server. Favorite saved offline.', error);
      DBHelper.addFavoriteToOfflineDB(favorite);
    });
  }


  /**
   * Send all offline favorites to the server
   */
  static sendOfflineFavoritesToServer(callback) {
    // read all offline favorites
    return DBHelper.getFavoritesOffline().then(favorites => {
      // send favorites to the server
      favorites.forEach(favorite => {
        return DBHelper.updateFavorite(favorite).then(function () {
          toast('Favorites offline submitted', 5000);
          DBHelper.deleteFavoriteFromOffline(favorite);
        }).catch(function (error) {
          console.log('Sending favorite offline.... Oops! Something went wrong.', error);
        });
      });
    });
  }

  /**
   * Send all offline reviews to the server
   */
  static sendOfflineReviewsToServer() {
    // read all offline reviews
    return DBHelper.getReviewsOffline().then(reviews => {
      // send reviews to the server
      reviews.forEach(review => {
        var FD = new FormData();
        // setting form data
        FD.append('restaurant_id', review.restaurant_id);
        FD.append('name', review.name);
        FD.append('rating', review.rating);
        FD.append('comments', review.comments);
        return fetch(`${DBHelper.DATABASE_REVIEWS_URL}/`, {
          method: 'POST',
          body: FD
        }).then(function () {
          console.log('Review offline submitted');
          toast('Review offline submitted', 5000);
          return DBHelper.fetchReviewsFromNetwork(getParameterByName('id'), (error, reviews) => {
            console.log('Review sended and fetch data');
            fillReviewsHTML(reviews, false, true);
            DBHelper.deleteReviewFromOffline(review);
          }, true);
        }).catch(function (error) {
          toast('Sending review offline.... Oops! Something went wrong.', 5000);
        });
      });
    });
  }


  /**
   * Sync all changed to the restaurants 
   */
  static syncFavorites() {
    DBHelper.sendOfflineFavoritesToServer((error, favorites) => {
      if (error) {
        console.error('SyncRestaurants: ', error);
        return error;
      }
    });
  }


  /**
   * Sync all changed to the reviews of the current restaurant 
   */
  static syncReviews(restaurant_id, callback) {
    // send ALL offline reviews (this one and the others restaurants)
    return DBHelper.sendOfflineReviewsToServer().then(() => {}).then(() => {}).catch((error) => {
      console.log('SyncReviews: ', error);
      return error;
    });
  }

  /*
   * Set favorite status
   */
  static setFavoriteStatus(restaurant) {
    if (restaurant.is_favorite) {
      const favorite = document.getElementById(restaurant.id);
      if ((restaurant.is_favorite == true) || (restaurant.is_favorite == 'true')) {
        favorite.classList.add('restaurant-name_isfavorite');
      } else {
        favorite.classList.remove('restaurant-name_isfavorite');
      }
    }
  }



  /*
   * Save favorite to network
   */
  static saveFavoriteToNetwork(restaurant) {
    return DBHelper.updateFavorite(restaurant.id, restaurant.is_favorite, (error, updated) => {
      if (updated) {
        console.log('Favorite Updated from LocalDB');
      }
    });
  }

  /**
   * Fetch all reviews.
   * @restaurant_id : if specified fetch only the reviews of this restaurants
   */
  static fetchReviews(restaurant_id, callback) {

    // open DB and set dbPromise
    return DBHelper.openDB().then(function (db) {
      if (db) {
        DBHelper.dbPromise = db;
        console.log(DBHelper.dbPromise);
        // Read reviews from DB;
        return DBHelper.getReviewsFromDB(restaurant_id).then(reviews => {
          if (reviews.length) {
            return callback(null, reviews);
          } else {
            console.log('No reviews in db');
            return DBHelper.fetchReviewsFromNetwork(restaurant_id, callback);
          }
        });
      } else {
        console.log('db not found');
        return DBHelper.fetchReviewsFromNetwork(restaurant_id, callback);
      }
    }).then(function () {}).catch(function () {
      console.log('Catch the promise error');
      return DBHelper.fetchReviewsFromNetwork(restaurant_id, callback);
    });
  }

  /**
   * Fetch a review by its ID.
   */
  static fetchReviewById(id, callback) {
    // fetch all reviews with proper error handling.
    DBHelper.fetchReviews(null, (error, reviews) => {
      if (error) {
        callback(error, null);
      } else {
        const review = reviews.find(r => r.id == id);
        if (review) { // Got the review
          callback(null, review);
        } else { // review does not exist in the database
          callback('Review does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch all reviews of the restaurant from network.
   */
  static fetchReviewsFromNetwork(restaurant_id, callback, saveToDB = true) {
    // Restaurant Reviews
    // Offline USE
    // The client application works offline.
    // JSON responses are cached using the IndexedDB API.
    // Any data PREVIOUSLY accessed while connected is reachable while offline.

    return fetch(`${DBHelper.DATABASE_REVIEWS_URL}/?restaurant_id=${restaurant_id}`, {
      method: 'GET'
    }).then(function (response) {
      return response.json();
    }).then(function (json) {
      let reviews = json;
      console.log(`Restaurant: ${restaurant_id} Reviews lette dal server: `, reviews);
      // write reviews to db
      if (saveToDB) {
        return DBHelper.saveReviewsToDB(restaurant_id, reviews).then(() => {
          return callback(null, reviews);
        });
      } else {
        return callback(null, reviews);
      }
    }).catch(function (error) {
      return callback(error, null);
    });
  }



  /*
   * Save reviews to local database
   */
  static saveReviewsToDB(restaurant_id, data) {
    if (!(DBHelper.dbOpened)) {
      return;
    }
    // delete all reviews of this restaurants
    if (navigator.onLine == true) {
      return DBHelper.deleteReviewsFromDB(restaurant_id).then(() => {
        let tx = DBHelper.dbPromise.transaction('reviews', 'readwrite');
        let reviewsStore = tx.objectStore('reviews');
        console.log('Local reviews to save: ', data);
        data.forEach(function (review) {
          review.restaurant_id = parseInt(review.restaurant_id);
          reviewsStore.put(review);
          console.log('Local review DB updated from Network: ', review);
        });
        return tx.complete;
      });
    } else {
      return false;
    }
  }


  /**
   * delete all reviews of the restaurant in the local DB
   *
   */
  static deleteReviewsFromDB(restaurant_id) {
    if (!DBHelper.dbPromise) return;
    return DBHelper.getReviewsFromDB(restaurant_id).then(reviews => {
      const tx = DBHelper.dbPromise.transaction('reviews', 'readwrite');
      const reviewsStore = tx.objectStore('reviews');
      reviews.forEach(review => {
        reviewsStore.delete(review.id);
      });
      return tx.complete;
    });
  }


  /**
   * get all reviews.
   * @restaurant_id : if specified get only the reviews of this restaurants
   */
  static getReviewsFromDB(restaurant_id) {
    if (!DBHelper.dbPromise) return;
    const tx = DBHelper.dbPromise.transaction('reviews', 'readonly');
    const reviewsStore = tx.objectStore('reviews');
    if (!restaurant_id) {
      return reviewsStore.getAll();
    } else {
      let index = reviewsStore.index('restaurant');
      return index.getAll(Number(restaurant_id));
    }
  }
}
var restaurant;
var reviews;
var map;


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
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        gestureHandling: 'cooperative'
      });
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
      document.getElementById('map').classList.remove('inactive');
      document.getElementById('image-blurred').hidden = true;
      document.getElementById('image-blurred-text').hidden = true;
    }
  });
};


/**
 * Get current restaurant from page URL.
 */
function fetchRestaurantFromURL(callback, syncro = false) {
  if ((self.restaurant) && (syncro == false)) { // restaurant already fetched!
    callback(null, self.restaurant);
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    const error = 'No restaurant id in URL';
    callback(error, null);
  } else {

    DBHelper.fetchReviews(id, (error, reviews) => {
      self.reviews = reviews;
      DBHelper.fetchRestaurantById(id, (error, restaurant) => {
        self.restaurant = restaurant;
        if (!restaurant) {
          console.error(error);
          return;
        }
        fillRestaurantHTML();
        callback(null, restaurant);
      });
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const favorite_fab = document.getElementById('favorite-fab');
  // will use restaurant id to set field in DB
  favorite_fab.id = restaurant.id;
  if (restaurant.is_favorite) {
    if ((restaurant.is_favorite == true) || (restaurant.is_favorite == 'true')) {
      favorite_fab.classList.add('restaurant-name_isfavorite');
    }
  }

  favorite_fab.addEventListener('click', onFavoriteClick);

  const add_fab = document.getElementById('add-fab');
  add_fab.addEventListener('click', onCreateReview);

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const picture = document.getElementById('restaurant-picture');
  const picture_source = document.createElement('source');
  picture_source.setAttribute('type', 'image/webp');
  picture_source.setAttribute('srcset', `${DBHelper.imageUrlForRestaurant(restaurant)}.webp`);
  picture.append(picture_source);
  const image = document.createElement('img');
  image.id = 'restaurant-img';
  image.alt = DBHelper.imageDescriptionForRestaurant(restaurant);
  image.src = `${DBHelper.imageUrlForRestaurant(restaurant)}.jpg`;
  picture.append(image);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    day.className = 'restaurant-day';
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
};

/**
 * Create all reviews HTML and add them to the webpage.
 * @reviews the reviews to fill in the container
 * @add_offline true to add the reviews from offline db without clear the container
 * @refresh true if the container is already filled, refresh only the reviews
 */
function fillReviewsHTML(reviews = self.reviews, add_offline = false, refresh = false) {
  const container = document.getElementById('reviews-container');
  if (refresh == false) {
    const title = document.createElement('h2');
    title.innerHTML = 'Reviews';
    container.appendChild(title);
  }

  if (!reviews) {
    const noReviews = document.createElement('p');
    if (navigator.onLine == true) {
      noReviews.innerHTML = 'No reviews yet!';
    } else {
      noReviews.innerHTML = 'You are offline and it seems that is the first time that you visit this restaurants. All reviews will be cached when you visit the page online';
    }
    container.appendChild(noReviews);
    return;
  }
  // sort revies by date (from last to first)
  reviews.reverse();
  const ul = document.getElementById('reviews-list');
  if (add_offline == false) {
    ul.innerHTML = '';
  }
  reviews.forEach(review => {
    if (add_offline == true) {
      ul.insertBefore(createReviewHTML(review, add_offline), ul.firstChild);
      ul.firstChild.focus();
    } else {
      ul.appendChild(createReviewHTML(review, add_offline));
    }
  });
  container.appendChild(ul);

}

/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = (review, add_offline) => {
  const li = document.createElement('li');

  const header = document.createElement('div');
  header.className = 'reviews-header';
  const name = document.createElement('p');
  name.innerHTML = review.name;
  name.className = 'reviews-name';
  header.appendChild(name);

  if (add_offline == false) {
    const date = document.createElement('p');
    let reviewDate = new Date(review.updatedAt).toLocaleDateString();
    date.innerHTML = reviewDate;
    date.className = 'reviews-date';
    header.appendChild(date);
  } else {
    const offline_icon = document.createElement('i');
    offline_icon.innerText = 'offline_bolt';
    offline_icon.classList.add('material-icons');
    offline_icon.classList.add('review-offline');
    header.appendChild(offline_icon);
  }

  li.appendChild(header);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  rating.className = 'reviews-rating';
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
const fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = DBHelper.urlForRestaurant(restaurant);
  a.innerHTML = restaurant.name;
  a.setAttribute('aria-current', 'page');
  li.appendChild(a);
  breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};

function showMap() {
  const scrMaps = document.getElementById('GoogleMaps');
  scrMaps.src = scrMaps.dataset.src;
}

window.googleMapsError = () => {
  console.log('Google Maps Error to handle');
};

function gm_authFailure() {
  console.log('Google Maps Error to handle');
}

window.addEventListener('load', (event) => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      fillBreadcrumb();
      document.getElementById('map-container').addEventListener('click', showMap);
    }
  });
});

function onFavoriteClick(e) {
  const favoriteHTML = e.target.parentElement;
  console.log('Click on favorite: ', favoriteHTML.id);
  let favorite = {
    id: favoriteHTML.id,
    value: 'false'
  };
  if (!(favoriteHTML.classList.contains('app-fab--isfavorite'))) {
    favorite.value = 'true';
  }

  DBHelper.updateFavorite(favorite).then(() => {
    console.log('onFavoriteClick: favorite updated');
  });

  if (favorite.value == 'true') {
    favoriteHTML.setAttribute('aria-label', 'The restaurant is marked as favorite');
  } else {
    favoriteHTML.setAttribute('aria-label', 'Click to mark the restaurant as favorite');
  }
  favoriteHTML.classList.toggle('app-fab--isfavorite');
}


window.addEventListener('online', (event) => {
  // console.log("You are online")
  let offline = document.getElementById('offline');
  offline.classList.remove('show');
  toast('You are online.' + '\n' +
    'All the changes will be synchronized.', 5000, true);
  // reload the restaurant and update the reviews
  DBHelper.syncFavorites();
  let restaurant_id = getParameterByName('id');
  DBHelper.syncReviews(restaurant.id, (error, reviewsDB) => {
    if (error) {
      console.log(error);
      return error;
    }
  });
});

window.addEventListener('offline', (event) => {
  // console.log("You are offline")
  let offline = document.getElementById('offline');
  offline.classList.add('show');
  toast('You are offline.' + '\n' +
    'All the changes will be synchronized when you return online.', 5000, true);
});

/**
 * Show a toast
 * @msg the message to show
 * @milliseconds the durate of the toast in millisenconds
 * @priority set to true to override the previous toast if is still displayed
 * 
 * by Andrea Leardini
 */
function toast(msg, millisenconds, priority = false) {
  let toastHTML = document.getElementById('toast');
  let timer;
  if ((toastHTML.classList.contains('show') == true) {
      // avoid to display the same messagere multiple times
      if (msg == toastHTML.innerText) {
        return;
      }
      if (priority == false)) {
      setTimeout(() => {
        // wait until the previeous message is hide
        clearTimeout(timer);
        toast(msg, millisenconds, priority);
      }, 2000);
      return;
    }
  }
  toastHTML.innerText = msg;
  toastHTML.classList.add('show');
  // After x milliseconds hide the toast
  timer = setTimeout(() => {
    toastHTML.classList.remove('show');
  }, millisenconds);
}

window.addEventListener('DOMContentLoaded', (event) => {
  if ((!navigator.onLine)) {
    let offline = document.getElementById('offline');
    offline.classList.add('show');
  }
});

/**
 * Create a new review.
 */
function onCreateReview() {
  const ul = document.getElementById('reviews-list');
  const li = document.createElement('li');
  li.classList.add('addReview');

  const form = document.createElement('form');

  const header = document.createElement('div');
  header.className = 'reviews-header';
  const title = document.createElement('h3');
  title.innerText = 'New review';
  header.appendChild(title);

  form.appendChild(header);

  const id = document.createElement('input');
  const favorite_fab = document.getElementsByClassName('app-fab--favorite')[0];
  id.value = favorite_fab.id;
  id.name = 'restaurant_id';
  id.type = 'hidden';
  form.appendChild(id);

  const name = document.createElement('input');
  name.className = 'reviews-name';
  name.placeholder = 'Insert your name';
  name.required = true;
  name.name = 'name';
  form.appendChild(name);

  const rating = document.createElement('p');
  rating.className = 'reviews-rating';
  rating.innerText = 'Rating: ';
  const scores = document.createElement('select');
  scores.classList.add('reviews-rating-score');
  for (let i = 1; i <= 5; i++) {
    let score = document.createElement('option');
    score.id = `score${i}`;
    score.value = i;
    score.innerText = i;
    scores.appendChild(score);
    scores.name = 'rating';
  }
  rating.appendChild(scores);

  form.appendChild(rating);

  const comments = document.createElement('textarea');
  comments.placeholder = 'Type your review here...';
  comments.className = 'reviews-comments';
  comments.required = true;
  comments.name = 'comments';

  comments.addEventListener('input', (event) => {
    comments.style.height = 'auto';
    comments.style.height = `${comments.scrollHeight}px`;
  });

  form.appendChild(comments);

  // add Save and Delete icons
  const save = document.createElement('button');
  save.classList.add('mdc-fab', 'mdc-fab--mini', 'rew-fab--save');
  const span = document.createElement('span');
  span.innerText = 'save';
  span.classList.add('mdc-fab__icon', 'material-icons');
  save.type = 'submit';
  save.appendChild(span);
  form.appendChild(save);

  const delete_btn = document.createElement('button');
  delete_btn.classList.add('mdc-fab', 'mdc-fab--mini', 'rew-fab--delete');
  const span_delete = document.createElement('span');
  span_delete.innerText = 'delete';
  span_delete.classList.add('mdc-fab__icon', 'material-icons');
  delete_btn.appendChild(span_delete);
  form.appendChild(delete_btn);

  li.appendChild(form);
  ul.insertBefore(li, ul.firstChild);
  delete_btn.focus();
  name.focus();

  // disable create and favorite buttons
  const add_fab = document.getElementById('add-fab');
  add_fab.classList.add('app-fab--hide');
  favorite_fab.classList.add('app-fab--hide');

  delete_btn.addEventListener('click', (event) => {
    event.preventDefault();
    if ((name.value != '') | (comments.value != '')) {
      let delConfirm = document.getElementById('delConfirm');
      let cancelButton = document.getElementById('delConfirm-cancel');
      let confirmButton = document.getElementById('delConfirm-confirm');

      delConfirm.showModal();

      // Cancel button closes the dialog box and return
      cancelButton.addEventListener('click', () => {
        delConfirm.close();
        return;
      });
      // Confirm button closes the dialog box and the review
      confirmButton.addEventListener('click', () => {
        delConfirm.close();
        closeReview();
      });
    } else {
      closeReview();
    }
  });

  function closeReview() {
    console.log('Review closed');
    add_fab.classList.remove('app-fab--hide');
    favorite_fab.classList.remove('app-fab--hide');
    li.remove();
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    sendData();
  });

  function sendData() {
    // Bind the FormData object and the form element
    let FD = new FormData(form);
    // Define what happens on successful data submission
    if (navigator.onLine) {
      let XHR = new XMLHttpRequest();
      XHR.addEventListener('load', function (event) {
        toast('The review is submitted', 5000);
        closeReview();
        DBHelper.fetchReviewsFromNetwork(getParameterByName('id'), (error, reviews) => {
          console.log('Review sended and fetch data');
          fillReviewsHTML(reviews, false, true);
        }, true);
      });
      // Define what happens in case of error
      XHR.addEventListener('error', function (event) {
        toast('Oops! Something went wrong.', 5000);
      });
      // Set up our request
      XHR.open('POST', `${DBHelper.DATABASE_REVIEWS_URL}/`);

      // The data sent is what the user provided in the form
      XHR.send(FD);
    } else {
      let review = {
        restaurant_id: FD.get('restaurant_id'),
        name: FD.get('name'),
        rating: FD.get('rating'),
        comments: FD.get('comments')
      };
      DBHelper.addReviewToOfflineDB(review).then(() => {
        toast('The review is saved. Will be submitted when you return online', 7000);
        DBHelper.getReviewsOffline().then(reviews => {
          closeReview();
          reviews.reverse();
          fillReviewsHTML(reviews, true, true);
        })
      });
    }
  }
}
//# sourceMappingURL=restaurant_all.js.map
