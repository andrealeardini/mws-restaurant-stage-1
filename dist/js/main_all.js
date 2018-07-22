"use strict";!function(){function e(e){return new Promise(function(t,n){e.onsuccess=function(){t(e.result)},e.onerror=function(){n(e.error)}})}function t(t,n,o){var r,a=new Promise(function(a,i){e(r=t[n].apply(t,o)).then(a,i)});return a.request=r,a}function n(e,t,n){n.forEach(function(n){Object.defineProperty(e.prototype,n,{get:function(){return this[t][n]},set:function(e){this[t][n]=e}})})}function o(e,n,o,r){r.forEach(function(r){r in o.prototype&&(e.prototype[r]=function(){return t(this[n],r,arguments)})})}function r(e,t,n,o){o.forEach(function(o){o in n.prototype&&(e.prototype[o]=function(){return this[t][o].apply(this[t],arguments)})})}function a(e,n,o,r){r.forEach(function(r){r in o.prototype&&(e.prototype[r]=function(){return e=this[n],(o=t(e,r,arguments)).then(function(e){if(e)return new s(e,o.request)});var e,o})})}function i(e){this._index=e}function s(e,t){this._cursor=e,this._request=t}function u(e){this._store=e}function c(e){this._tx=e,this.complete=new Promise(function(t,n){e.oncomplete=function(){t()},e.onerror=function(){n(e.error)},e.onabort=function(){n(e.error)}})}function l(e,t,n){this._db=e,this.oldVersion=t,this.transaction=new c(n)}function f(e){this._db=e}n(i,"_index",["name","keyPath","multiEntry","unique"]),o(i,"_index",IDBIndex,["get","getKey","getAll","getAllKeys","count"]),a(i,"_index",IDBIndex,["openCursor","openKeyCursor"]),n(s,"_cursor",["direction","key","primaryKey","value"]),o(s,"_cursor",IDBCursor,["update","delete"]),["advance","continue","continuePrimaryKey"].forEach(function(t){t in IDBCursor.prototype&&(s.prototype[t]=function(){var n=this,o=arguments;return Promise.resolve().then(function(){return n._cursor[t].apply(n._cursor,o),e(n._request).then(function(e){if(e)return new s(e,n._request)})})})}),u.prototype.createIndex=function(){return new i(this._store.createIndex.apply(this._store,arguments))},u.prototype.index=function(){return new i(this._store.index.apply(this._store,arguments))},n(u,"_store",["name","keyPath","indexNames","autoIncrement"]),o(u,"_store",IDBObjectStore,["put","add","delete","clear","get","getAll","getKey","getAllKeys","count"]),a(u,"_store",IDBObjectStore,["openCursor","openKeyCursor"]),r(u,"_store",IDBObjectStore,["deleteIndex"]),c.prototype.objectStore=function(){return new u(this._tx.objectStore.apply(this._tx,arguments))},n(c,"_tx",["objectStoreNames","mode"]),r(c,"_tx",IDBTransaction,["abort"]),l.prototype.createObjectStore=function(){return new u(this._db.createObjectStore.apply(this._db,arguments))},n(l,"_db",["name","version","objectStoreNames"]),r(l,"_db",IDBDatabase,["deleteObjectStore","close"]),f.prototype.transaction=function(){return new c(this._db.transaction.apply(this._db,arguments))},n(f,"_db",["name","version","objectStoreNames"]),r(f,"_db",IDBDatabase,["close"]),["openCursor","openKeyCursor"].forEach(function(e){[u,i].forEach(function(t){t.prototype[e.replace("open","iterate")]=function(){var t,n=(t=arguments,Array.prototype.slice.call(t)),o=n[n.length-1],r=this._store||this._index,a=r[e].apply(r,n.slice(0,-1));a.onsuccess=function(){o(a.result)}}})}),[i,u].forEach(function(e){e.prototype.getAll||(e.prototype.getAll=function(e,t){var n=this,o=[];return new Promise(function(r){n.iterateCursor(e,function(e){e?(o.push(e.value),void 0===t||o.length!=t?e.continue():r(o)):r(o)})})})});var d={open:function(e,n,o){var r=t(indexedDB,"open",[e,n]),a=r.request;return a.onupgradeneeded=function(e){o&&o(new l(a.result,e.oldVersion,a.transaction))},r.then(function(e){return new f(e)})},delete:function(e){return t(indexedDB,"deleteDatabase",[e])}};"undefined"!=typeof module?(module.exports=d,module.exports.default=module.exports):self.idb=d}();var _createClass=function(){function e(e,t){for(var n=0;n<t.length;n++){var o=t[n];o.enumerable=o.enumerable||!1,o.configurable=!0,"value"in o&&(o.writable=!0),Object.defineProperty(e,o.key,o)}}return function(t,n,o){return n&&e(t.prototype,n),o&&e(t,o),t}}();function _classCallCheck(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}var map,google,DBHelper=function(){function e(){_classCallCheck(this,e)}return _createClass(e,[{key:"dbPromise",set:function(e){this._dbPromise=e},get:function(){return this._dbPromise}},{key:"dbOpened",set:function(e){this._dbOpened=e},get:function(){return this._dbOpened}}],[{key:"fetchRestaurants",value:function(t){return e.openDB().then(function(n){if(n)return e.dbPromise=n,console.log(e.dbPromise),e.getRestaurantsFromDB().then(function(n){if(n.length)return t(null,n);console.log("No restaurants in db"),e.fetchRestaurantsFromNetwork(t)});console.log("db not found"),e.fetchRestaurantsFromNetwork(t)}).then(function(){}).catch(function(){console.log("Catch the promise error"),e.fetchRestaurantsFromNetwork(t)})}},{key:"fetchRestaurantsFromNetwork",value:function(t){var n=!(arguments.length>1&&void 0!==arguments[1])||arguments[1],o=new XMLHttpRequest;o.open("GET",e.DATABASE_URL),o.onload=function(){if(200===o.status){var r=JSON.parse(o.responseText);console.log("Ristoranti letti dal server"),t(null,r),n&&e.saveRestaurantsToDB(r)}else{var a="Request failed. Returned status of "+o.status;t(a,null)}},o.send()}},{key:"fetchRestaurantById",value:function(t,n){e.fetchRestaurants(function(e,o){if(e)n(e,null);else{var r=o.find(function(e){return e.id==t});r?n(null,r):n("Restaurant does not exist",null)}})}},{key:"fetchRestaurantByCuisine",value:function(t,n){e.fetchRestaurants(function(e,o){if(e)n(e,null);else{var r=o.filter(function(e){return e.cuisine_type==t});n(null,r)}})}},{key:"fetchRestaurantByNeighborhood",value:function(t,n){e.fetchRestaurants(function(e,o){if(e)n(e,null);else{var r=o.filter(function(e){return e.neighborhood==t});n(null,r)}})}},{key:"fetchRestaurantByCuisineAndNeighborhood",value:function(t,n,o){e.fetchRestaurants(function(e,r){if(e)o(e,null);else{var a=r;"all"!=t&&(a=a.filter(function(e){return e.cuisine_type==t})),"all"!=n&&(a=a.filter(function(e){return e.neighborhood==n})),o(null,a)}})}},{key:"fetchNeighborhoods",value:function(t){e.fetchRestaurants(function(e,n){if(e)t(e,null);else{var o=n.map(function(e,t){return n[t].neighborhood}),r=o.filter(function(e,t){return o.indexOf(e)==t});t(null,r)}})}},{key:"fetchCuisines",value:function(t){e.fetchRestaurants(function(e,n){if(e)t(e,null);else{var o=n.map(function(e,t){return n[t].cuisine_type}),r=o.filter(function(e,t){return o.indexOf(e)==t});t(null,r)}})}},{key:"urlForRestaurant",value:function(e){return"./restaurant.html?id="+e.id}},{key:"imageUrlForRestaurant",value:function(e){return"/img/"+e.id}},{key:"imageDescriptionForRestaurant",value:function(e){return["Inside view of the Mission Chinese Food restaurant. Many people talk to each other","A pizza cut into six slices","Inside view of Kang Ho Dong Baekjeong restaurant. You can see various modern style tables and chairs","Panoramic photo of the entrance. You can see the two streets on which the restaurant overlooks","Inside view of the Roberto's Pizza. In the background, see the kitchen and some pizza makers","Inside view of the Hometown BBQ restaurant. On the wall a huge US flag","Two people walking around the restaurand. You can see some customers inside","Detail of the The Dutch banner","Inside view of the Mu Ramen restaurant. Some customers eat using the typical oriental chopsticks","Inside view of restaurant. You see the counter with the window and several bottles."][e.id-1]}},{key:"mapMarkerForRestaurant",value:function(t,n){return new google.maps.Marker({position:t.latlng,title:t.name,url:e.urlForRestaurant(t),map:n,animation:google.maps.Animation.DROP})}},{key:"openDB",value:function(){return e.dbOpened=!0,"indexedDB"in window?idb.open("restaurants-reviews",4,function(e){switch(e.oldVersion){case 0:e.createObjectStore("restaurants",{keyPath:"id"});case 1:e.createObjectStore("reviews",{keyPath:"id"}),e.transaction.objectStore("reviews").createIndex("restaurant","restaurant_id");case 2:e.createObjectStore("offline-reviews",{keyPath:"id",autoIncrement:!0});case 3:e.createObjectStore("offline-favorites",{keyPath:"id",autoIncrement:!0})}}):(console.log("This browser doesn't support IndexedDB"),Promise.resolve())}},{key:"deleteRestaurantsFromDB",value:function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:e.db;if(t){var n=t.transaction("restaurants","readwrite");return n.objectStore("restaurants").clear(),console.log("Restaurants deleted"),n.complete}}},{key:"addRestaurantToDB",value:function(e,t){if(e){console.log("Adding record");var n=e.transaction("restaurants","readwrite");return n.objectStore("restaurants").put(t),console.log("Record added"),n.complete}}},{key:"getRestaurantsFromDB",value:function(){if(e.dbPromise)return e.dbPromise.transaction("restaurants","readonly").objectStore("restaurants").getAll()}},{key:"saveRestaurantsToDB",value:function(t){if(e.dbOpened){if(1==navigator.onLine){e.deleteRestaurantsFromDB();var n=e.dbPromise.transaction("restaurants","readwrite"),o=n.objectStore("restaurants");return t.forEach(function(e){o.put(e)}),console.log("Local DB Updated from Network"),n.complete}return!1}}},{key:"updateRestaurantLocalDB",value:function(t){if(e.dbOpened){var n=e.dbPromise.transaction("restaurants","readwrite");return n.objectStore("restaurants").put(t),n.complete}}},{key:"addReviewToOfflineDB",value:function(t){if(e.dbOpened){var n=e.dbPromise.transaction("offline-reviews","readwrite");return n.objectStore("offline-reviews").put(t),n.complete}}},{key:"getReviewsOffline",value:function(){if(e.dbPromise)return e.dbPromise.transaction("offline-reviews","readonly").objectStore("offline-reviews").getAll()}},{key:"deleteReviewFromOffline",value:function(t){return e.dbPromise.transaction("offline-reviews","readwrite").objectStore("offline-reviews").delete(t.id)}},{key:"addFavoriteToOfflineDB",value:function(t){if(e.dbOpened){var n=e.dbPromise.transaction("offline-favorites","readwrite");return n.objectStore("offline-favorites").put(t),n.complete}}},{key:"getFavoritesOffline",value:function(){if(e.dbPromise)return e.dbPromise.transaction("offline-favorites","readonly").objectStore("offline-favorites").getAll()}},{key:"deleteFavoriteFromOffline",value:function(t){return e.dbPromise.transaction("offline-favorites","readwrite").objectStore("offline-favorites").delete(t.id)}},{key:"updateFavorite",value:function(t){return fetch("http://localhost:1337/restaurants/"+t.id+"/?is_favorite="+t.value,{method:"PUT"}).then(function(){console.log("Sended PUT with favorite="+t.value)}).catch(function(n){console.log("Error when try to fetch data on server. Favorite saved offline.",n),e.addFavoriteToOfflineDB(t)})}},{key:"_updateFavorite",value:function(t,n,o){return fetch("http://localhost:1337/restaurants/"+t+"/?is_favorite="+n,{method:"PUT"}).then(function(){return console.log("Send PUT with favorite="+n),e.fetchRestaurantById(t,function(t,r){return self.restaurant=r,r||(console.error(t),o(t,null)),console.log(r),r.is_favorite=n,e.updateRestaurantLocalDB(r).then(function(){o(null,!0)})})}).catch(function(r){return console.log("Error when try to fetch data on server... ",r),e.fetchRestaurantById(t,function(t,r){return self.restaurant=r,r||(console.error(t),o(t,null)),console.log(r),r.is_favorite=n,r.updatedAt=new Date,e.updateRestaurantLocalDB(r).then(function(){console.log("Restaurant saved on the local DB"),o(null,!0)})})})}},{key:"sendOfflineFavoritesToServer",value:function(t){return e.getFavoritesOffline().then(function(t){t.forEach(function(t){return e.updateFavorite(t).then(function(){toast("Favorites offline submitted",5e3),e.deleteFavoriteFromOffline(t)}).catch(function(e){console.log("Sending favorite offline.... Oops! Something went wrong.",e)})})})}},{key:"sendOfflineReviewsToServer",value:function(t){return e.getReviewsOffline().then(function(t){t.forEach(function(t){var n=new FormData;n.append("restaurant_id",t.restaurant_id),n.append("name",t.name),n.append("rating",t.rating),n.append("comments",t.comments),fetch("http://localhost:1337/reviews/",{method:"POST",body:n}).then(function(){toast("Review offline submitted",5e3),e.deleteReviewFromOffline(t)}).catch(function(e){toast("Sending review offline.... Oops! Something went wrong.",5e3)})})})}},{key:"_syncRestaurants",value:function(){var t=[],n=[];return e.openDB().then(function(o){o&&(e.dbPromise=o,console.log(e.dbPromise),e.getRestaurantsFromDB().then(function(e){e.length?n=e:console.log("No restaurants in local DB")}).then(function(){console.log("Restaurants from local DB: ",n),e.fetchRestaurantsFromNetwork(function(o,r){if(o)return o;r.length&&(t=r,console.log("Restaurants from server: ",t),t.forEach(function(t){var o=n.find(function(e){return e.id==t.id});if(o){var r=new Date(t.updatedAt),a=new Date(o.updatedAt);r>a&&(e.updateRestaurantLocalDB(t),console.log("Update local DB:",t),e.setFavoriteStatus(t)),r<a&&(e.saveFavoriteToNetwork(o),console.log("Update network DB:",o),e.setFavoriteStatus(o))}else console.log("Restaurant does not exist")}))},!1)}).catch(function(e){console.log("Error in sync")}))})}},{key:"syncRestaurants",value:function(){e.sendOfflineFavoritesToServer(function(e,t){if(e)return console.error("SyncRestaurants: ",e),e})}},{key:"syncReviews",value:function(t){e.sendOfflineReviewsToServer(function(e,t){if(e)return console.error("SyncReviews: ",e),e}),e.fetchReviewsFromNetwork(t,function(e,t){if(e)return console.error("SyncReviews: ",e),e})}},{key:"setFavoriteStatus",value:function(e){if(e.is_favorite){var t=document.getElementById(e.id);1==e.is_favorite||"true"==e.is_favorite?t.classList.add("restaurant-name_isfavorite"):t.classList.remove("restaurant-name_isfavorite")}}},{key:"saveFavoriteToNetwork",value:function(t){return e.updateFavorite(t.id,t.is_favorite,function(e,t){t&&console.log("Favorite Updated from LocalDB")})}},{key:"fetchReviews",value:function(t,n){return e.openDB().then(function(o){return o?(e.dbPromise=o,console.log(e.dbPromise),e.getReviewsFromDB(t).then(function(o){return o.length?n(null,o):(console.log("No reviews in db"),e.fetchReviewsFromNetwork(t,n))})):(console.log("db not found"),e.fetchReviewsFromNetwork(t,n))}).then(function(){}).catch(function(){return console.log("Catch the promise error"),e.fetchReviewsFromNetwork(t,n)})}},{key:"fetchReviewById",value:function(t,n){e.fetchReviews(null,function(e,o){if(e)n(e,null);else{var r=o.find(function(e){return e.id==t});r?n(null,r):n("Review does not exist",null)}})}},{key:"fetchReviewsFromNetwork",value:function(t,n){var o=!(arguments.length>2&&void 0!==arguments[2])||arguments[2],r=new XMLHttpRequest;r.open("GET",e.DATABASE_REVIEWS_URL+"/?restaurant_id="+t),r.onload=function(){if(200===r.status){var a=JSON.parse(r.responseText);console.log("Restaurant: "+t+" Reviews lette dal server: ",a),o&&e.saveReviewsToDB(t,a),n(null,a)}else{var i="Request failed. Returned status of "+r.status;n(i,null)}},r.send()}},{key:"saveReviewsToDB",value:function(t,n){if(e.dbOpened){if(1==navigator.onLine){e.deleteReviewsFromDB(t);var o=e.dbPromise.transaction("reviews","readwrite"),r=o.objectStore("reviews");return console.log("Local reviews to save: ",n),n.forEach(function(e){e.restaurant_id=parseInt(e.restaurant_id),r.put(e),console.log("Local review DB updated from Network: ",e)}),o.complete}return!1}}},{key:"deleteReviewsFromDB",value:function(t){e.dbPromise&&e.getReviewsFromDB(t).then(function(t){var n=e.dbPromise.transaction("reviews","readwrite"),o=n.objectStore("reviews");return t.forEach(function(e){o.delete(e.id)}),n.complete})}},{key:"getReviewsFromDB",value:function(t){if(e.dbPromise){var n=e.dbPromise.transaction("reviews","readonly").objectStore("reviews");return t?n.index("restaurant").getAll(Number(t)):n.getAll()}}},{key:"DATABASE_URL",get:function(){return"http://localhost:1337/restaurants"}},{key:"DATABASE_REVIEWS_URL",get:function(){return"http://localhost:1337/reviews"}}]),e}(),restaurants=void 0,neighborhoods=void 0,cuisines=void 0,markers=[],showImage=function(e,t){e.forEach(function(e){e.isIntersecting&&(loadPicture(e.target),t.unobserve(e.target))})},options={root:null,rootMargin:"0px",threshold:[0]},observer=new IntersectionObserver(showImage,options);function loadPicture(e){var t=e.getElementsByTagName("source")[0],n=e.getElementsByTagName("source")[1],o=e.getElementsByTagName("img")[0],r=t.dataset.src,a=n.dataset.src,i=o.dataset.src;i&&(t.srcset=r,n.srcset=a,o.src=i)}"serviceWorker"in navigator&&window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").then(function(e){},function(e){})}),document.addEventListener("DOMContentLoaded",function(e){fetchNeighborhoods(),fetchCuisines()});var fetchNeighborhoods=function(){DBHelper.fetchNeighborhoods(function(e,t){e?console.error(e):(self.neighborhoods=t,fillNeighborhoodsHTML())})},fillNeighborhoodsHTML=function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:self.neighborhoods,t=document.getElementById("neighborhoods-select");e.forEach(function(e){var n=document.createElement("option");n.innerHTML=e,n.value=e,t.append(n)})},fetchCuisines=function(){DBHelper.fetchCuisines(function(e,t){e?console.error(e):(self.cuisines=t,fillCuisinesHTML())})},fillCuisinesHTML=function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:self.cuisines,t=document.getElementById("cuisines-select");e.forEach(function(e){var n=document.createElement("option");n.innerHTML=e,n.value=e,t.append(n)})},updateRestaurants=function(){var e=document.getElementById("cuisines-select"),t=document.getElementById("neighborhoods-select"),n=e.selectedIndex,o=t.selectedIndex,r=e[n].value,a=t[o].value;DBHelper.fetchRestaurantByCuisineAndNeighborhood(r,a,function(e,t){e?console.error(e):(resetRestaurants(t),fillRestaurantsHTML())})},resetRestaurants=function(e){self.restaurants=[],document.getElementById("restaurants-list").innerHTML="",self.restaurants=e,document.getElementById("map").classList.contains("inactive")||(self.markers.forEach(function(e){return e.setMap(null)}),self.markers=[])},fillRestaurantsHTML=function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:self.restaurants,t=document.getElementById("restaurants-list");e.forEach(function(e){t.append(createRestaurantHTML(e))}),document.getElementById("image-blurred-text").hidden&&addMarkersToMap()},createRestaurantHTML=function(e){var t=document.createElement("li"),n=document.createElement("picture"),o=document.createElement("source");o.setAttribute("type","image/webp"),n.append(o);var r=document.createElement("source");r.setAttribute("type","image/jpeg"),n.append(r);var a=document.createElement("img");a.className="restaurant-img",a.alt=DBHelper.imageDescriptionForRestaurant(e),"IntersectionObserver"in window?(o.setAttribute("data-src",DBHelper.imageUrlForRestaurant(e)+".webp"),r.setAttribute("data-src",DBHelper.imageUrlForRestaurant(e)+".jpg"),a.setAttribute("data-src",DBHelper.imageUrlForRestaurant(e)+".jpg")):(o.setAttribute("srcset",DBHelper.imageUrlForRestaurant(e)+".webp"),r.setAttribute("srcset",DBHelper.imageUrlForRestaurant(e)+".jpg"),a.src=DBHelper.imageUrlForRestaurant(e)+".jpg"),n.append(a),t.append(n),observer.observe(n);var i=document.createElement("h1");i.innerHTML=e.name,t.append(i);var s=document.createElement("p");s.innerHTML=e.neighborhood,t.append(s);var u=document.createElement("p");u.innerHTML=e.address,t.append(u);var c=document.createElement("button");c.classList.add("button"),c.innerHTML="View Details",c.addEventListener("click",function(){window.location.href=DBHelper.urlForRestaurant(e)}),t.append(c);var l=document.createElement("button");l.classList.add("mdc-fab","mdc-fab--mini","app-fab--favorite");var f=document.createElement("span");return f.classList.add("mdc-fab__icon","material-icons"),f.innerText="favorite",l.append(f),t.append(l),e.is_favorite&&(1==e.is_favorite||"true"==e.is_favorite?(l.classList.add("app-fab--isfavorite"),l.setAttribute("aria-label","The restaurant is marked as favorite")):l.setAttribute("aria-label","Click to mark the restaurant as favorite")),l.id=e.id,l.addEventListener("click",onFavoriteClick),t},addMarkersToMap=function(){(arguments.length>0&&void 0!==arguments[0]?arguments[0]:self.restaurants).forEach(function(e){var t=DBHelper.mapMarkerForRestaurant(e,self.map);google.maps.event.addListener(t,"click",function(){window.location.href=t.url}),self.markers.push(t)})};function gm_authFailure(){}function showMap(){var e=document.getElementById("GoogleMaps");e.src=e.dataset.src}function onFavoriteClick(e){var t=e.target.parentElement;console.log("Click on favorite: ",t.id);var n={id:t.id,value:"false"};t.classList.contains("app-fab--isfavorite")||(n.value="true"),DBHelper.updateFavorite(n).then(function(){console.log("onFavoriteClick: favorite updated")}),"true"==n.value?t.setAttribute("aria-label","The restaurant is marked as favorite"):t.setAttribute("aria-label","Click to mark the restaurant as favorite"),t.classList.toggle("app-fab--isfavorite")}function toast(e,t){var n=document.getElementById("toast");n.innerText=e,n.classList.add("show"),setTimeout(function(){n.classList.remove("show")},t)}window.initMap=function(){self.map=new google.maps.Map(document.getElementById("map"),{zoom:12,center:{lat:40.722216,lng:-73.987501},gestureHandling:"cooperative"}),updateRestaurants(),document.getElementById("map").classList.remove("inactive"),document.getElementById("image-blurred").hidden=!0,document.getElementById("image-blurred-text").hidden=!0},window.googleMapsError=function(){},window.addEventListener("load",function(e){updateRestaurants(),document.getElementById("map-container").addEventListener("click",showMap)}),window.addEventListener("online",function(e){document.getElementById("offline").classList.remove("show"),toast("You are online.\nAll the changes will be synchronized.",3e3),DBHelper.syncRestaurants()}),window.addEventListener("offline",function(e){document.getElementById("offline").classList.add("show"),toast("You are offine.\nAll the changes will be synchronized when you return online.",5e3)}),window.addEventListener("DOMContentLoaded",function(e){navigator.onLine||document.getElementById("offline").classList.add("show")});
//# sourceMappingURL=main_all.js.map
