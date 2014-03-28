var SVG = {};
SVG.ns = "http://www.w3.org/2000/svg";
SVG.xlinkns = "http://www.w3.org/1999/xlink";

SVG.marginBottom = 10;
SVG.marginTop = 10;
SVG.marginLeft = 10;
SVG.marginRight = 10;

SVG.holder = false;
SVG.g = false;
SVG.axis = false;
SVG.raw_points = [];

/* Initialization :
 * id = id of the parent block
 * height / width = size of the svg
 * grid = small / big / both
 */
SVG.init = function (id, height, width, grid)
{
    var holder = document.getElementById(id);

    var svg = document.createElementNS(SVG.ns, 'svg:svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:xlink', SVG.xlinkns);
    holder.appendChild(svg);

    SVG.holder = holder.querySelector('svg');

    var defs = document.createElementNS(SVG.ns, 'defs');
    SVG.holder.appendChild(defs);

    if(grid === 'small' || grid === 'both') {
        var small_grid_pattern = document.createElementNS(SVG.ns, 'pattern');
        small_grid_pattern.setAttribute('id', 'smallGrid');
        small_grid_pattern.setAttribute('width', 8);
        small_grid_pattern.setAttribute('height', 8);
        small_grid_pattern.setAttribute('patternUnits', 'userSpaceOnUse');

        var small_grid_path = document.createElementNS(SVG.ns, 'path');
        small_grid_path.setAttribute('d', 'M 8 0 L 0 0 0 8');
        small_grid_path.setAttribute('fill', 'none');
        small_grid_path.setAttribute('stroke', 'gray');
        small_grid_path.setAttribute('stroke-width', '0.5');
        small_grid_pattern.appendChild(small_grid_path);

        defs.appendChild(small_grid_pattern);
    }
    if(grid === 'big' || grid === 'both') {
        var grid_pattern = document.createElementNS(SVG.ns, 'pattern');
        grid_pattern.setAttribute('id', 'grid');
        grid_pattern.setAttribute('width', 80);
        grid_pattern.setAttribute('height', 80);
        grid_pattern.setAttribute('patternUnits', 'userSpaceOnUse');

        if(grid === 'both') {
            var grid_rect = document.createElementNS(SVG.ns, 'rect');
            grid_rect.setAttribute('width', 80);
            grid_rect.setAttribute('height', 80);
            grid_rect.setAttribute('fill', 'url(#smallGrid)');
            grid_pattern.appendChild(grid_rect);
        }

        var grid_path = document.createElementNS(SVG.ns, 'path');
        grid_path.setAttribute('d', 'M 80 0 L 0 0 0 80');
        grid_path.setAttribute('fill', 'none');
        grid_path.setAttribute('stroke', 'gray');
        grid_path.setAttribute('stroke-width', '1');
        grid_pattern.appendChild(grid_path);

        defs.appendChild(grid_pattern);
    }


    if(grid !== "none") {
        var grid = document.createElementNS(SVG.ns, 'rect');
        grid.setAttribute('width', "100%");
        grid.setAttribute('height', "100%");
        grid.setAttribute('fill', 'url(#grid)');
        SVG.holder.appendChild(grid);
    }

    var marker = document.createElementNS(SVG.ns, 'marker');
    marker.setAttribute('id', 'markerArrow');
    marker.setAttribute('markerWidth', 13);
    marker.setAttribute('markerHeight', 13);
    marker.setAttribute('refX', 2);
    marker.setAttribute('refY', 6);
    marker.setAttribute('orient', 'auto');
    var marker_path = document.createElementNS(SVG.ns, 'path');
    marker_path.setAttribute('d', 'M2,2 L2,11 L10,6 L2,2');
    marker_path.setAttribute('fill', 'gray');
    marker.appendChild(marker_path);
    defs.appendChild(marker);

    SVG.g = document.createElementNS(SVG.ns, 'g');
    SVG.g.setAttribute('transform', 'translate(0, ' + holder.offsetHeight + ') scale(1, -1)');
    SVG.holder.appendChild(SVG.g);

    SVG.axis = document.createElementNS(SVG.ns, 'line');
    SVG.axis.setAttribute('x1', SVG.marginLeft);
    SVG.axis.setAttribute('x2', holder.offsetWidth - 13 - SVG.marginRight);
    SVG.axis.setAttribute('stroke', 'gray');
    SVG.axis.setAttribute('stroke-width', 3);
    SVG.axis.setAttribute('marker-end', 'url("#markerArrow")');
    SVG.g.appendChild(SVG.axis);
}

