var pkg = require('./package.json'),
	gulp = require('gulp'),
	uglify = require('gulp-uglify'),
	rename = require('gulp-rename'),
	concat = require('gulp-concat'),
	del = require('del');

gulp.task('build', function () {
	gulp.src('src/**/*.js')
		.pipe(concat(pkg.name + '.js'))
		.pipe(gulp.dest('dist/'))
		.pipe(uglify())
		.pipe(rename(pkg.name + '.min.js'))
		.pipe(gulp.dest('dist/'));
});

