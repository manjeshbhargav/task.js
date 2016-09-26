'use strict';

var gulp = require('gulp');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');

gulp.task('build', function() {
  return browserify('./index.js')
    .bundle()
    .pipe(source('task.js'))
    .pipe(gulp.dest('./dist'));
});

gulp.task('minify', ['build'], function() {
  return gulp.src('./dist/task.js')
    .pipe(uglify())
    .pipe(rename('task.min.js'))
    .pipe(gulp.dest('./dist'));
});

gulp.task('default', ['minify']);