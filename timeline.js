/* Timeline.js
 * Author : Phyks (http://phyks.me)
 * http://phyks.github.io/timeline.js

 * --------------------------------------------------------------------------------
 * "THE NO-ALCOHOL BEER-WARE LICENSE" (Revision 42):
 * Phyks (webmaster@phyks.me) wrote this file. As long as you retain this notice you
 * can do whatever you want with this stuff (and you can also do whatever you want
 * with this stuff without retaining it, but that's not cool...). If we meet some
 * day, and you think this stuff is worth it, you can buy me a <del>beer</del> soda
 * in return.
 * Phyks
 * ---------------------------------------------------------------------------------
 */

var SVG = {};
SVG.ns = "http://www.w3.org/2000/svg";
SVG.xlinkns = "http://www.w3.org/1999/xlink";

SVG.marginBottom = 10;
SVG.marginTop = 15;
SVG.marginLeft = 10;
SVG.marginRight = 10;
SVG.rounded = false;
SVG.x_axis = false;

SVG.parent_holder = false;
SVG.holder = false;
SVG.g = false;
SVG.axis = false;
SVG.raw_points = [];
SVG.labels = [];
SVG.click = [];
SVG.x_callback = false;


// Create an element "element" with the attributes "attrs"
SVG.createElement = function (element, attrs) {
    var el = document.createElementNS(SVG.ns, element);
    for(attr in attrs) {
        el.setAttribute(attr, attrs[attr]);
    }

    return el;
};

// Check wether the element "element" has class "class"
SVG.hasClass = function (element, cls) {
    return (' ' + element.getAttribute('class') + ' ').indexOf(' ' + cls + ' ') > -1;
};

// Add a new graph to the SVG
SVG.addGraph = function (graph, color) {
    SVG.raw_points[graph] = {};
    SVG.raw_points[graph].color = color;
    SVG.raw_points[graph].data = new Array();

    SVG.labels[graph] = new Array();
    SVG.click[graph] = new Array();
};

// Test wether a graph of name "graph" already exists
SVG.hasGraph = function (graph) {
    if(SVG.raw_points[graph] === undefined) {
        return false;
    }
    else {
        return true;
    }
};

// Clear the specified graph data, or completely clear all the graph data
SVG.clearGraphData = function (graph) {
    if(typeof(graph) === 'undefined') {
        SVG.raw_points = [];
        SVG.labels = [];
        SVG.click = [];
    }
    else {
        SVG.raw_points[graph].data = new Array();
        SVG.labels[graph] = new Array();
        SVG.click[graph] = new Array();
    }
};

// Add points to the specified graph
// TODO : Sort with existing also
SVG.addPoints = function (graph, data) {
    data.sort(function (a, b) {
        if(a.x < b.x) {
            return -1;
        }
        else if(a.x == b.x) {
            return 0;
        }
        else {
            return 1;
        }
    });

    for(var point = 0; point < data.length; point++) {
        SVG.raw_points[graph].data.push([data[point].x, data[point].y]);
        if(data[point].label !== undefined) {
            SVG.labels[graph].push(data[point].label);
        }
        else {
            SVG.labels[graph].push('');
        }
        if(data[point].click !== undefined) {
            SVG.click[graph].push(data[point].click);
        }
        else {
            SVG.click[graph].push(false);
        }
    }
};

// Compute new coordinates, knowing the min and max value to fit the graph in the container
SVG.newCoordinate = function(value, min, max, minValue, maxValue) {
    var a = (maxValue - minValue) / (max - min);
    return a * value - a * min + minValue;
};

// Compute new X and Y values
// TODO : Partial application ?
SVG.getNewXY = function (minX, maxX, minY, maxY) {
    return function (x, y) {
        return { 
            'x': SVG.newCoordinate(x, minX, maxX, SVG.marginLeft, SVG.parent_holder.offsetWidth - SVG.marginRight),
            'y': SVG.newCoordinate(y, minY, maxY, 2*SVG.marginBottom, SVG.parent_holder.offsetWidth - SVG.marginTop)
        };
    };
};

