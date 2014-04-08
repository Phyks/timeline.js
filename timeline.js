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
SVG.fill = true;
SVG.line = 'line';
SVG.dashed_style = '5, 5';

SVG.parent_holder = false;
SVG.holder = false;
SVG.g = false;
SVG.axis = false;
SVG.graphs = [];
SVG.raw_points = [];
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
    SVG.graphs[graph] = color;
};

// Test wether a graph of name "graph" already exists
SVG.hasGraph = function (graph) {
    if(typeof(SVG.graphs[graph]) === 'undefined') {
        return false;
    }
    else {
        return true;
    }
};

// Clear the specified graph data, or completely clear all the graph data
SVG.clearGraph = function (graph) {
    if(typeof(graph) === 'undefined') {
        SVG.raw_points = [];
        SVG.graphs = [];
    }
    else {
        for(var i = 0; i < SVG.raw_points.length; i++) {
            if(SVG.raw_points[i].graph === graph) {
                SVG.raw_points[i] = undefined;
            }
        }
    }
};

// Add points to the specified graph
SVG.addPoints = function (graph, data) {
    for(var point = 0; point < data.length; point++) {
        var insert = {'graph': graph, 'x': data[point].x, 'y': data[point].y};
        if(typeof(data[point].label) !== 'undefined') {
            insert.label = data[point].label;
        }
        else {
            insert.label = '';
        }
        if(typeof(data[point].click) !== 'undefined') {
            insert.click = data[point].click;
        }
        else {
            insert.click = false;
        }
        SVG.raw_points.push(insert);
    }

    SVG.raw_points.sort(function (a, b) {
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
};

// Compute new coordinates, knowing the min and max value to fit the graph in the container
SVG.newCoordinate = function(value, min, max, minValue, maxValue) {
    var a = (maxValue - minValue) / (max - min);
    return a *(value - min) + minValue;
};

// Compute new X and Y values
SVG.getNewXY = function (minX, maxX, minY, maxY) {
    return function (x, y) {
        return { 
            'x': SVG.newCoordinate(x, minX, maxX, SVG.marginLeft, SVG.parent_holder.offsetWidth - SVG.marginRight),
            'y': SVG.newCoordinate(y, minY, maxY, 2*SVG.marginBottom, SVG.parent_holder.offsetHeight - SVG.marginTop)
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
 * line = none / line / dashed to choose line type
 * rounded = true / false to use splines to smoothen the graph
 * x_callback = function(args) { } or false is called to display the legend on the x axis
 * fill = true / false to fill below the graph or not
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
    SVG.line = arg.line;
    SVG.fill = arg.fill;

    SVG.x_callback = arg.x_callback;
};

// Get the scale so that graph fits with window
SVG.scale = function(data) {
    var empty = true;
    for(graph in data) {
        empty = false;
        break;
    }
    if(empty) {
        return false;
    }

    var minX = false, minY = 0;
    var maxX = false, maxY = false;
    var circle = false, last_point = false, line = false;

    // Look for max and min values for both axis
    for(var point = 0; point < data.length; point++) {
        if(data[point].x < minX || minX === false) {
            minX = data[point].x;
        }
        if(data[point].x > maxX || maxX === false) {
            maxX = data[point].x;
        }
        if(data[point].y < minY) {
            minY = data[point].y;
        }
        if(data[point].y > maxY || maxY === false) {
            maxY = data[point].y;
        }
    }

    // Scale the grid, if needed
    var scale = SVG.getNewXY(minX, maxX, minY, maxY);
    var tmp = scale(Math.pow(10, Math.floor(Math.log(maxX - minX) / Math.log(10))), Math.pow(10, Math.floor(Math.log(maxY - minY) / Math.log(10))));
    var origin = scale(0, 0);
    var coordinates = {'x': tmp.x - origin.x, 'y': tmp.y - origin.y };
    if(SVG.grid === 'big' || SVG.grid === 'both') {
        var grid = SVG.holder.getElementById('grid');
        grid.setAttribute('width', coordinates.x);
        grid.setAttribute('height', coordinates.y);
        var big_coords = scale(Math.floor(minX / Math.pow(10, Math.floor(Math.log(maxX - minX) / Math.log(10)))) * Math.pow(10, Math.floor(Math.log(maxX - minX) / Math.log(10))), Math.floor(minY / Math.pow(10, Math.floor(Math.log(maxY - minY) / Math.log(10)))) * Math.pow(10, Math.floor(Math.log(maxY - minY) / Math.log(10))));
        grid.setAttribute('y', big_coords.y);
        grid.setAttribute('x', big_coords.x);
        grid.querySelector('path').setAttribute('d', 'M '+coordinates.x+' 0 L 0 0 0 '+coordinates.y);

        if(SVG.grid === 'both') {
            grid.querySelector('rect').setAttribute('width', coordinates.x);
            grid.querySelector('rect').setAttribute('height', coordinates.y);
        }
    }
    if(SVG.grid === 'small' || SVG.grid === 'both') {
        coordinates.x = coordinates.x / 10;
        coordinates.y = coordinates.y / 10;
        var grid = SVG.holder.getElementById('smallGrid');
        grid.setAttribute('width', coordinates.x);
        grid.setAttribute('height', coordinates.y);
        if(SVG.grid === 'small') {
            var small_coords = scale(Math.floor(minX / Math.pow(10, Math.floor(Math.log(maxX - minX) / Math.log(10)))) * Math.pow(10, Math.floor(Math.log(maxX - minX) / Math.log(10))), Math.floor(minY / Math.pow(10, Math.floor(Math.log(maxY - minY) / Math.log(10)))) * Math.pow(10, Math.floor(Math.log(maxY - minY) / Math.log(10))));
            grid.setAttribute('y', small_coords.y);
            grid.setAttribute('x', small_coords.x);
        }
        grid.querySelector('path').setAttribute('d', 'M '+coordinates.x+' 0 L 0 0 0 '+coordinates.y);
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
SVG.draw = function() {
    var scale = SVG.scale(SVG.raw_points);
    var points = [], path;
    var px, py;
    var element;

    for(var point = 0; point < SVG.raw_points.length; point++) {
        var tmp = scale(SVG.raw_points[point].x, SVG.raw_points[point].y);
        points.push({'id': point, 'x': tmp.x, 'y': tmp.y, 'graph': SVG.raw_points[point].graph, 'click': SVG.raw_points[point].click, 'label': SVG.raw_points[point].label});
    }

    // Draw each graph
    for(var graph in SVG.graphs) {
        var filtered_points = points.filter(function(el) { return el.graph == graph; });
        path = '';

        // Draw line
        if(SVG.rounded === true) {
            var x = new Array(), y = new Array();
            for(var point = 0; point < filtered_points.length; point++) {
                x.push(filtered_points[point].x);
                y.push(filtered_points[point].y);
            }
            px = SVG.getControlPoints(x);
            py = SVG.getControlPoints(y);
            for(var point = 0; point < filtered_points.length - 1; point++) {
                path += 'C '+px.p1[point]+' '+py.p1[point]+' '+px.p2[point]+' '+py.p2[point]+' '+filtered_points[point+1].x+' '+filtered_points[point+1].y+' ';
            }
        }
        else {
            for(var point = 1; point < filtered_points.length; point++) {
                path += 'L '+filtered_points[point].x+' '+filtered_points[point].y+' ';
            }
        }

        if(SVG.line !== 'none') {
            element = SVG.createElement('path', {'class': 'line', 'stroke': SVG.graphs[graph], 'stroke-width': 2, 'fill': 'none', 'd': 'M '+filtered_points[0].x+' '+filtered_points[0].y+' '+path});
            if(SVG.line === 'dashed') {
                element.setAttribute('style', 'stroke-dasharray: '+SVG.dashed_style);
            }
            SVG.g.appendChild(element);
        }

        // Draw fill
        if(SVG.fill) {
            element = SVG.createElement('path', {'class': 'graph', 'fill': SVG.graphs[graph], 'opacity': '0.25', 'stroke': 'none', 'd': 'M '+filtered_points[0].x+' '+2*SVG.marginBottom+' L '+filtered_points[0].x+' '+filtered_points[0].y+' '+ path + ' L '+filtered_points[filtered_points.length - 1].x+' '+2*SVG.marginBottom+' Z' });
            SVG.g.insertBefore(element, SVG.g.querySelectorAll('.over')[0]);
        }
    }

    // Hover effect
    for(var point = 0; point < points.length; point++) {
        var rect = SVG.createElement('rect', {'class': 'over', 'id': 'over_'+point+'_'+graph, 'y': 0, 'fill': 'white', 'opacity': 0, 'height': '100%'});
        var currents = [point];

        var next = 0;
        if(point < points.length - 1) {
            var i = point + 1;
            next = points[i].x;
            while(next == points[point].x) {
                if(i > points.length) {
                    break;
                }
                currents.push(i);
                i++;
                next = points[i].x;
            }
        }

        var prev = 0;
        if(point > 0) {
            i = point - 1;
            prev = points[i].x;
            while(prev == points[point].x) {
                if(i < 0) {
                    break;
                }
                currents.push(i);
                i--;
                prev = points[i].x;
            }
        }

        if(point == 0) {
            rect.setAttribute('x', 0);
        }
        else {
            rect.setAttribute('x', (points[point].x + prev) / 2);
        }

        if(point == points.length - 1) {
            rect.setAttribute('width', SVG.parent_holder.offsetWidth - (points[point].x + points[point - 1].x)/2);
        }
        else if(point == 0) {
            rect.setAttribute('width', (points[1].x + points[0].x)/2 + SVG.marginLeft);
        }
        else {
            rect.setAttribute('width', (next - prev)/2);
        }

        SVG.g.appendChild(rect);

        rect.addEventListener('mouseover', (function(arg) {
            return function() {
                for(var i = 0; i < arg.length; i++) {
                    SVG.holder.getElementById('point_'+arg[i]).setAttribute('r', '6');
                    SVG.holder.getElementById('label_'+arg[i]).setAttribute('display', 'block');
                }
            };
        })(currents));

        rect.addEventListener('mouseout', function() {
                // Reinitialize all states
                [].forEach.call(SVG.holder.querySelectorAll('.point'), function(el) {
                    el.setAttribute('r', '4');
                });

                [].forEach.call(SVG.holder.querySelectorAll('.label'), function(el) {
                    el.setAttribute('display', 'none');
                });
            });

        /* TODO
        if(SVG.x_callback !== false) {
            element = SVG.createElement('text', {'class': 'legend_x', 'fill': 'gray', 'transform': 'translate(0, ' + SVG.parent_holder.offsetHeight + ') scale(1, -1)'});
            element.appendChild(document.createTextNode(SVG.x_callback(x[point])));
            SVG.g.appendChild(element);
            element.setAttribute('x', x[point] - element.getBoundingClientRect().width / 2 + 2.5);
            var y_zero = scale(0, 0).y
                element.setAttribute('y', SVG.parent_holder.offsetHeight - SVG.marginBottom - y_zero);

            element = SVG.createElement('line', {'class': 'legend_x', 'stroke': 'gray', 'stroke-width': 2, 'x1': x[point], 'x2': x[point], 'y1': y_zero - 5, 'y2': y_zero + 5});
            SVG.g.appendChild(element);
        }*/
    }

    for(var graph in SVG.graphs) {
        var filtered_points = points.filter(function(el) { return el.graph == graph; });

        // Draw points and labels
        for(var point = 0; point < filtered_points.length; point++) {
            element = SVG.createElement('circle', {'class': 'point', 'id': 'point_'+filtered_points[point].id, 'cx': filtered_points[point].x, 'cy': filtered_points[point].y, 'r': 4, 'fill': '#333', 'stroke': SVG.graphs[graph], 'stroke-width': 2});
            SVG.g.insertBefore(element, SVG.g.querySelectorAll('.label')[0]);

            if(filtered_points[point].click !== false) {
                element.onclick = filtered_points[point].click;
            }

            if(filtered_points[point].label !== '') {
                var g = SVG.createElement('g', { 'class': 'label', 'id': 'label_'+filtered_points[point].id, 'transform': 'translate(0, ' + SVG.parent_holder.offsetHeight + ') scale(1, -1)'});
                SVG.g.appendChild(g);

                element = SVG.createElement('text', {});
                var text = filtered_points[point].label.replace('</sup>', '<sup>').split('<sup>');
                for(var i = 0; i < text.length; i++) {
                    text[i] = text[i].replace(/(<([^>]+)>)/ig,"").replace('%y', SVG.raw_points[filtered_points[point].id].y).replace('%x', SVG.raw_points[filtered_points[point].id].x);
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

                var x_text = filtered_points[point].x - element.getBoundingClientRect().width / 2;
                var y_text = SVG.parent_holder.offsetHeight - filtered_points[point].y - 20;
                var element_width = element.getBoundingClientRect().width;
                var element_height = element.getBoundingClientRect().height;

                if(filtered_points[point].x - element.getBoundingClientRect().width / 2 < 0) {
                    x_text = filtered_points[point].x + 20;
                    y_text = SVG.parent_holder.offsetHeight - filtered_points[point].y + 5;
                    path.setAttribute('d', 'M '+(x_text - 5)+' '+(y_text + 5)+' L '+(x_text - 5)+' '+(y_text - element_height/2 + 7.5)+' L '+(x_text - 10)+' '+(y_text - element_height/2 + 5)+' L '+(x_text - 5)+' '+(y_text - element_height/2 + 2.5)+' L '+(x_text - 5)+' '+(y_text - element_height + 5)+' L '+(x_text + element_width + 5)+' '+(y_text - element_height + 5)+' L '+(x_text + element_width + 5)+' '+(y_text + 5)+' Z');
                }
                else if(filtered_points[point].y + element.getBoundingClientRect().height + 12 > SVG.parent_holder.offsetHeight) {
                    x_text = filtered_points[point].x + 20;
                    y_text = SVG.parent_holder.offsetHeight - filtered_points[point].y + 5;
                    path.setAttribute('d', 'M '+(x_text - 5)+' '+(y_text + 5)+' L '+(x_text - 5)+' '+(y_text - element_height/2 + 7.5)+' L '+(x_text - 10)+' '+(y_text - element_height/2 + 5)+' L '+(x_text - 5)+' '+(y_text - element_height/2 + 2.5)+' L '+(x_text - 5)+' '+(y_text - element_height + 5)+' L '+(x_text + element_width + 5)+' '+(y_text - element_height + 5)+' L '+(x_text + element_width + 5)+' '+(y_text + 5)+' Z');

                    if(x_text + element_width > SVG.parent_holder.offsetWidth) {
                        x_text = filtered_points[point].y - element_width - 20;
                        y_text = SVG.parent_holder.offsetHeight - filtered_points[point].y + 5;
                        path.setAttribute('d', 'M '+(x_text - 5)+' '+(y_text + 5)+' L '+(x_text - 5)+' '+(y_text  - element_height + 5)+' L '+(x_text + element_width + 5)+' '+(y_text - element_height + 5)+' L '+(x_text + element_width + 5)+' '+(y_text - element_height/2 + 2.5)+' L '+(x_text + element_width + 10)+' '+(y_text - element_height/2 + 5)+' L '+(x_text + element_width + 5)+' '+(y_text - element_height/2 + 7.5)+' L '+(x_text + element_width + 5)+' '+(y_text + 5)+' Z');
                    }
                }
                else if(filtered_points[point].x + element_width / 2 + 12 > SVG.parent_holder.offsetWidth) {
                    x_text = filtered_points[point].x - element_width - 20;
                    y_text = SVG.parent_holder.offsetHeight - filtered_points[point].y + 5;
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
