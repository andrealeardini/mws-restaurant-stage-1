let restaurants,
  neighborhoods,
  cuisines;
// use var to define map to avoid an error with API
var map;
var markers = [];
var google;

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
};
let observer = new IntersectionObserver(showImage, options);

/**
 * loads the picture
 */
function loadPicture(picture) {
  const source_webp = picture.getElementsByTagName('source')[0];
  const source_jpg = picture.getElementsByTagName('source')[1];
  const img = picture.getElementsByTagName('img')[0];

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
};

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
};

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
};

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
};

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
  });
};

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
};

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
};

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
  name.innerHTML = restaurant.name;
  li.append(name);


  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('button');
  more.classList.add('button');
  more.innerHTML = 'View Details';
  more.addEventListener('click', function () {
    window.location.href = DBHelper.urlForRestaurant(restaurant);
  });
  li.append(more);

  DBHelper.getFavoritesOffline().then(favorites => {
    if (favorites.length) {
      const results = favorites.filter(r => r.id == restaurant.id);
      if (results.length) {
        restaurant.is_favorite = results[0].value;
      }
    }

    const favorite_btn = document.createElement('button');
    favorite_btn.classList.add('mdc-fab', 'mdc-fab--mini', 'app-fab--favorite');

    const favorite_fab = document.createElement('span');
    favorite_fab.classList.add('mdc-fab__icon', 'material-icons');
    favorite_fab.innerText = 'favorite';
    favorite_btn.append(favorite_fab);
    li.append(favorite_btn);
    if (restaurant.is_favorite) {
      if ((restaurant.is_favorite == true) || (restaurant.is_favorite == 'true')) {
        favorite_btn.classList.add('app-fab--isfavorite');
        favorite_btn.setAttribute('aria-label', 'The restaurant is marked as favorite');
      } else {
        favorite_btn.setAttribute('aria-label', 'Click to mark the restaurant as favorite');
      }
    }
    // will use restaurant id to set field in DB
    favorite_btn.id = restaurant.id;
    favorite_btn.addEventListener('click', onFavoriteClick);
  });

  return li;
};

/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url;
    });
    self.markers.push(marker);
  });
};

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
  document.getElementById('image-blurred').hidden = true;
  document.getElementById('image-blurred-text').hidden = true;

};

window.googleMapsError = () => {
  // console.log('Google Maps Error to handle');
};

function gm_authFailure() {
  // console.log('Google Maps Error to handle');
}

function showMap() {
  const scrMaps = document.getElementById('GoogleMaps');
  scrMaps.src = scrMaps.dataset.src;
}

window.addEventListener('load', (event) => {
  updateRestaurants();
  document.getElementById('map-container').addEventListener('click', showMap);
  DBHelper.syncAll();
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
    'All the changes will be synchronized.', 3000);
  DBHelper.syncAll();
});

window.addEventListener('offline', (event) => {
  // console.log("You are offline")
  let offline = document.getElementById('offline');
  offline.classList.add('show');
  toast('You are offine.' + '\n' +
    'All the changes will be synchronized when you return online.', 5000);
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
  if (toastHTML.classList.contains('show') == true) {
    // avoid to display the same messagere multiple times
    if (msg == toastHTML.innerText) {
      return;
    }
    if (priority == false) {
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