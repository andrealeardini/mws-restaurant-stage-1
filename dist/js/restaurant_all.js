"use strict";!function(){function e(e){return new Promise(function(t,n){e.onsuccess=function(){t(e.result)},e.onerror=function(){n(e.error)}})}function t(t,n,r){var o,a=new Promise(function(a,i){e(o=t[n].apply(t,r)).then(a,i)});return a.request=o,a}function n(e,t,n){n.forEach(function(n){Object.defineProperty(e.prototype,n,{get:function(){return this[t][n]},set:function(e){this[t][n]=e}})})}function r(e,n,r,o){o.forEach(function(o){o in r.prototype&&(e.prototype[o]=function(){return t(this[n],o,arguments)})})}function o(e,t,n,r){r.forEach(function(r){r in n.prototype&&(e.prototype[r]=function(){return this[t][r].apply(this[t],arguments)})})}function a(e,n,r,o){o.forEach(function(o){o in r.prototype&&(e.prototype[o]=function(){return e=this[n],(r=t(e,o,arguments)).then(function(e){if(e)return new s(e,r.request)});var e,r})})}function i(e){this._index=e}function s(e,t){this._cursor=e,this._request=t}function u(e){this._store=e}function l(e){this._tx=e,this.complete=new Promise(function(t,n){e.oncomplete=function(){t()},e.onerror=function(){n(e.error)},e.onabort=function(){n(e.error)}})}function c(e,t,n){this._db=e,this.oldVersion=t,this.transaction=new l(n)}function d(e){this._db=e}n(i,"_index",["name","keyPath","multiEntry","unique"]),r(i,"_index",IDBIndex,["get","getKey","getAll","getAllKeys","count"]),a(i,"_index",IDBIndex,["openCursor","openKeyCursor"]),n(s,"_cursor",["direction","key","primaryKey","value"]),r(s,"_cursor",IDBCursor,["update","delete"]),["advance","continue","continuePrimaryKey"].forEach(function(t){t in IDBCursor.prototype&&(s.prototype[t]=function(){var n=this,r=arguments;return Promise.resolve().then(function(){return n._cursor[t].apply(n._cursor,r),e(n._request).then(function(e){if(e)return new s(e,n._request)})})})}),u.prototype.createIndex=function(){return new i(this._store.createIndex.apply(this._store,arguments))},u.prototype.index=function(){return new i(this._store.index.apply(this._store,arguments))},n(u,"_store",["name","keyPath","indexNames","autoIncrement"]),r(u,"_store",IDBObjectStore,["put","add","delete","clear","get","getAll","getKey","getAllKeys","count"]),a(u,"_store",IDBObjectStore,["openCursor","openKeyCursor"]),o(u,"_store",IDBObjectStore,["deleteIndex"]),l.prototype.objectStore=function(){return new u(this._tx.objectStore.apply(this._tx,arguments))},n(l,"_tx",["objectStoreNames","mode"]),o(l,"_tx",IDBTransaction,["abort"]),c.prototype.createObjectStore=function(){return new u(this._db.createObjectStore.apply(this._db,arguments))},n(c,"_db",["name","version","objectStoreNames"]),o(c,"_db",IDBDatabase,["deleteObjectStore","close"]),d.prototype.transaction=function(){return new l(this._db.transaction.apply(this._db,arguments))},n(d,"_db",["name","version","objectStoreNames"]),o(d,"_db",IDBDatabase,["close"]),["openCursor","openKeyCursor"].forEach(function(e){[u,i].forEach(function(t){t.prototype[e.replace("open","iterate")]=function(){var t,n=(t=arguments,Array.prototype.slice.call(t)),r=n[n.length-1],o=this._store||this._index,a=o[e].apply(o,n.slice(0,-1));a.onsuccess=function(){r(a.result)}}})}),[i,u].forEach(function(e){e.prototype.getAll||(e.prototype.getAll=function(e,t){var n=this,r=[];return new Promise(function(o){n.iterateCursor(e,function(e){e?(r.push(e.value),void 0===t||r.length!=t?e.continue():o(r)):o(r)})})})});var f={open:function(e,n,r){var o=t(indexedDB,"open",[e,n]),a=o.request;return a.onupgradeneeded=function(e){r&&r(new c(a.result,e.oldVersion,a.transaction))},o.then(function(e){return new d(e)})},delete:function(e){return t(indexedDB,"deleteDatabase",[e])}};"undefined"!=typeof module?(module.exports=f,module.exports.default=module.exports):self.idb=f}();var _createClass=function(){function e(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}return function(t,n,r){return n&&e(t.prototype,n),r&&e(t,r),t}}();function _classCallCheck(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}var restaurant,reviews,map,DBHelper=function(){function e(){_classCallCheck(this,e)}return _createClass(e,[{key:"dbPromise",set:function(e){this._dbPromise=e},get:function(){return this._dbPromise}},{key:"dbOpened",set:function(e){this._dbOpened=e},get:function(){return this._dbOpened}}],[{key:"fetchRestaurants",value:function(t){return e.openDB().then(function(n){if(n)return e.dbPromise=n,console.log(e.dbPromise),e.getRestaurantsFromDB().then(function(n){if(n.length)return t(null,n);console.log("No restaurants in db"),e.fetchRestaurantsFromNetwork(t)});console.log("db not found"),e.fetchRestaurantsFromNetwork(t)}).then(function(){}).catch(function(){console.log("Catch the promise error"),e.fetchRestaurantsFromNetwork(t)})}},{key:"fetchRestaurantsFromNetwork",value:function(t){var n=!(arguments.length>1&&void 0!==arguments[1])||arguments[1],r=new XMLHttpRequest;r.open("GET",e.DATABASE_URL),r.onload=function(){if(200===r.status){var o=JSON.parse(r.responseText);console.log("Ristoranti letti dal server"),t(null,o),n&&e.saveRestaurantsToDB(o)}else{var a="Request failed. Returned status of "+r.status;t(a,null)}},r.send()}},{key:"fetchRestaurantById",value:function(t,n){e.fetchRestaurants(function(e,r){if(e)n(e,null);else{var o=r.find(function(e){return e.id==t});o?n(null,o):n("Restaurant does not exist",null)}})}},{key:"fetchRestaurantByCuisine",value:function(t,n){e.fetchRestaurants(function(e,r){if(e)n(e,null);else{var o=r.filter(function(e){return e.cuisine_type==t});n(null,o)}})}},{key:"fetchRestaurantByNeighborhood",value:function(t,n){e.fetchRestaurants(function(e,r){if(e)n(e,null);else{var o=r.filter(function(e){return e.neighborhood==t});n(null,o)}})}},{key:"fetchRestaurantByCuisineAndNeighborhood",value:function(t,n,r){e.fetchRestaurants(function(e,o){if(e)r(e,null);else{var a=o;"all"!=t&&(a=a.filter(function(e){return e.cuisine_type==t})),"all"!=n&&(a=a.filter(function(e){return e.neighborhood==n})),r(null,a)}})}},{key:"fetchNeighborhoods",value:function(t){e.fetchRestaurants(function(e,n){if(e)t(e,null);else{var r=n.map(function(e,t){return n[t].neighborhood}),o=r.filter(function(e,t){return r.indexOf(e)==t});t(null,o)}})}},{key:"fetchCuisines",value:function(t){e.fetchRestaurants(function(e,n){if(e)t(e,null);else{var r=n.map(function(e,t){return n[t].cuisine_type}),o=r.filter(function(e,t){return r.indexOf(e)==t});t(null,o)}})}},{key:"urlForRestaurant",value:function(e){return"./restaurant.html?id="+e.id}},{key:"imageUrlForRestaurant",value:function(e){return"/img/"+e.id}},{key:"imageDescriptionForRestaurant",value:function(e){return["Inside view of the Mission Chinese Food restaurant. Many people talk to each other","A pizza cut into six slices","Inside view of Kang Ho Dong Baekjeong restaurant. You can see various modern style tables and chairs","Panoramic photo of the entrance. You can see the two streets on which the restaurant overlooks","Inside view of the Roberto's Pizza. In the background, see the kitchen and some pizza makers","Inside view of the Hometown BBQ restaurant. On the wall a huge US flag","Two people walking around the restaurand. You can see some customers inside","Detail of the The Dutch banner","Inside view of the Mu Ramen restaurant. Some customers eat using the typical oriental chopsticks","Inside view of restaurant. You see the counter with the window and several bottles."][e.id-1]}},{key:"mapMarkerForRestaurant",value:function(t,n){return new google.maps.Marker({position:t.latlng,title:t.name,url:e.urlForRestaurant(t),map:n,animation:google.maps.Animation.DROP})}},{key:"openDB",value:function(){return e.dbOpened=!0,"indexedDB"in window?idb.open("restaurants-reviews",4,function(e){switch(e.oldVersion){case 0:e.createObjectStore("restaurants",{keyPath:"id"});case 1:e.createObjectStore("reviews",{keyPath:"id"}),e.transaction.objectStore("reviews").createIndex("restaurant","restaurant_id");case 2:e.createObjectStore("offline-reviews",{keyPath:"id",autoIncrement:!0});case 3:e.createObjectStore("offline-favorites",{keyPath:"id",autoIncrement:!0})}}):(console.log("This browser doesn't support IndexedDB"),Promise.resolve())}},{key:"deleteRestaurantsFromDB",value:function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:e.db;if(t){var n=t.transaction("restaurants","readwrite");return n.objectStore("restaurants").clear(),console.log("Restaurants deleted"),n.complete}}},{key:"addRestaurantToDB",value:function(e,t){if(e){console.log("Adding record");var n=e.transaction("restaurants","readwrite");return n.objectStore("restaurants").put(t),console.log("Record added"),n.complete}}},{key:"getRestaurantsFromDB",value:function(){if(e.dbPromise)return e.dbPromise.transaction("restaurants","readonly").objectStore("restaurants").getAll()}},{key:"saveRestaurantsToDB",value:function(t){if(e.dbOpened){if(1==navigator.onLine){e.deleteRestaurantsFromDB();var n=e.dbPromise.transaction("restaurants","readwrite"),r=n.objectStore("restaurants");return t.forEach(function(e){r.put(e)}),console.log("Local DB Updated from Network"),n.complete}return!1}}},{key:"updateRestaurantLocalDB",value:function(t){if(e.dbOpened){var n=e.dbPromise.transaction("restaurants","readwrite");return n.objectStore("restaurants").put(t),n.complete}}},{key:"addReviewToOfflineDB",value:function(t){if(e.dbOpened){var n=e.dbPromise.transaction("offline-reviews","readwrite");return n.objectStore("offline-reviews").put(t),n.complete}}},{key:"getReviewsOffline",value:function(){if(e.dbPromise)return e.dbPromise.transaction("offline-reviews","readonly").objectStore("offline-reviews").getAll()}},{key:"deleteReviewFromOffline",value:function(t){return e.dbPromise.transaction("offline-reviews","readwrite").objectStore("offline-reviews").delete(t.id)}},{key:"addFavoriteToOfflineDB",value:function(t){if(e.dbOpened){var n=e.dbPromise.transaction("offline-favorites","readwrite");return n.objectStore("offline-favorites").put(t),n.complete}}},{key:"getFavoritesOffline",value:function(){if(e.dbPromise)return e.dbPromise.transaction("offline-favorites","readonly").objectStore("offline-favorites").getAll()}},{key:"deleteFavoriteFromOffline",value:function(t){return e.dbPromise.transaction("offline-favorites","readwrite").objectStore("offline-favorites").delete(t.id)}},{key:"updateFavorite",value:function(t){return fetch("http://localhost:1337/restaurants/"+t.id+"/?is_favorite="+t.value,{method:"PUT"}).then(function(){console.log("Sended PUT with favorite="+t.value)}).catch(function(n){console.log("Error when try to fetch data on server. Favorite saved offline.",n),e.addFavoriteToOfflineDB(t)})}},{key:"_updateFavorite",value:function(t,n,r){return fetch("http://localhost:1337/restaurants/"+t+"/?is_favorite="+n,{method:"PUT"}).then(function(){return console.log("Send PUT with favorite="+n),e.fetchRestaurantById(t,function(t,o){return self.restaurant=o,o||(console.error(t),r(t,null)),console.log(o),o.is_favorite=n,e.updateRestaurantLocalDB(o).then(function(){r(null,!0)})})}).catch(function(o){return console.log("Error when try to fetch data on server... ",o),e.fetchRestaurantById(t,function(t,o){return self.restaurant=o,o||(console.error(t),r(t,null)),console.log(o),o.is_favorite=n,o.updatedAt=new Date,e.updateRestaurantLocalDB(o).then(function(){console.log("Restaurant saved on the local DB"),r(null,!0)})})})}},{key:"sendOfflineFavoritesToServer",value:function(t){return e.getFavoritesOffline().then(function(t){t.forEach(function(t){return e.updateFavorite(t).then(function(){toast("Favorites offline submitted",5e3),e.deleteFavoriteFromOffline(t)}).catch(function(e){console.log("Sending favorite offline.... Oops! Something went wrong.",e)})})})}},{key:"sendOfflineReviewsToServer",value:function(t){return e.getReviewsOffline().then(function(t){t.forEach(function(t){var n=new FormData;n.append("restaurant_id",t.restaurant_id),n.append("name",t.name),n.append("rating",t.rating),n.append("comments",t.comments),fetch("http://localhost:1337/reviews/",{method:"POST",body:n}).then(function(){toast("Review offline submitted",5e3),e.deleteReviewFromOffline(t)}).catch(function(e){toast("Sending review offline.... Oops! Something went wrong.",5e3)})})})}},{key:"_syncRestaurants",value:function(){var t=[],n=[];return e.openDB().then(function(r){r&&(e.dbPromise=r,console.log(e.dbPromise),e.getRestaurantsFromDB().then(function(e){e.length?n=e:console.log("No restaurants in local DB")}).then(function(){console.log("Restaurants from local DB: ",n),e.fetchRestaurantsFromNetwork(function(r,o){if(r)return r;o.length&&(t=o,console.log("Restaurants from server: ",t),t.forEach(function(t){var r=n.find(function(e){return e.id==t.id});if(r){var o=new Date(t.updatedAt),a=new Date(r.updatedAt);o>a&&(e.updateRestaurantLocalDB(t),console.log("Update local DB:",t),e.setFavoriteStatus(t)),o<a&&(e.saveFavoriteToNetwork(r),console.log("Update network DB:",r),e.setFavoriteStatus(r))}else console.log("Restaurant does not exist")}))},!1)}).catch(function(e){console.log("Error in sync")}))})}},{key:"syncRestaurants",value:function(){e.sendOfflineFavoritesToServer(function(e,t){if(e)return console.error("SyncRestaurants: ",e),e})}},{key:"syncReviews",value:function(t){e.sendOfflineReviewsToServer(function(e,t){if(e)return console.error("SyncReviews: ",e),e}),e.fetchReviewsFromNetwork(t,function(e,t){if(e)return console.error("SyncReviews: ",e),e})}},{key:"setFavoriteStatus",value:function(e){if(e.is_favorite){var t=document.getElementById(e.id);1==e.is_favorite||"true"==e.is_favorite?t.classList.add("restaurant-name_isfavorite"):t.classList.remove("restaurant-name_isfavorite")}}},{key:"saveFavoriteToNetwork",value:function(t){return e.updateFavorite(t.id,t.is_favorite,function(e,t){t&&console.log("Favorite Updated from LocalDB")})}},{key:"fetchReviews",value:function(t,n){return e.openDB().then(function(r){return r?(e.dbPromise=r,console.log(e.dbPromise),e.getReviewsFromDB(t).then(function(r){return r.length?n(null,r):(console.log("No reviews in db"),e.fetchReviewsFromNetwork(t,n))})):(console.log("db not found"),e.fetchReviewsFromNetwork(t,n))}).then(function(){}).catch(function(){return console.log("Catch the promise error"),e.fetchReviewsFromNetwork(t,n)})}},{key:"fetchReviewById",value:function(t,n){e.fetchReviews(null,function(e,r){if(e)n(e,null);else{var o=r.find(function(e){return e.id==t});o?n(null,o):n("Review does not exist",null)}})}},{key:"fetchReviewsFromNetwork",value:function(t,n){var r=!(arguments.length>2&&void 0!==arguments[2])||arguments[2],o=new XMLHttpRequest;o.open("GET",e.DATABASE_REVIEWS_URL+"/?restaurant_id="+t),o.onload=function(){if(200===o.status){var a=JSON.parse(o.responseText);console.log("Restaurant: "+t+" Reviews lette dal server: ",a),r&&e.saveReviewsToDB(t,a),n(null,a)}else{var i="Request failed. Returned status of "+o.status;n(i,null)}},o.send()}},{key:"saveReviewsToDB",value:function(t,n){if(e.dbOpened){if(1==navigator.onLine){e.deleteReviewsFromDB(t);var r=e.dbPromise.transaction("reviews","readwrite"),o=r.objectStore("reviews");return console.log("Local reviews to save: ",n),n.forEach(function(e){e.restaurant_id=parseInt(e.restaurant_id),o.put(e),console.log("Local review DB updated from Network: ",e)}),r.complete}return!1}}},{key:"deleteReviewsFromDB",value:function(t){e.dbPromise&&e.getReviewsFromDB(t).then(function(t){var n=e.dbPromise.transaction("reviews","readwrite"),r=n.objectStore("reviews");return t.forEach(function(e){r.delete(e.id)}),n.complete})}},{key:"getReviewsFromDB",value:function(t){if(e.dbPromise){var n=e.dbPromise.transaction("reviews","readonly").objectStore("reviews");return t?n.index("restaurant").getAll(Number(t)):n.getAll()}}},{key:"DATABASE_URL",get:function(){return"http://localhost:1337/restaurants"}},{key:"DATABASE_REVIEWS_URL",get:function(){return"http://localhost:1337/reviews"}}]),e}();function fetchRestaurantFromURL(e){var t=arguments.length>1&&void 0!==arguments[1]&&arguments[1];if(self.restaurant&&0==t)e(null,self.restaurant);else{var n=getParameterByName("id");if(n)DBHelper.fetchReviews(n,function(t,r){self.reviews=r,DBHelper.fetchRestaurantById(n,function(t,n){self.restaurant=n,n?(fillRestaurantHTML(),e(null,n)):console.error(t)})});else{e("No restaurant id in URL",null)}}}"serviceWorker"in navigator&&window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").then(function(e){console.log("ServiceWorker registration successful with scope: ",e.scope)},function(e){console.log("ServiceWorker registration failed: ",e)})}),window.initMap=function(){fetchRestaurantFromURL(function(e,t){e?console.error(e):(self.map=new google.maps.Map(document.getElementById("map"),{zoom:16,center:t.latlng,gestureHandling:"cooperative"}),DBHelper.mapMarkerForRestaurant(self.restaurant,self.map),document.getElementById("map").classList.remove("inactive"),document.getElementById("image-blurred").hidden=!0,document.getElementById("image-blurred-text").hidden=!0)})};var fillRestaurantHTML=function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:self.restaurant;document.getElementById("restaurant-name").innerHTML=e.name;var t=document.getElementById("favorite-fab");t.id=e.id,e.is_favorite&&(1!=e.is_favorite&&"true"!=e.is_favorite||t.classList.add("restaurant-name_isfavorite")),t.addEventListener("click",onFavoriteClick),document.getElementById("add-fab").addEventListener("click",onCreateReview),document.getElementById("restaurant-address").innerHTML=e.address;var n=document.getElementById("restaurant-picture"),r=document.createElement("source");r.setAttribute("type","image/webp"),r.setAttribute("srcset",DBHelper.imageUrlForRestaurant(e)+".webp"),n.append(r);var o=document.createElement("img");o.id="restaurant-img",o.alt=DBHelper.imageDescriptionForRestaurant(e),o.src=DBHelper.imageUrlForRestaurant(e)+".jpg",n.append(o),document.getElementById("restaurant-cuisine").innerHTML=e.cuisine_type,e.operating_hours&&fillRestaurantHoursHTML(),fillReviewsHTML()},fillRestaurantHoursHTML=function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:self.restaurant.operating_hours,t=document.getElementById("restaurant-hours");for(var n in e){var r=document.createElement("tr"),o=document.createElement("td");o.innerHTML=n,o.className="restaurant-day",r.appendChild(o);var a=document.createElement("td");a.innerHTML=e[n],r.appendChild(a),t.appendChild(r)}},fillReviewsHTML=function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:self.reviews,t=arguments.length>1&&void 0!==arguments[1]&&arguments[1],n=document.getElementById("reviews-container"),r=document.createElement("h2");if(r.innerHTML="Reviews",n.appendChild(r),1==t&&DBHelper.getReviewsOffline().then(function(t){e=t}),!e){var o=document.createElement("p");return 1==navigator.onLine?o.innerHTML="No reviews yet!":o.innerHTML="You are offline and it seems that is the first time that you visit this restaurants. All reviews will be cached when you visit the page online",void n.appendChild(o)}var a=document.getElementById("reviews-list");e.forEach(function(e){a.appendChild(createReviewHTML(e,t))}),n.appendChild(a)},createReviewHTML=function(e,t){var n=document.createElement("li"),r=document.createElement("div");r.className="reviews-header";var o=document.createElement("p");if(o.innerHTML=e.name,o.className="reviews-name",r.appendChild(o),0==t){var a=document.createElement("p"),i=new Date(e.updatedAt).toLocaleDateString();a.innerHTML=i,a.className="reviews-date",r.appendChild(a)}else{var s=document.createElement("i");s.innerText="offline_bolt",s.classList.add="material-icons",n.classList.add="offline-review",r.appendChild(s)}n.appendChild(r);var u=document.createElement("p");u.innerHTML="Rating: "+e.rating,u.className="reviews-rating",n.appendChild(u);var l=document.createElement("p");return l.innerHTML=e.comments,n.appendChild(l),n},fillBreadcrumb=function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:self.restaurant,t=document.getElementById("breadcrumb"),n=document.createElement("li"),r=document.createElement("a");r.href=DBHelper.urlForRestaurant(e),r.innerHTML=e.name,r.setAttribute("aria-current","page"),n.appendChild(r),t.appendChild(n)},getParameterByName=function(e,t){t||(t=window.location.href),e=e.replace(/[\[\]]/g,"\\$&");var n=new RegExp("[?&]"+e+"(=([^&#]*)|&|#|$)").exec(t);return n?n[2]?decodeURIComponent(n[2].replace(/\+/g," ")):"":null};function showMap(){var e=document.getElementById("GoogleMaps");e.src=e.dataset.src}function gm_authFailure(){console.log("Google Maps Error to handle")}function onFavoriteClick(e){var t=e.target.parentElement;console.log("Click on favorite: ",t.id);var n={id:t.id,value:"false"};t.classList.contains("app-fab--isfavorite")||(n.value="true"),DBHelper.updateFavorite(n),"true"==n.value?t.setAttribute("aria-label","The restaurant is marked as favorite"):t.setAttribute("aria-label","Click to mark the restaurant as favorite"),t.classList.toggle("app-fab--isfavorite")}function toast(e,t){var n=document.getElementById("toast");n.innerText=e,n.classList.add("show"),setTimeout(function(){n.classList.remove("show")},t)}function onCreateReview(){var e=document.getElementById("reviews-list"),t=document.createElement("li");t.classList.add("addReview");var n=document.createElement("form"),r=document.createElement("div");r.className="reviews-header";var o=document.createElement("h3");o.innerText="New review",r.appendChild(o),n.appendChild(r);var a=document.createElement("input"),i=document.getElementsByClassName("app-fab--favorite")[0];a.value=i.id,a.name="restaurant_id",a.type="hidden",n.appendChild(a);var s=document.createElement("input");s.className="reviews-name",s.placeholder="Insert your name",s.required=!0,s.name="name",n.appendChild(s);var u=document.createElement("p");u.className="reviews-rating",u.innerText="Rating: ";var l=document.createElement("select");l.classList.add("reviews-rating-score");for(var c=1;c<=5;c++){var d=document.createElement("option");d.id="score"+c,d.value=c,d.innerText=c,l.appendChild(d),l.name="rating"}u.appendChild(l),n.appendChild(u);var f=document.createElement("textarea");f.placeholder="Type your review here...",f.className="reviews-comments",f.required=!0,f.name="comments",f.addEventListener("input",function(e){f.style.height="auto",f.style.height=f.scrollHeight+"px"}),n.appendChild(f);var v=document.createElement("button");v.classList.add("mdc-fab","mdc-fab--mini","rew-fab--save");var m=document.createElement("span");m.innerText="save",m.classList.add("mdc-fab__icon","material-icons"),v.type="submit",v.appendChild(m),n.appendChild(v);var p=document.createElement("button");p.classList.add("mdc-fab","mdc-fab--mini","rew-fab--delete");var h=document.createElement("span");h.innerText="delete",h.classList.add("mdc-fab__icon","material-icons"),p.appendChild(h),n.appendChild(p),t.appendChild(n),e.insertBefore(t,e.firstChild),p.focus(),s.focus();var g=document.getElementById("add-fab");function w(){console.log("Review closed"),g.classList.remove("app-fab--hide"),i.classList.remove("app-fab--hide"),t.remove()}g.classList.add("app-fab--hide"),i.classList.add("app-fab--hide"),p.addEventListener("click",function(e){if(e.preventDefault(),""!=s.value|""!=f.value){var t=document.getElementById("delConfirm"),n=document.getElementById("delConfirm-cancel"),r=document.getElementById("delConfirm-confirm");t.showModal(),n.addEventListener("click",function(){t.close()}),r.addEventListener("click",function(){t.close(),w()})}else w()}),n.addEventListener("submit",function(e){e.preventDefault(),function(){var e=new FormData(n);if(navigator.onLine){var t=new XMLHttpRequest;t.addEventListener("load",function(e){toast("The review is submitted",5e3),w()}),t.addEventListener("error",function(e){toast("Oops! Something went wrong.",5e3)}),t.open("POST","http://localhost:1337/reviews/"),t.send(e)}else{var r={restaurant_id:e.get("restaurant_id"),name:e.get("name"),rating:e.get("rating"),comments:e.get("comments")};DBHelper.addReviewToOfflineDB(r).then(function(){toast("The review is saved. Will be submitted when you return online",7e3),w(),fillReviewsHTML(null,!0)})}}()})}window.googleMapsError=function(){console.log("Google Maps Error to handle")},window.addEventListener("load",function(e){fetchRestaurantFromURL(function(e,t){e?console.error(e):(fillBreadcrumb(),document.getElementById("map-container").addEventListener("click",showMap))})}),window.addEventListener("online",function(e){document.getElementById("offline").classList.remove("show"),toast("You are online.\nAll the changes will be synchronized.",5e3),fetchRestaurantFromURL(function(e,t){e&&console.log("Online: error when fetch restaurant from URL")},!0)}),window.addEventListener("offline",function(e){document.getElementById("offline").classList.add("show"),toast("You are offine.\nAll the changes will be synchronized when you return online.",5e3)}),window.addEventListener("DOMContentLoaded",function(e){navigator.onLine||document.getElementById("offline").classList.add("show")});
//# sourceMappingURL=restaurant_all.js.map
