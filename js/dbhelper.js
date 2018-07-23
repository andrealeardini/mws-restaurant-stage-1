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