// Get the necessary control points to smoothen the graph, is rounded is true
SVG.getControlPoints = function (data) {
    // From http://www.particleincell.com/wp-content/uploads/2012/06/bezier-spline.js
    var p1 = new Array();
	var p2 = new Array();
	var n = data.length - 1;
	
	/*rhs vector*/
	var a = new Array();
	var b = new Array();
	var c = new Array();
	var r = new Array();
	
	/*left most segment*/
	a[0] = 0;
	b[0] = 2;
	c[0] = 1;
	r[0] = data[0] + 2*data[1];
	
	/*internal segments*/
	for (var i = 1; i < n - 1; i++) {
        a[i] = 1;
        b[i] = 4;
        c[i] = 1;
        r[i] = 4 * data[i] + 2 * data[i+1];
	}
			
	/*right segment*/
	a[n-1] = 2;
	b[n-1] = 7;
	c[n-1] = 0;
	r[n-1] = 8*data[n-1] + data[n];
	
	/*solves Ax=b with the Thomas algorithm (from Wikipedia)*/
    var m;
	for (var i = 1; i < n; i++) {
		m = a[i]/b[i-1];
		b[i] = b[i] - m * c[i - 1];
		r[i] = r[i] - m*r[i-1];
	}
 
	p1[n-1] = r[n-1]/b[n-1];
	for (var i = n - 2; i >= 0; --i) {
		p1[i] = (r[i] - c[i] * p1[i+1]) / b[i];
    }
		
	/*we have p1, now compute p2*/
	for (var i=0;i<n-1;i++) {
		p2[i] = 2*data[i+1] - p1[i+1];
    }
	
	p2[n-1] = 0.5*(data[n] + p1[n-1]);
	
	return {p1:p1, p2:p2};
};

/* Initialization :
 * arg is an object with :
 * id = id of the parent block
 * height / width = size of the svg
 * grid = small / big / both
 * x_axis = true / false to show or hide x axis
 * rounded = true / false to use splines to smoothen the graph
 * x_callback = function(args) { } or false is called to display the legend on the x axis
 */
SVG.init = function (arg) {
    if(!document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#Image", "1.1")) {
        alert("ERROR : Your browser does not support embedded SVG.");
    }
    SVG.parent_holder = document.getElementById(arg.id);

    var svg = SVG.createElement('svg:svg', { 'width': arg.width, 'height': arg.height });
    svg.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:xlink', SVG.xlinkns);
    SVG.parent_holder.appendChild(svg);

    SVG.holder = SVG.parent_holder.querySelector('svg');

    defs = SVG.createElement('defs', {});
    SVG.holder.appendChild(defs);

    if(arg.grid === 'small' || arg.grid === 'both') {
        var small_grid_pattern = SVG.createElement('pattern', { 'id': 'smallGrid', 'width': 8, 'height': 8, 'patternUnits': 'userSpaceOnUse' });

        var small_grid_path = SVG.createElement('path', { 'd': 'M 8 0 L 0 0 0 8', 'fill': 'none', 'stroke': 'gray', 'stroke-width': '0.5' });
        small_grid_pattern.appendChild(small_grid_path);

        defs.appendChild(small_grid_pattern);
    }
    if(arg.grid === 'big' || arg.grid === 'both') {
        var grid_pattern = SVG.createElement('pattern', { 'id': 'grid', 'width': 80, 'height': 80, 'patternUnits': 'userSpaceOnUse' });

        if(arg.grid === 'both') {
            var grid_rect = SVG.createElement('rect', {'width': 80, 'height': 80, 'fill': 'url(#smallGrid)' });
            grid_pattern.appendChild(grid_rect);
        }

        var grid_path = SVG.createElement('path', {'d': 'M 80 0 L 0 0 0 80', 'fill': 'none', 'stroke': 'gray', 'stroke-width': '1'});
        grid_pattern.appendChild(grid_path);

        defs.appendChild(grid_pattern);
    }
    SVG.grid = arg.grid;


    var marker = SVG.createElement('marker', {'id': 'markerArrow', 'markerWidth': 13, 'markerHeight': 13, 'refX': 2, 'refY': 6, 'orient': 'auto' });
    var marker_path = SVG.createElement('path', {'d': 'M2,2 L2,11 L10,6 L2,2', 'fill': 'gray' });
    marker.appendChild(marker_path);
    defs.appendChild(marker);

    SVG.g = SVG.createElement('g', {'transform': 'translate(0, ' + SVG.parent_holder.offsetHeight + ') scale(1, -1)'});
    SVG.holder.appendChild(SVG.g);

    if(arg.x_axis === true) {
        SVG.axis = SVG.createElement('line', {'x1': SVG.marginLeft, 'y1': SVG.parent_holder.offsetHeight / 2 + 1.5, 'x2': SVG.parent_holder.offsetWidth - 13 - SVG.marginRight, 'y2': SVG.parent_holder.offsetHeight / 2 + 1.5, 'stroke': 'gray', 'stroke-width': 3, 'marker-end': 'url("#markerArrow")'});
        SVG.g.appendChild(SVG.axis);
    }

    if(SVG.grid !== "none") {
        var grid = SVG.createElement('rect', {'width': '100%', 'height': '100%'});
        if(SVG.grid === 'big' || SVG.grid === 'both') {
            grid.setAttribute('fill', 'url(#grid)');
        }
        else {
            grid.setAttribute('fill', 'url(#smallGrid)');
        }
        SVG.g.appendChild(grid);
    }

    SVG.rounded = arg.rounded;
    SVG.x_axis = arg.x_axis;

    SVG.x_callback = arg.x_callback;

    SVG.parent_holder.addEventListener('mousemove', function(e) {
        // TODO
        var evt = e || window.event;
        var rect = false;

        // Reinitialize all states
        var rects = SVG.holder.querySelectorAll('.over');
        for(rect = 0; rect < rects.length; rect ++) {
            SVG.holder.getElementById(rects[rect].getAttribute('id').replace('over', 'point')).setAttribute('r', '4');
            if(SVG.labels[graph][parseInt(rects[rect].getAttribute('id').replace('over_', ''))] !== '') {
                SVG.holder.getElementById(rects[rect].getAttribute('id').replace('over', 'label')).setAttribute('display', 'none');
            }
        }

        SVG.overEffect(evt.clientX, evt.clientY);
    });
};