SVG.newCoordinates = function(value, min, max, minValue, maxValue) {
    var a = (maxValue - minValue) / (max - min);
    return a * value - a * min + minValue;
}

SVG.scale = function(data) {
    var minX = false, minY = 0;
    var maxX = false, maxY = false;
    var x = 0, y = 0;
    var circle = false, last_point = false, line = false;

    for(point in data) {
        x = data[point][0];
        y = data[point][1];

        if(x < minX || minX === false) {
            minX = x;
        }
        if(x > maxX || maxX === false) {
            maxX = x;
        }
        if(y < minY) {
            minY = y;
        }
        if(y > maxY || maxY === false) {
            maxY = y;
        }
    }

    /* Draw axis */
    SVG.axis.setAttribute('y1', SVG.newCoordinates(0, minY, maxY, SVG.marginBottom, SVG.holder.parentElement.offsetHeight - SVG.marginTop));
    SVG.axis.setAttribute('y2', SVG.newCoordinates(0, minY, maxY, SVG.marginBottom, SVG.holder.parentElement.offsetHeight - SVG.marginTop));

    var returned = new Array();
    returned['minX'] = minX;
    returned['minY'] = minY;
    returned['maxX'] = maxX;
    returned['maxY'] = maxY;
    return returned;
}

SVG.addPoints = function (data) {
    for(point in data) {
        SVG.raw_points.push([data[point][0], data[point][1]]);
    }
}

SVG.draw = function() {
    var points = [];
    var scale = SVG.scale(SVG.raw_points);

    /* Draw points */
    for(point in SVG.raw_points) {
        x = SVG.newCoordinates(SVG.raw_points[point][0], scale.minX, scale.maxX, SVG.marginLeft, SVG.holder.parentElement.offsetWidth - SVG.marginRight);
        y = SVG.newCoordinates(SVG.raw_points[point][1], scale.minY, scale.maxY, SVG.marginBottom, SVG.holder.parentElement.offsetHeight - SVG.marginTop);

        circle = document.createElementNS(SVG.ns, 'circle');
        circle.setAttribute('class', 'point');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', 4);
        circle.setAttribute('fill', '#333');
        circle.setAttribute('stroke', '#3f72bf');
        circle.setAttribute('stroke-width', 2);
        SVG.g.appendChild(circle);

        circle.addEventListener('mouseover', function() { this.setAttribute('r', '6'); })
        circle.addEventListener('mouseout', function() { this.setAttribute('r', '4'); })

        if(points.length > 0) {
            last_point = points[points.length - 1];

            line = document.createElementNS(SVG.ns, 'line');
            line.setAttribute('class', 'line');
            line.setAttribute('x1', last_point[0]);
            line.setAttribute('x2', x);
            line.setAttribute('y1', last_point[1]);
            line.setAttribute('y2', y);
            line.setAttribute('stroke', '#3f72bf');
            line.setAttribute('stroke-width', 2);
            SVG.g.appendChild(line);
        }
        points.push([x, y]);
    }
}

var old = window.onresize || function() {};
window.onresize = function() {
    old();
    if(SVG.g !== false) {
        SVG.g.setAttribute('transform', 'translate(0, ' + SVG.holder.parentElement.offsetHeight + ') scale(1, -1)');
        [].forEach.call(SVG.holder.querySelectorAll('.point, .line'), function(el) {
            el.parentElement.removeChild(el);
        });
        SVG.draw();
    }
}
