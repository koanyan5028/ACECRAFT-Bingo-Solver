import gulp from "gulp";
import ts from "gulp-typescript";
import sourcemaps from "gulp-sourcemaps";

import {spawn} from "child_process";
import fs from "fs";
import parser from "jsonc-parser";

function compile(){
	return gulp
		.src("index.ts")
		.pipe(sourcemaps.init())
		.pipe(
			ts(
				parser.parse(
					fs.readFileSync(
						"./tsconfig.json",
						"utf-8"
					)
				).compilerOptions
			)
		)
		.pipe(gulp.dest("."));
}

gulp.task("compile",compile);
gulp.task("default",compile);
gulp.task("watch_nocompile",()=>{
	gulp.watch("**/*.ts",compile);
	gulp.watch("**/*.html",compile);
	gulp.watch("**/*.css",compile);
});

gulp.task("watch",gulp.parallel(
	"compile",
	"watch_nocompile"
));
