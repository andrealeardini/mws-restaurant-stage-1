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
                        DBHelper.fetchRestaurantsFromNetwork(callback);
                    }
                });
            } else {
                DBHelper.fetchRestaurantsFromNetwork(callback);
            }
        });
        DBHelper.fetchRestaurantsFromNetwork(callback);
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
        if (!('indexedDB' in window)) {
            console.log('This browser doesn\'t support IndexedDB');
            return Promise.resolve();
        }

        return idb.open('restaurants-reviews', 1, upgradeDb => {
            switch (upgradeDb.oldVersion) {
                case 0:
                    upgradeDb.createObjectStore('restaurants', {
                        keyPath: 'id'
                    });
                case 1:
                    // const restaurantsStore = upgradeDb.transaction.objectStore('restaurants');
                    // restaurantsStore.createIndex('indexName', 'property');
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

        let tx = DBHelper.dbPromise.transaction('restaurants', 'readwrite');
        let restaurantsStore = tx.objectStore('restaurants');
        data.forEach(function (restaurant) {
            restaurantsStore.put(restaurant);
        });
        return tx.complete;
    }
}