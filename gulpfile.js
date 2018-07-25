const gulp = require('gulp');
// const autoprefixer = require('gulp-autoprefixer');
const sourcemaps = require('gulp-sourcemaps');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify-es').default;
const babel = require('gulp-babel');
const htmlmin = require('gulp-htmlmin');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const webp = require('gulp-webp');
const imagemin = require('gulp-imagemin');
const stripDebug = require('gulp-strip-debug');

gulp.task('default', ['copy-manifest', 'copy-html', 'copy-images', 'styles', 'scripts'], () => {
  gulp.watch('./css/**/*.css', ['styles']);
  gulp.watch('./js/**/*.js', ['scripts']);
  gulp.watch('./sw.js', ['scripts']);
  gulp.watch('./**/*.html', ['copy-html']);
  gulp.watch('./manifest.json', ['copy-manifest']);
});

gulp.task('copy-html', () =>
  gulp.src(['index.html', 'restaurant.html'])
  .pipe(gulp.dest('./dist'))
);

gulp.task('copy-manifest', () =>
  gulp.src(['manifest.json'])
  .pipe(gulp.dest('./dist'))
);

gulp.task('styles', () =>
  gulp.src('./css/**/*.css')
  .pipe(sourcemaps.init())
  .pipe(postcss([autoprefixer({
    browsers: ['last 2 version']
  })]))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest('./dist/css'))
);

gulp.task('scripts', () => {
  gulp.src(['js/idb.js', 'js/dbHelper.js', 'js/main.js'])
    .pipe(sourcemaps.init())
    .pipe(concat('main_all.js'))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./dist/js'));
  gulp.src('sw.js')
    .pipe(gulp.dest('./dist'));
  gulp.src(['js/idb.js', 'js/dbHelper.js', 'js/restaurant_info.js'])
    .pipe(sourcemaps.init())
    .pipe(concat('restaurant_all.js'))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./dist/js'));
});

gulp.task('scripts-dist', () => {
  gulp.src(['js/idb.js', 'js/dbHelper.js', 'js/main.js'])
    .pipe(sourcemaps.init())
    .pipe(babel({
      presets: [
        ['env', {
          "targets": {
            "browsers": ["last 2 versions"]
          }
        }]
      ]
    }))
    .pipe(concat('main_all.js'))
    .pipe(uglify())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./dist/js'));
  gulp.src(['js/idb.js', 'js/dbHelper.js', 'js/restaurant_info.js'])
    .pipe(sourcemaps.init())
    .pipe(babel({
      presets: [
        ['env', {
          "targets": {
            "browsers": ["last 2 versions"]
          }
        }]
      ]
    }))
    .pipe(concat('restaurant_all.js'))
    .pipe(uglify())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./dist/js'));
  gulp.src('sw.js')
    .pipe(gulp.dest('./dist'));
});

gulp.task('scripts-build', () => {
  gulp.src(['js/idb.js', 'js/dbHelper.js', 'js/main.js'])
    .pipe(sourcemaps.init())
    .pipe(stripDebug())
    .pipe(babel({
      presets: [
        ['env', {
          "targets": {
            "browsers": ["last 2 versions"]
          }
        }]
      ]
    }))
    .pipe(concat('main_all.js'))
    .pipe(uglify())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./dist/js'));
  gulp.src(['js/idb.js', 'js/dbHelper.js', 'js/restaurant_info.js'])
    .pipe(sourcemaps.init())
    .pipe(stripDebug())
    .pipe(babel({
      presets: [
        ['env', {
          "targets": {
            "browsers": ["last 2 versions"]
          }
        }]
      ]
    }))
    .pipe(concat('restaurant_all.js'))
    .pipe(uglify())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./dist/js'));
  gulp.src('sw.js')
    .pipe(gulp.dest('./dist'));
});

gulp.task('copy-images', () => {
  gulp.src('./img/*')
    .pipe(imagemin())
    .pipe(gulp.dest('./dist/img'));
  gulp.src('./favicon.*')
    .pipe(imagemin())
    .pipe(gulp.dest('./dist'));
  gulp.src('./img/*')
    .pipe(imagemin())
    .pipe(webp())
    .pipe(gulp.dest('./dist/img'));
});

gulp.task('minify-html', () =>
  gulp.src(['index.html', 'restaurant.html'])
  .pipe(htmlmin({
    collapseWhitespace: true
  }))
  .pipe(gulp.dest('./dist'))
);

gulp.task('minify-css', () => {
  var plugins = [
    autoprefixer({
      browsers: ['last 2 version']
    }),
    cssnano()
  ];
  gulp.src(['./css/**/*.css'])
    .pipe(sourcemaps.init())
    .pipe(postcss(plugins))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./dist/css'))
});


gulp.task('build', ['copy-manifest', 'copy-images', 'minify-html', 'minify-css', 'scripts-build']);