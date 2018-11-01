/*
  sass.js
  ===========
  compiles sass from assets folder
  also includes sourcemaps
*/

const fs = require('fs')
const gulp = require('gulp')
const path = require('path')
const sass = require('gulp-sass')
const sassVariables = require('gulp-sass-variables')
const sourcemaps = require('gulp-sourcemaps')

const config = require('./config.json')

// Default cache prefix
let cacheId = ''

// Inject Sass variables
const variables = () => {
  cacheId = cacheId || fs.readFileSync(path.resolve('./app/version.txt'), 'utf-8').trim()

  return {
    '$govuk-assets-path': cacheId
      ? `/assets/${cacheId}/` : '/assets/'
  }
}

gulp.task('sass', function () {
  return gulp.src(config.paths.assets + '/sass/*.scss')
    .pipe(sourcemaps.init())
    .pipe(sassVariables(variables()))
    .pipe(sass({outputStyle: 'expanded'}).on('error', sass.logError))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(config.paths.public + '/stylesheets/'))
})

gulp.task('sass-documentation', function () {
  return gulp.src(config.paths.docsAssets + '/sass/*.scss')
    .pipe(sourcemaps.init())
    .pipe(sassVariables(variables()))
    .pipe(sass({outputStyle: 'expanded'}).on('error', sass.logError))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(config.paths.public + '/stylesheets/'))
})

// Backward compatibility with Elements

gulp.task('sass-v6', function () {
  return gulp.src(config.paths.v6Assets + '/sass/*.scss')
    .pipe(sourcemaps.init())
    .pipe(sassVariables(variables()))
    .pipe(sass({
      outputStyle: 'expanded',
      includePaths: [
        'node_modules/govuk_frontend_toolkit/stylesheets',
        'node_modules/govuk-elements-sass/public/sass',
        'node_modules/govuk_template_jinja/assets/stylesheets'
      ]
    }).on('error', sass.logError))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(config.paths.public + '/v6/stylesheets/'))
})
