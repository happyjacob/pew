'use strict';

var gutil = require('gulp-util');
var through = require('through2');

var letsPew = function letsPew(options, sync) {

	return through.obj(function(file, enc, cb) {

		// constants

		var DEFAULT_TITLE = 'Default title';
		var DEFAULT_DESCRIPTION = 'Default description';

		var SECTION_SIZES = [];
		SECTION_SIZES[0] = '-size-medium';
		SECTION_SIZES[1] = '-size-extra-small';
		SECTION_SIZES[2] = '-size-small';
		SECTION_SIZES[3] = '-size-medium';
		SECTION_SIZES[4] = '-size-large';

		var SECTION_STYLES = [];
		SECTION_STYLES[0] = '-color-white';
		SECTION_STYLES[1] = '-color-white';
		SECTION_STYLES[2] = '-color-light';
		SECTION_STYLES[3] = '-color-black';
		SECTION_STYLES[4] = '-color-primary';

		var SECTION_IMAGE = '-bg-image';

		var EMPTY_SECTION = '-is-empty';

		var filePush,
			addHeaders,
			createHtml,
			paragraphsSettings,
			cleanString,
			isLink,
			isImage,
			createStructure,
			createItems,
			stringToItems;

		filePush = function() {
			var content = String(file.contents);
			// getting the array of numbers and strings:
			var items = createItems(content);
			// getting the array with the structure and properties of the sections:
			var structure = createStructure(items);
			// getting the html from the structure array:
			var html = createHtml(structure);
			file.contents = new Buffer(html);
			file.path = gutil.replaceExtension(file.path, '.html');
			cb(null, file);
		};

		createHtml = function(structure) {
			var html = '';

			structure['sections'].forEach(function(section) {
				html = html + `\t\t<div class="wrapper`;

				section['classes'].forEach(function(className, i) {
					html = html + ` ` + className;
				});

				if (section['style']) html = html + `" style="` + section['style'];

				html = html + `">\n\t\t\t<div class="container">\n`;

				if (section['title']) html = html + `\t\t\t\t` + section['title'] + `\n`;

				section['paragraphs'].forEach(function(paragraph) {
					html = html + `\t\t\t\t` + paragraph + `\n`;
				});

				html = html + `\t\t\t</div>\n\t\t</div>\n`;
			});

			html = addHeaders(html, structure['title'] || DEFAULT_TITLE, structure['description'] || DEFAULT_DESCRIPTION);

			return html;
		}

		paragraphsSettings = function(string, isTitle) {

			if (isLink(string)) {
				var vimeoRegular = /(?:http?s?:\/\/)?(?:www\.)?(?:vimeo\.com)\/?(.+)/g;
				var youTubeRegular = /(?:http?s?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+)/g;
				var videoFrame;

				if(vimeoRegular.test(string)){
					var iframe = '<iframe width="420" height="345" src="https://player.vimeo.com/video/$1" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>';
					videoFrame = string.replace(vimeoRegular, iframe);
				}

				if(youTubeRegular.test(string)){
					var iframe = '<iframe width="420" height="345" src="http://www.youtube.com/embed/$1" frameborder="0" allowfullscreen></iframe>';
					videoFrame = string.replace(youTubeRegular, iframe);
				}

				return (videoFrame) ?
					`<div class="video-wrapper">` + videoFrame + `</div>` :
					`<div class="button-wrapper"><a href="` + string + `" target="_blank" class="button">Click Me</a></div>`;
			}

			string = cleanString(string);

			var regular = /(\(.*?)?\b((?:https?|ftp|file):\/\/[-a-z0-9+&@#\/%?=~_()|!:,.;]*[-a-z0-9+&@#\/%=~_()|])/ig;

			string = string.replace(regular, function(url) {
				return "<a href='" + url + "' target='_blank'>" + url + "</a>";
			});

			return isTitle ? `<h2>` + string + '</h2>' : `<p>` + string + '</p>';
		}

		cleanString = function(string)  {
			return string
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/"/g, "&quot;")
				.replace(/'/g, "&#039;");
		}

		isLink = function(string) {
			var regular = /(\(.*?)?\b((?:https?|ftp|file):\/\/[-a-z0-9+&@#\/%?=~_()|!:,.;]*[-a-z0-9+&@#\/%=~_()|])/ig;
			var link = string.replace(regular, '');
			return (link.length) ? false : true;
		}

		isImage = function(string) {
			return (string.match(/\.(jpg|gif|png)$/)!= null);
		}

		createStructure = function(items) {
			var structure = [];
			var sectionIndex = 0;

			structure['sections'] = [];

			items.forEach(function(item, i) {

				// for strings
				if (!Number.isInteger(item)) {

					// if the first item is string then it is a title
					if ((i == 0) && !isLink(item)) structure['title'] = cleanString(item);

					// creating a first section with the default size
					// setting the string as a title of the section
					// (it is the case when a string follows the title of the document)
					else if (!structure['sections'][sectionIndex]) {
						structure['sections'][sectionIndex] = [];
						structure['sections'][sectionIndex]['classes'] = [];
						structure['sections'][sectionIndex]['paragraphs'] = [];
						structure['sections'][sectionIndex]['title'] = paragraphsSettings(item, true);
						structure['sections'][sectionIndex]['classes'].push(SECTION_SIZES[0]);
					}

					// if the sections is already declared without a title
					// then the string is title of the section
					else if (!structure['sections'][sectionIndex]['title'] && !(isLink(item) && isImage(item))) structure['sections'][sectionIndex]['title'] = paragraphsSettings(item, true);

					// if the string is not a link otherwise the string is paragraph
					else if (!(isLink(item) && isImage(item))) structure['sections'][sectionIndex]['paragraphs'].push(paragraphsSettings(item));

					else {
						if (structure['sections'][sectionIndex]['classes'].length < 2) structure['sections'][sectionIndex]['classes'].push(SECTION_IMAGE);
						structure['sections'][sectionIndex]['style'] = 'background-image: url(' + item + ')';
					}

					// adding description
					if ((i > 0) && (!structure['description']) && (!isLink(item)) && (item.length > 20)) structure['description'] = cleanString(item);
				}

				// for numbers
				else {

					// if the next item is a string
					// let's declare new  section
					if (items[i + 1] && !Number.isInteger(items[i + 1])) {

						// before the declaration a new section
						// setting default styles for the previous
						// and increasing the index
						if (structure['sections'].length) {
							if (structure['sections'][sectionIndex]['classes'].length < 2) structure['sections'][sectionIndex]['classes'].push(SECTION_STYLES[0]);
							sectionIndex++;
						}

						structure['sections'][sectionIndex] = [];
						structure['sections'][sectionIndex]['classes'] = [];
						structure['sections'][sectionIndex]['paragraphs'] = [];

						if (item > SECTION_SIZES.length - 1) item = SECTION_SIZES.length - 1;
						structure['sections'][sectionIndex]['classes'].push(SECTION_SIZES[item]);
					}

					// is the previos and the next items are numbers
					else if ((i == 0) || (items[i - 1] && Number.isInteger(items[i - 1]))) {
						if (structure['sections'].length) sectionIndex++;
						structure['sections'][sectionIndex] = [];
						structure['sections'][sectionIndex]['classes'] = [];
						structure['sections'][sectionIndex]['paragraphs'] = [];
						structure['sections'][sectionIndex]['classes'].push(EMPTY_SECTION);
						if (item > SECTION_STYLES.length - 1) item = SECTION_STYLES.length - 1;
						if (structure['sections'][sectionIndex]['classes'].length < 2) structure['sections'][sectionIndex]['classes'].push(SECTION_STYLES[item]);
					}

					// otherwise it is a closing of the current section
					else {
						if (item > SECTION_STYLES.length - 1) item = SECTION_STYLES.length - 1;
						if (structure['sections'][sectionIndex]['classes'].length < 2) structure['sections'][sectionIndex]['classes'].push(SECTION_STYLES[item]);
					}
				}
			});

			return structure;
		}

		createItems = function(content) {
			var items = [];
			var strings = content.split('\n');

			strings.forEach(function(string, i, arr) {
				items = items.concat(stringToItems(string));
			});

			return items;
		}

		stringToItems = function(string) {
			var items = [];
			var itemIndex = 0;
			var substrings = string.split('/pew');

			substrings.forEach(function(substring, i) {
				substring = substring.trim();

				// for strings
				if (substring) {

					if (Number.isInteger(items[itemIndex])) itemIndex++;
					items[itemIndex] = substring;
				}

				// for dividers
				if ((substrings.length - 1) > i) {
					if (Number.isInteger(items[itemIndex])) items[itemIndex]++;
					else {
						if (items[itemIndex]) itemIndex++
						items[itemIndex] = 1;
					}
				}
			});

			return items;
		};

		addHeaders = function(content, title, description) {
			var now = new Date();
			var keywords = description.match(/(\w+){5}/ig).join(', ');
			var meta = `<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="utf-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">\n\t<meta name="description" content="` + description + `">\n\t<meta name="keywords" content="` + keywords + `">\n\t<meta property="og:title" content="` + title + `">\n\t<meta property="og:description" content="` + description + `">\n\t<meta property="og:image" content="img/share.png">\n\t<meta property="og:type" content="website">\n\t<meta name="twitter:card" content="summary_large_image">\n\t<meta name="twitter:title" content="` + title + `">\n\t<meta name="twitter:description" content="` + description + `">\n\t<meta name="twitter:image" content="img/share.png">\n\t<link href="img/ios-60.png" rel="apple-touch-icon-precomposed" sizes="60x60" type="image/png">\n\t<link href="img/ios-76.png" rel="apple-touch-icon-precomposed" sizes="76x76" type="image/png">\n\t<link href="img/ios-120.png" rel="apple-touch-icon-precomposed" sizes="120x120" type="image/png">\n\t<link href="img/ios-152.png" rel="apple-touch-icon-precomposed" sizes="152x152" type="image/png">\n\t<title>` + title + `</title>\n\t<link rel="icon" href="favicon.ico?v=1.1">\n\t<link href="css/app.css" rel="stylesheet" type="text/css">\n</head>\n<body>\n\t<div class="content">\n`;
			var header = `\n\t<div class="wrapper -is-header">\n\t\t<div class="container">\n\t\t\t<img src="img/logo.svg" alt="">\n\t\t</div>\n\t</div>\n`;
			var footer = `\t</div>\n\t<div class="wrapper -is-footer">\n\t\t<div class="container">\n\t\t\t<p>Created through the <a href="/" target="_blank">/pew</a>, ` + now.getFullYear() + `.</p>\n\t\t</div>\n\t</div>\n</body>\n</html>`;
			return meta + header + content + footer;
		};

		filePush();

	});
};

module.exports = letsPew;
