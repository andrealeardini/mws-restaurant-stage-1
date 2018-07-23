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
 */
function fillReviewsHTML(reviews = self.reviews, offline = false, refresh = false) {
  const container = document.getElementById('reviews-container');
  if (refresh == false) {
    const title = document.createElement('h2');
    title.innerHTML = 'Reviews';
    container.appendChild(title);
  }

  // if offline flagged reads the reviews from offline db
  // used to add a new review when the user is offline
  if (offline == true) {
    DBHelper.getReviewsOffline().then(data => {
      reviews = data;
    });
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
  ul.innerHTML = '';
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review, offline));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = (review, offline) => {
  const li = document.createElement('li');

  const header = document.createElement('div');
  header.className = 'reviews-header';
  const name = document.createElement('p');
  name.innerHTML = review.name;
  name.className = 'reviews-name';
  header.appendChild(name);

  if (offline == false) {
    const date = document.createElement('p');
    let reviewDate = new Date(review.updatedAt).toLocaleDateString();
    date.innerHTML = reviewDate;
    date.className = 'reviews-date';
    header.appendChild(date);
  } else {
    const offline_icon = document.createElement('i');
    offline_icon.innerText = 'offline_bolt';
    offline_icon.classList.add = 'material-icons';
    // add a class to easy hide all offline review after the syncro
    li.classList.add = 'offline-review';
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
  toast('You are offine.' + '\n' +
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
  if ((toastHTML.classList.contains('show') == true) && (priority == false)) {
    setTimeout(() => {
      // wait until the previeous message is hide
      clearTimeout(timer);
      toast(msg, millisenconds, priority);
    }, 2000);
    return;
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
        closeReview();
        // fillReviewsHTML(null, true);
      });
    }
  }
}