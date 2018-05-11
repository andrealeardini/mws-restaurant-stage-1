let restaurants,
    neighborhoods,
    cuisines
let map
let markers = []
let google

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
    const source = picture.getElementsByTagName('source')[0]
    const img = picture.getElementsByTagName('img')[0]
    const src = source.dataset.src;
    if (!src) {
        return;
    }
    source.srcset = src;
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
    self.markers.forEach(m => m.setMap(null));
    self.markers = [];
    self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
const fillRestaurantsHTML = (restaurants = self.restaurants) => {
    const ul = document.getElementById('restaurants-list');
    restaurants.forEach(restaurant => {
        ul.append(createRestaurantHTML(restaurant));
    });
    addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
const createRestaurantHTML = (restaurant) => {

    const li = document.createElement('li');

    const picture = document.createElement('picture');
    const picture_source = document.createElement('source');
    picture_source.setAttribute('type', 'image/webp');
    picture.append(picture_source);
    const image = document.createElement('img');
    image.className = 'restaurant-img';
    image.alt = DBHelper.imageDescriptionForRestaurant(restaurant);
    // lazy load images only if the browser support Intersection Observer
    if (!('IntersectionObserver' in window)) {
        picture_source.setAttribute('data-src', `${DBHelper.imageUrlForRestaurant(restaurant)}.webp`);
        image.setAttribute('data-src', `${DBHelper.imageUrlForRestaurant(restaurant)}.jpg`);
    } else {
        picture_source.setAttribute('srcset', `${DBHelper.imageUrlForRestaurant(restaurant)}.webp`);
        image.src = `${DBHelper.imageUrlForRestaurant(restaurant)}.jpg`;
    }
    picture.append(image);
    li.append(picture);
    observer.observe(picture);

    const name = document.createElement('h1');
    name.innerHTML = restaurant.name;
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
    document.getElementById('map-container').addEventListener("click", showMap);
}

function showMap() {
    setTimeout(function () {
        document.getElementById('map').classList = '';
    }, 0);
}