var gulp = require('gulp');

/* PLUG-INS */

var del = require('del');
var mocha = require('gulp-mocha');
var jslint = require('gulp-jslint');


gulp.task('default', ['clean', 'test', 'build'], function () {
});

/* CLEAN */

gulp.task('clean', function () {
    del(['./target', 'node_modules', 'public/bower_components']);
});

/* TEST */

gulp.task('test', ['jshint'], function(){
    gulp.src('test/**/*.js')
        .pipe(mocha({
            reporter: 'spec'
        }))
        .on("error", function (err) {
            console.log(err.toString());
            this.emit('end');
        });
});

gulp.task('jshint', function () {
	gulp.src(['./app.js', './lib/*.js'])
		.pipe(jslint({
            nomen: true,
            white: true,
            errorsOnly: false
        }))
        .on("error", function (err) {
            console.log(err.toString());
            this.emit('end');
        });
});

/* BUILD */

gulp.task('build', function () {
    del(['./target/*']);
    gulp.src(['./app.js', './package.json', './manifest.yml', './Procfile'])
      .pipe(gulp.dest('target'));
});