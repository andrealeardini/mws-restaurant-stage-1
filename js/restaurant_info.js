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
      document.getElementById('image-blurred').classList.remove('blur');
      document.getElementById('image-blurred-text').hidden = true;
    }
  });
};


/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
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
    });
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant);
    });
  }
};

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
 */
const fillReviewsHTML = (reviews = self.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
};

/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = (review) => {
  const li = document.createElement('li');

  const header = document.createElement('div');
  header.className = 'reviews-header';
  const name = document.createElement('p');
  name.innerHTML = review.name;
  name.className = 'reviews-name';
  header.appendChild(name);

  const date = document.createElement('p');
  let reviewDate = new Date(review.updatedAt).toLocaleDateString();
  date.innerHTML = reviewDate;
  date.className = 'reviews-date';
  header.appendChild(date);

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
  DBHelper.syncRestaurants();
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
  const favorite = e.target.parentElement;
  console.log("Click on favorite: ", favorite.id);
  let value = 'false';
  if (!(favorite.classList.contains('app-fab--isfavorite'))) {
    value = 'true';
  }
  DBHelper.updateFavorite(favorite.id, value, (error, toggle) => {
    if (value == 'true') {
      favorite.setAttribute('aria-label', 'The restaurant is marked as favorite');
    } else {
      favorite.setAttribute('aria-label', 'Click to mark the restaurant as favorite');
    }
    if (toggle) {
      favorite.classList.toggle('app-fab--isfavorite');
    }
  });
}

window.addEventListener('online', (event) => {
  console.log("You are online")
  DBHelper.syncRestaurants();
});

window.addEventListener('offline', (event) => {
  console.log("You are offline")
  alert('You are offine. All the changes will be synchronized when you return online.');
});