// Handle the over effect 
// TODO : Better solution ?
SVG.overEffect = function(x, y) {
    if(!document.elementFromPoint(x, y)) {
        return;
    }

    // Recursive function to pass event to all superposed rects
    var rect = document.elementFromPoint(x, y);
    
    if(!SVG.hasClass(rect, 'over')) {
        return;
    }

    // Handle the event on current rect
    SVG.holder.getElementById(rect.getAttribute('id').replace('over', 'point')).setAttribute('r', '6');
    if(SVG.labels[graph][parseInt(rect.getAttribute('id').replace('over_', ''))] !== '') {
        SVG.holder.getElementById(rect.getAttribute('id').replace('over', 'label')).setAttribute('display', 'block');
    }

    // Hide it
    rect.setAttribute('display', 'none');

    // Recursive call
    SVG.overEffect(x, y);

    // Display again the rect element
    rect.setAttribute('display', 'block');
};

// Get the scale so that graph fits with window
// TODO : refactor
SVG.scale = function(data) {
    var empty = true;
    for(graph in data) {
        empty = false;
        break;
    }
    if(empty) {
        return false;
    }

    var minX = new Array(), minY = new Array();
    var maxX = new Array(), maxY = new Array();
    var circle = false, last_point = false, line = false;

    var tmp_minX, tmp_minY, tmp_maxX, tmp_maxY

    for(graph in data) {
        tmp_minX = false;
        tmp_minY = 0;
        tmp_maxX = false;
        tmp_maxY = false;

        for(var point = 0; point < data[graph].data.length; point++) {
            x = data[graph].data[point][0];
            y = data[graph].data[point][1];

            if(x < tmp_minX || tmp_minX === false) {
                tmp_minX = x;
            }
            if(x > tmp_maxX || tmp_maxX === false) {
                tmp_maxX = x;
            }
            if(y < tmp_minY) {
                tmp_minY = y;
            }
            if(y > tmp_maxY || tmp_maxY === false) {
                tmp_maxY = y;
            }
        }
        minX.push(tmp_minX);
        minY.push(tmp_minY);
        maxX.push(tmp_maxX);
        maxY.push(tmp_maxY);
    }

    minX = Math.min.apply(null, minX);
    minY = Math.min.apply(null, minY);
    maxX = Math.max.apply(null, maxX);
    maxY = Math.max.apply(null, maxY);

    var scale = SVG.getNewXY(minX, maxX, minY, maxY);
    var coordinates = scale(Math.pow(10, Math.floor(Math.log(maxX - minX) / Math.log(10))), Math.pow(10, Math.floor(Math.log(maxY - minY) / Math.log(10))));
    if(SVG.grid === 'big' || SVG.grid === 'both') {
        SVG.holder.getElementById('grid').setAttribute('width', coordinates.x);
        SVG.holder.getElementById('grid').setAttribute('height', coordinates.y);
        var big_coords = scale(Math.floor(minX / Math.pow(10, Math.floor(Math.log(maxX - minX) / Math.log(10)))) * Math.pow(10, Math.floor(Math.log(maxX - minX) / Math.log(10))), Math.floor(minY / Math.pow(10, Math.floor(Math.log(maxY - minY) / Math.log(10)))) * Math.pow(10, Math.floor(Math.log(maxY - minY) / Math.log(10))))
        SVG.holder.getElementById('grid').setAttribute('y', big_coords.y);
        SVG.holder.getElementById('grid').setAttribute('x', big_coords.x);
        SVG.holder.getElementById('grid').querySelector('path').setAttribute('d', 'M '+coordinates.x+' 0 L 0 0 0 '+coordinates.y);

        if(SVG.grid === 'both') {
            SVG.holder.getElementById('grid').querySelector('rect').setAttribute('width', coordinates.x);
            SVG.holder.getElementById('grid').querySelector('rect').setAttribute('height', coordinates.y);
        }
    }
    if(SVG.grid === 'small' || SVG.grid === 'both') {
        coordinates.x = coordinates.x / 10;
        coordinates.y = coordinates.y / 10;
        SVG.holder.getElementById('smallGrid').setAttribute('width', coordinates.x);
        SVG.holder.getElementById('smallGrid').setAttribute('height', coordinates.y);
        if(SVG.grid === 'small') {
            var small_coords = scale(Math.floor(minX / Math.pow(10, Math.floor(Math.log(maxX - minX) / Math.log(10)))) * Math.pow(10, Math.floor(Math.log(maxX - minX) / Math.log(10))), Math.floor(minY / Math.pow(10, Math.floor(Math.log(maxY - minY) / Math.log(10)))) * Math.pow(10, Math.floor(Math.log(maxY - minY) / Math.log(10))));
            SVG.holder.getElementById('smallGrid').setAttribute('y', small_coords.y);
            SVG.holder.getElementById('smallGrid').setAttribute('x', small_coords.x);
        }
        SVG.holder.getElementById('smallGrid').querySelector('path').setAttribute('d', 'M '+coordinates.x+' 0 L 0 0 0 '+coordinates.y);
    }

    /* Draw axis */
    if(SVG.x_axis === true) {
        y = scale(0, 0).y;
        SVG.axis.setAttribute('y1', y);
        SVG.axis.setAttribute('y2', y);
    }

    return scale;
};

