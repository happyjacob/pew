'use strict';

var gulp = require('gulp');
var sass = require('gulp-sass');
var pew = require('./pew');

gulp.task('sass', function () {
  return gulp.src('resources/sass/app.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('css'));
});

gulp.task('pages', function(){
  return gulp.src('resources/pages/*.pew')
    .pipe(pew())
    .pipe(gulp.dest(''));
});

gulp.task('default', ['sass', 'pages']);