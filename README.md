Timeline.js
===========


Timeline.js is a lightweight JS library to plot graphs using SVG. As it uses SVG, you can add event listeners on the plotted graph very easily.

I coded it because I couldn't find any basic JS library to do this, without any external dependencies and extra features. Timeline.js is only 13k once minified, and can be reduced under 10k thanks to obfuscation. Better results may be obtained with a little refactor, but that's enough for me. Plus it can be very easily customised to fit your needs.

## Live demos

* [Single graph example](http://phyks.github.io/timeline.js/examples/index.html)
* [Multi graph example](http://phyks.github.io/timeline.js/examples/index2.html)
* [Rounded graph example](http://phyks.github.io/timeline.js/examples/index3.html)
* [Dashed graph example](http://phyks.github.io/timeline.js/examples/index4.html)
* [Line only graph example](http://phyks.github.io/timeline.js/examples/index5.html)
* [Graph with legend example](http://phyks.github.io/timeline.js/examples/index6.html)
* [Interactivity with points example](http://phyks.github.io/timeline.js/examples/index7.html)

## Usage

(See examples for more info. For live examples, see http://phyks.github.io/timeline.js/)


First, you must include the `timeline.js` or `timeline.min.js` script.

Then, you need to init the SVG drawing, thanks to `SVG.init({'id': 'holder', 'height': '100%', 'width': '100%', 'grid': 'both', 'x_axis': true, 'rounded': false, 'x_callback': false});`. The arguments are all optional and are:
* `id` : the id of the parent element that will contain the SVG
* `width` / `height` : width and height of the created SVG
* `grid` : none / small / big / both to choose which type of grid you want
* `x_axis` : true / false to show / hide the x axis
* `line` : none / line / dashed to choose line type. You can edit the dasharray by replacing `SVG.dash_style` value
* `fill` : true / false to fill the area below the graph or not
* `rounded` : true / false to use splines to smoothen the graph or not
* `x_callback` : callback function to call to get texts for the x legend. Not yet implemented

Then, you can add as many graphs as you want, thanks to `SVG.addGraph(NAME, COLOR);` where COLOR must be a valid CSS color.
And you can add points thanks to `SVG.addPoints(GRAPH_NAME, POINTS);`. Points is an array of point objects, which are of the type `{'x': ABSCISSA, 'y': ORDINATE, 'label': LABEL}`. LABEL is the text to display in the infobox when the mouse is over the point. You can use '%x' and '%y' in labels and they will be automatically replaced by the coordinates. You can also use `<sup>` and `<sub>` HTML tags. You can add another (optional) element `click` which must be a ffunction to bind to onclick event on this point.

_Note_ : You don't have to sort the points inside a same list of points in a SVG.addGraph call. They will be sorted for you. But, if you call SVG.addPoints multiple times, you must sort the points yourself between each call. The script won't do it for you and it will result in weird graphs if you don't do it.

Finally, you can draw the SVG thanks to `SVG.draw();`.

## Other functions

* `SVG.clearGraph(GRAPH);` to delete the data for the graph GRAPH, or for all graphs + the graphs definition if GRAPH is not specified.
* `SVG.hasGraph(GRAPH);` to check if a graph with name GRAPH has already been defined or not.

## License

```
* --------------------------------------------------------------------------------
* "THE NO-ALCOHOL BEER-WARE LICENSE" (Revision 42):
* Phyks (webmaster@phyks.me) wrote this file. As long as you retain this notice you
* can do whatever you want with this stuff (and you can also do whatever you want
* with this stuff without retaining it, but that's not cool...). If we meet some 
* day, and you think this stuff is worth it, you can buy me a <del>beer</del> soda 
* in return.
*																		Phyks
* ---------------------------------------------------------------------------------
```

## Known bugs / TODO

Feel free to contribute !

* Y axis is not implemented, but could be implemented easily
