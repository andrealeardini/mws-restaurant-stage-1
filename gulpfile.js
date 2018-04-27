const gulp = require('gulp');
const autoprefixer = require('gulp-autoprefixer');
const sourcemaps = require('gulp-sourcemaps');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify-es').default;
const babel = require('gulp-babel');

gulp.task('default', ['copy-html', 'copy-images', 'styles', 'scripts'], () => {
    gulp.watch('./css', ['styles']);
    gulp.watch('./jw', ['scripts']);
    gulp.watch('./**/*.html', ['copy-html']);
});

gulp.task('copy-html', () =>
    gulp.src(['index.html', 'restaurant.html'])
    .pipe(gulp.dest('./dist'))
);

gulp.task('styles', () =>
    gulp.src('./css/**/*.css')
    .pipe(autoprefixer({
        browsers: ['last 2 versions']
    }))
    .pipe(gulp.dest('./dist/css'))
);

gulp.task('scripts', () => {
    gulp.src(['js/idb.js', 'js/dbHelper.js'])
        .pipe(concat('all.js'))
        .pipe(gulp.dest('./dist/js'));
    gulp.src('sw.js')
        .pipe(gulp.dest('./dist'));
    gulp.src(['js/main.js', 'js/restaurant_info.js'])
        .pipe(gulp.dest('./dist/js'))
});

gulp.task('scripts-dist', () => {
    gulp.src(['js/idb.js', 'js/dbHelper.js'])
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
        .pipe(concat('all.js'))
        .pipe(uglify())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('./dist/js'));
    gulp.src(['js/main.js', 'js/restaurant_info.js'])
        .pipe(sourcemaps.init())
        .pipe(uglify())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('./dist/js'));
    gulp.src('sw.js')
        .pipe(sourcemaps.init())
        .pipe(uglify())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('./dist'));
});

// TODO Optimize images (next stage)
gulp.task('copy-images', () =>
    gulp.src('./img/*')
    .pipe(gulp.dest('./dist/img'))
);