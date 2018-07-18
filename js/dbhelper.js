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

    return idb.open('restaurants-reviews', 2, upgradeDb => {
      switch (upgradeDb.oldVersion) {
        case 0:
          upgradeDb.createObjectStore('restaurants', {
            keyPath: 'id'
          });
        case 1:
          // do something
          upgradeDb.createObjectStore('reviews', {
            keyPath: 'id'
          });
          var reviewsStore = upgradeDb.transaction.objectStore('reviews');
          reviewsStore.createIndex('restaurant', 'restaurant_id');
      }
    });

  }

  static addRestaurantToDB(db, data) {
    if (!db) return;
    console.log('Adding record');
    const tx = db.transaction('restaurants', 'readwrite');
    const restaurantsStore = tx.objectStore('restaurants');
    restaurantsStore.put(data);
    console.log('Record added');
    return tx.complete;
  }

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

    let tx = DBHelper.dbPromise.transaction('restaurants', 'readwrite');
    let restaurantsStore = tx.objectStore('restaurants');
    data.forEach(function (restaurant) {
      restaurantsStore.put(restaurant);
    });
    console.log('Local DB Updated from Network');
    return tx.complete;
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
   * add restaurant to offline db (will be synch when online)
   */
  static addRestaurantToOfflineDB(restaurant) {
    if (!(DBHelper.dbOpened)) {
      return;
    }
    let tx = DBHelper.dbPromise.transaction('offline-restaurants', 'readwrite');
    let restaurantsStore = tx.objectStore('offline-restaurants');
    restaurantsStore.put(restaurant);
    return tx.complete;
  }

  /**
   * Update the favorite status of the restaurant
   */
  static updateFavorite(id, value, callback) {
    return fetch(`http://localhost:1337/restaurants/${id}/?is_favorite=${value}`, {
      method: 'PUT',
    }).then(function () {
      console.log(`Send PUT with favorite=${value}`);
      return DBHelper.fetchRestaurantById(id, (error, restaurant) => {
        self.restaurant = restaurant;
        if (!restaurant) {
          console.error(error);
          callback(error, null);
        }
        console.log(restaurant);
        restaurant.is_favorite = value;
        return DBHelper.updateRestaurantLocalDB(restaurant).then(function () {
          callback(null, true);
        });
      });
    }).catch(function (error) {
      console.log('Error when try to fetch data on server... ', error);
      // save data offline
      return DBHelper.fetchRestaurantById(id, (error, restaurant) => {
        self.restaurant = restaurant;
        if (!restaurant) {
          console.error(error);
          callback(error, null);
        }
        console.log(restaurant);
        restaurant.is_favorite = value;
        // update the date
        restaurant.updatedAt = new Date();
        return DBHelper.updateRestaurantLocalDB(restaurant).then(function () {
          console.log('Restaurant saved on the local DB');
          callback(null, true);
        });
      });
    });
  }

  /**
   * Delete restaurant from offline-restaurants db.
   */
  static deleteRestaurantFromOffline(restaurant) {
    const tx = DBHelper.dbPromise.transaction('offline-restaurants', 'readwrite');
    const restaurantsStore = tx.objectStore('offline-restaurants');
    return restaurantsStore.delete(restaurant.id);
  }

  /**
   * Sync all changed to the restaurants 
   */
  static syncRestaurants() {
    let restaurantsFromServer = [];
    let restaurantsFromLocalDB = [];

    return DBHelper.openDB().then(function (db) {
      if (db) {
        DBHelper.dbPromise = db;
        console.log(DBHelper.dbPromise);
        DBHelper.getRestaurantsFromDB().then(restaurants => {
          if (restaurants.length) {
            restaurantsFromLocalDB = restaurants;
          } else {
            console.log('No restaurants in local DB');
            return;
          }
        }).then(function () {
          console.log('Restaurants from local DB: ', restaurantsFromLocalDB);
          return DBHelper.fetchRestaurantsFromNetwork((error, restaurants) => {
            if (error) {
              return error;
            }
            if (restaurants.length) {
              restaurantsFromServer = restaurants;
              console.log('Restaurants from server: ', restaurantsFromServer);
              // 
              restaurantsFromServer.forEach(function (restaurantFromServer) {
                const restaurantFromLocalDB = restaurantsFromLocalDB.find(r => r.id == restaurantFromServer.id);
                if (restaurantFromLocalDB) { // Got the restaurant
                  const server_updatedAt = new Date(restaurantFromServer.updatedAt);
                  const localDB_updatedAt = new Date(restaurantFromLocalDB.updatedAt);
                  // ignore the record with the same date
                  if (server_updatedAt > localDB_updatedAt) {
                    DBHelper.updateRestaurantLocalDB(restaurantFromServer);
                    console.log('Update local DB:', restaurantFromServer);
                    DBHelper.setFavoriteStatus(restaurantFromServer);
                  }
                  if (server_updatedAt < localDB_updatedAt) {
                    DBHelper.saveFavoriteToNetwork(restaurantFromLocalDB);
                    console.log('Update network DB:', restaurantFromLocalDB);
                    DBHelper.setFavoriteStatus(restaurantFromLocalDB);
                  }
                } else { // Restaurant does not exist in the database
                  console.log('Restaurant does not exist');
                }

              });
            }
          }, false);
        }).catch(function (error) {
          console.log('Error in sync');
        });
      }
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
            DBHelper.fetchReviewsFromNetwork(callback);
          }
        });
      } else {
        console.log('db not found');
        DBHelper.fetchReviewsFromNetwork(callback);
      }
    }).then(function () {}).catch(function () {
      console.log('Catch the promise error');
      DBHelper.fetchReviewsFromNetwork(callback);
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
   * Fetch all reviews from network.
   */
  static fetchReviewsFromNetwork(callback, saveToDB = true) {
    let restaurant_id;
    for (let index = 0; index < 10; index++) {
      let xhr = new XMLHttpRequest();
      restaurant_id = index + 1;
      xhr.open('GET', `${DBHelper.DATABASE_REVIEWS_URL}/?restaurant_id=${restaurant_id}`);
      xhr.onload = () => {
        if (xhr.status === 200) { // Got a success response from server!
          const reviews = JSON.parse(xhr.responseText);
          console.log('Reviews lette dal server');
          callback(null, reviews);
          // write reviews to db
          if (saveToDB) {
            DBHelper.saveReviewsToDB(reviews);
          }
        } else { // Oops!. Got an error from server.
          const error = (`Request failed. Returned status of ${xhr.status}`);
          callback(error, null);
        }
      };
      xhr.send();

    }
  }

  /*
   * Save reviews to local database
   */
  static saveReviewsToDB(data) {
    if (!(DBHelper.dbOpened)) {
      return;
    }

    let tx = DBHelper.dbPromise.transaction('reviews', 'readwrite');
    let reviewsStore = tx.objectStore('reviews');
    data.forEach(function (reviews) {
      reviews.restaurant_id = parseInt(reviews.restaurant_id);
      reviewsStore.put(reviews);
    });
    console.log('Local reviews DB updated from Network');
    return tx.complete;
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