// Draw graphs
// TODO : Finish refactor
SVG.draw = function() {
    var scale = SVG.scale(SVG.raw_points);
    var x, y, path;
    var px, py;
    var element;

    for(var graph in SVG.raw_points) {
        x = new Array();
        y = new Array();
        path = '';

        /* Draw points */
        for(var point = 0; point < SVG.raw_points[graph].data.length; point++) {
            var tmp = scale(SVG.raw_points[graph].data[point][0], SVG.raw_points[graph].data[point][1]);
            x.push(tmp.x);
            y.push(tmp.y);
        }

        if(SVG.rounded === true) {
            px = SVG.getControlPoints(x);
            py = SVG.getControlPoints(y);
            for(var point = 0; point < SVG.raw_points[graph].data.length - 1; point++) {
                path += 'C '+px.p1[point]+' '+py.p1[point]+' '+px.p2[point]+' '+py.p2[point]+' '+x[point+1]+' '+y[point+1]+' ';
            }
        }
        else {
            for(var point = 1; point < SVG.raw_points[graph].data.length; point++) {
                path += 'L '+x[point]+' '+y[point]+' ';
            }
        }
        element = SVG.createElement('path', {'class': 'graph', 'fill': SVG.raw_points[graph].color, 'opacity': '0.25', 'stroke': 'none', 'd': 'M '+x[0]+' '+2*SVG.marginBottom+' L '+x[0]+' '+y[0]+' '+ path + ' L '+x[SVG.raw_points[graph].data.length - 1]+' '+2*SVG.marginBottom+' Z' });
        SVG.g.insertBefore(element, SVG.g.querySelectorAll('.over')[0]);

        element = SVG.createElement('path', {'class': 'line', 'stroke': SVG.raw_points[graph].color, 'stroke-width': 2, 'fill': 'none', 'd': 'M '+x[0]+' '+y[0]+' '+path});
        SVG.g.appendChild(element);

        for(var point = 0; point < SVG.raw_points[graph].data.length; point++) {
            element = SVG.createElement('circle', {'class': 'point', 'id': 'point_'+point+'_'+graph, 'cx': x[point], 'cy': y[point], 'r': 4, 'fill': '#333', 'stroke': SVG.raw_points[graph].color, 'stroke-width': 2});
            SVG.g.insertBefore(element, SVG.g.querySelectorAll('.label')[0]);

            if(SVG.click[graph][point] !== false) {
                element.onclick = SVG.click[graph][point];
            }

            if(SVG.labels[graph][point] !== '') {
                var g = SVG.createElement('g', { 'class': 'label', 'id': 'label_'+point+'_'+graph, 'transform': 'translate(0, ' + SVG.parent_holder.offsetHeight + ') scale(1, -1)'});
                SVG.g.appendChild(g);

                element = SVG.createElement('text', {});
                var text = SVG.labels[graph][point].replace('</sup>', '<sup>').split('<sup>');
                for(var i = 0; i < text.length; i++) {
                    text[i] = text[i].replace(/(<([^>]+)>)/ig,"").replace('%y', SVG.raw_points[graph].data[point][1]).replace('%x', SVG.raw_points[graph].data[point][0]);
                    if(i % 2 == 0) {
                        element.appendChild(document.createTextNode(text[i]));

                    }
                    else {
                        var tmp = SVG.createElement('tspan', {'dy': '-5'});
                        tmp.appendChild(document.createTextNode(text[i]));
                        element.appendChild(tmp);
                    }
                }

                path = SVG.createElement('path', {'stroke': 'black', 'stroke-width': 2, 'fill': 'white', 'opacity': 0.5});

                // Append here to have them with the good z-index, update their attributes later
                g.appendChild(path);
                g.appendChild(element);

                var x_text = x[point] - element.getBoundingClientRect().width / 2;
                var y_text = SVG.parent_holder.offsetHeight - y[point] - 20;
                var element_width = element.getBoundingClientRect().width;
                var element_height = element.getBoundingClientRect().height;

                if(x[point] - element.getBoundingClientRect().width / 2 < 0) {
                    x_text = x[point] + 20;
                    y_text = SVG.parent_holder.offsetHeight - y[point] + 5;
                    path.setAttribute('d', 'M '+(x_text - 5)+' '+(y_text + 5)+' L '+(x_text - 5)+' '+(y_text - element_height/2 + 7.5)+' L '+(x_text - 10)+' '+(y_text - element_height/2 + 5)+' L '+(x_text - 5)+' '+(y_text - element_height/2 + 2.5)+' L '+(x_text - 5)+' '+(y_text - element_height + 5)+' L '+(x_text + element_width + 5)+' '+(y_text - element_height + 5)+' L '+(x_text + element_width + 5)+' '+(y_text + 5)+' Z');
                }
                else if(y[point] + element.getBoundingClientRect().height + 12 > SVG.parent_holder.offsetHeight) {
                    x_text = x[point] + 20;
                    y_text = SVG.parent_holder.offsetHeight - y[point] + 5;
                    path.setAttribute('d', 'M '+(x_text - 5)+' '+(y_text + 5)+' L '+(x_text - 5)+' '+(y_text - element_height/2 + 7.5)+' L '+(x_text - 10)+' '+(y_text - element_height/2 + 5)+' L '+(x_text - 5)+' '+(y_text - element_height/2 + 2.5)+' L '+(x_text - 5)+' '+(y_text - element_height + 5)+' L '+(x_text + element_width + 5)+' '+(y_text - element_height + 5)+' L '+(x_text + element_width + 5)+' '+(y_text + 5)+' Z');

                    if(x_text + element_width > SVG.parent_holder.offsetWidth) {
                        x_text = x[point] - element_width - 20;
                        y_text = SVG.parent_holder.offsetHeight - y[point] + 5;
                        path.setAttribute('d', 'M '+(x_text - 5)+' '+(y_text + 5)+' L '+(x_text - 5)+' '+(y_text  - element_height + 5)+' L '+(x_text + element_width + 5)+' '+(y_text - element_height + 5)+' L '+(x_text + element_width + 5)+' '+(y_text - element_height/2 + 2.5)+' L '+(x_text + element_width + 10)+' '+(y_text - element_height/2 + 5)+' L '+(x_text + element_width + 5)+' '+(y_text - element_height/2 + 7.5)+' L '+(x_text + element_width + 5)+' '+(y_text + 5)+' Z');
                    }
                }
                else if(x[point] + element_width / 2 + 12 > SVG.parent_holder.offsetWidth) {
                    x_text = x[point] - element_width - 20;
                    y_text = SVG.parent_holder.offsetHeight - y[point] + 5;
                    path.setAttribute('d', 'M '+(x_text - 5)+' '+(y_text + 5)+' L '+(x_text - 5)+' '+(y_text  - element_height + 5)+' L '+(x_text + element_width + 5)+' '+(y_text - element_height + 5)+' L '+(x_text + element_width + 5)+' '+(y_text - element_height/2 + 2.5)+' L '+(x_text + element_width + 10)+' '+(y_text - element_height/2 + 5)+' L '+(x_text + element_width + 5)+' '+(y_text - element_height/2 + 7.5)+' L '+(x_text + element_width + 5)+' '+(y_text + 5)+' Z');
                }
                else {
                    path.setAttribute('d', 'M '+(x_text - 5)+' '+(y_text + 5)+' L '+(x_text - 5)+' '+(y_text  - element_height + 5)+' L '+(x_text + element_width + 5)+' '+(y_text - element_height + 5)+' L '+(x_text + element_width + 5)+' '+(y_text + 5)+' L '+(x_text + element_width/2 + 2.5)+' '+(y_text + 5)+' L '+(x_text + element_width/2)+' '+(y_text + 10)+' L '+(x_text + element_width/2 - 2.5)+' '+(y_text + 5)+' Z');
                }
                element.setAttribute('x', x_text);
                element.setAttribute('y', y_text);
    

                g.setAttribute('display', 'none');
            }
        }

        for(var point = 0; point < SVG.raw_points[graph].data.length; point++) {
            var rect = SVG.createElement('rect', {'class': 'over', 'id': 'over_'+point+'_'+graph, 'y': 0, 'fill': 'white', 'opacity': 0, 'height': '100%'});
            if(point == 0) {
                rect.setAttribute('x', 0);
            }
            else {
                rect.setAttribute('x', (x[point] + x[point - 1]) / 2);
            }

            if(point == SVG.raw_points[graph].data.length - 1) {
                rect.setAttribute('width', SVG.parent_holder.offsetWidth - (x[point] + x[point - 1])/2);
            }
            else if(point == 0) {
                rect.setAttribute('width', (x[1] + x[0])/2 + SVG.marginLeft);
            }
            else {
                rect.setAttribute('width', (x[point + 1] - x[point - 1])/2);
            }
            SVG.g.appendChild(rect);

            rect.onclick = (function(x, y) {
                return function(e) {
                    var evt = e || window.event;

                    var X = evt.clientX - x;
                    var Y = this.getBoundingClientRect().bottom - evt.clientY - y;
                    if(X <= 5 &&  X >= -5 && Y <= 5 && Y >= -5) {
                        SVG.holder.getElementById(this.getAttribute('id').replace('over', 'point')).onclick();
                    }
                }
            })(x[point], y[point]);

            if(SVG.x_callback !== false) {
                element = SVG.createElement('text', {'class': 'legend_x', 'fill': 'gray', 'transform': 'translate(0, ' + SVG.parent_holder.offsetHeight + ') scale(1, -1)'});
                element.appendChild(document.createTextNode(SVG.x_callback(x[point])));
                SVG.g.appendChild(element);
                element.setAttribute('x', x[point] - element.getBoundingClientRect().width / 2 + 2.5);
                var y_zero = scale(0, 0).y
                element.setAttribute('y', SVG.parent_holder.offsetHeight - SVG.marginBottom - y_zero);

                element = SVG.createElement('line', {'class': 'legend_x', 'stroke': 'gray', 'stroke-width': 2, 'x1': x[point], 'x2': x[point], 'y1': y_zero - 5, 'y2': y_zero + 5});
                SVG.g.appendChild(element);
            }
        }
    }
};

var old = window.onresize || function () {};
window.onresize = function() {
    old();
    // Redraw the SVG to fit the new size
    if(SVG.g !== false) {
        SVG.g.setAttribute('transform', 'translate(0, ' + SVG.parent_holder.offsetHeight + ') scale(1, -1)');
        if(SVG.x_axis === true) {
            SVG.axis.setAttribute('x2', SVG.parent_holder.offsetWidth - 13 - SVG.marginRight);
        }
        [].forEach.call(SVG.holder.querySelectorAll('.label, .over, .point, .line, .graph, .legend_x'), function(el) {
            el.parentNode.removeChild(el);
        });
        SVG.draw();
    }
};
