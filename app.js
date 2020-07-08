var app;

(function(root){
	
	// Function to find if point is inside polygon from https://github.com/substack/point-in-polygon
	// ray-casting algorithm based on
	// http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
	function inside(point, vs) {

		var x = point[0], y = point[1];

		var inside = false;
		for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
			var xi = vs[i][0], yi = vs[i][1];
			var xj = vs[j][0], yj = vs[j][1];

			var intersect = ((yi > y) != (yj > y))
				&& (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
			if (intersect) inside = !inside;
		}

		return inside;
	};




	function ajax(url,attrs){

		if(typeof url!=="string") return false;
		if(!attrs) attrs = {};
		var cb = "",qs = "";
		var oReq,urlbits;
		// If part of the URL is query string we split that first
		if(url.indexOf("?") > 0){
			urlbits = url.split("?");
			if(urlbits.length){
				url = urlbits[0];
				qs = urlbits[1];
			}
		}
		if(attrs.dataType=="jsonp"){
			cb = 'fn_'+(new Date()).getTime();
			window[cb] = function(rsp){
				if(typeof attrs.success==="function") attrs.success.call((attrs['this'] ? attrs['this'] : this), rsp, attrs);
			};
		}
		if(typeof attrs.cache==="boolean" && !attrs.cache) qs += (qs ? '&':'')+(new Date()).valueOf();
		if(cb) qs += (qs ? '&':'')+'callback='+cb;
		if(attrs.data) qs += (qs ? '&':'')+attrs.data;

		// Build the URL to query
		if(attrs.method=="POST") attrs.url = url;
		else attrs.url = url+(qs ? '?'+qs:'');

		if(attrs.dataType=="jsonp"){
			var script = document.createElement('script');
			script.src = attrs.url;
			document.body.appendChild(script);
			return this;
		}

		// code for IE7+/Firefox/Chrome/Opera/Safari or for IE6/IE5
		oReq = (window.XMLHttpRequest) ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
		oReq.addEventListener("load", window[cb] || complete);
		oReq.addEventListener("error", error);
		oReq.addEventListener("progress", progress);
		var responseTypeAware = 'responseType' in oReq;
		if(attrs.beforeSend) oReq = attrs.beforeSend.call((attrs['this'] ? attrs['this'] : this), oReq, attrs);
		if(attrs.dataType=="script") oReq.overrideMimeType('text/javascript');

		function complete(evt) {
			attrs.header = oReq.getAllResponseHeaders();
			var rsp;
			if(oReq.status == 200 || oReq.status == 201 || oReq.status == 202) {
				rsp = oReq.response;
				if(oReq.responseType=="" || oReq.responseType=="text") rsp = oReq.responseText;
				if(attrs.dataType=="json"){
					try {
						if(typeof rsp==="string") rsp = JSON.parse(rsp.replace(/[\n\r]/g,"\\n").replace(/^([^\(]+)\((.*)\)([^\)]*)$/,function(e,a,b,c){ return (a==cb) ? b:''; }).replace(/\\n/g,"\n"));
					} catch(e){ error(e); }
				}

				// Parse out content in the appropriate callback
				if(attrs.dataType=="script"){
					var fileref=document.createElement('script');
					fileref.setAttribute("type","text/javascript");
					fileref.innerHTML = rsp;
					document.head.appendChild(fileref);
				}
				attrs.statusText = 'success';
				if(typeof attrs.success==="function") attrs.success.call((attrs['this'] ? attrs['this'] : this), rsp, attrs);
			}else{
				attrs.statusText = 'error';
				error(evt);
			}
			if(typeof attrs.complete==="function") attrs.complete.call((attrs['this'] ? attrs['this'] : this), rsp, attrs);
		}

		function error(evt){
			if(typeof attrs.error==="function") attrs.error.call((attrs['this'] ? attrs['this'] : this),evt,attrs);
		}

		function progress(evt){
			if(typeof attrs.progress==="function") attrs.progress.call((attrs['this'] ? attrs['this'] : this),evt,attrs);
		}

		if(responseTypeAware && attrs.dataType){
			try { oReq.responseType = attrs.dataType; }
			catch(err){ error(err); }
		}

		try{ oReq.open((attrs.method||'GET'), attrs.url, true); }
		catch(err){ error(err); }

		if(attrs.method=="POST") oReq.setRequestHeader('Content-type','application/x-www-form-urlencoded');

		try{ oReq.send((attrs.method=="POST" ? qs : null)); }
		catch(err){ error(err); }

		return this;
	}


	var baseMaps = {};

	// Default maps
	baseMaps['Greyscale'] = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
		attribution: 'Tiles: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
		subdomains: 'abcd',
		maxZoom: 19
	});
	baseMaps['Open Street Map'] = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	});
	baseMaps['CartoDB Voyager (no labels)'] = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
		subdomains: 'abcd',
		maxZoom: 19
	});
	baseMaps['CartoDB Voyager'] = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
		subdomains: 'abcd',
		maxZoom: 19
	});


	var icons = {
		'hide':'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><title>hide layer</title><path style="fill:%COLOR%;" d="M16 6c-6.979 0-13.028 4.064-16 10 2.972 5.936 9.021 10 16 10s13.027-4.064 16-10c-2.972-5.936-9.021-10-16-10zM23.889 11.303c1.88 1.199 3.473 2.805 4.67 4.697-1.197 1.891-2.79 3.498-4.67 4.697-2.362 1.507-5.090 2.303-7.889 2.303s-5.527-0.796-7.889-2.303c-1.88-1.199-3.473-2.805-4.67-4.697 1.197-1.891 2.79-3.498 4.67-4.697 0.122-0.078 0.246-0.154 0.371-0.228-0.311 0.854-0.482 1.776-0.482 2.737 0 4.418 3.582 8 8 8s8-3.582 8-8c0-0.962-0.17-1.883-0.482-2.737 0.124 0.074 0.248 0.15 0.371 0.228v0zM16 13c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z"></path></svg>',
		'show':'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><title>show layer</title><path style="fill:%COLOR%;" d="M29.561 0.439c-0.586-0.586-1.535-0.586-2.121 0l-6.318 6.318c-1.623-0.492-3.342-0.757-5.122-0.757-6.979 0-13.028 4.064-16 10 1.285 2.566 3.145 4.782 5.407 6.472l-4.968 4.968c-0.586 0.586-0.586 1.535 0 2.121 0.293 0.293 0.677 0.439 1.061 0.439s0.768-0.146 1.061-0.439l27-27c0.586-0.586 0.586-1.536 0-2.121zM13 10c1.32 0 2.44 0.853 2.841 2.037l-3.804 3.804c-1.184-0.401-2.037-1.521-2.037-2.841 0-1.657 1.343-3 3-3zM3.441 16c1.197-1.891 2.79-3.498 4.67-4.697 0.122-0.078 0.246-0.154 0.371-0.228-0.311 0.854-0.482 1.776-0.482 2.737 0 1.715 0.54 3.304 1.459 4.607l-1.904 1.904c-1.639-1.151-3.038-2.621-4.114-4.323z"></path><path style="fill:%COLOR%;" d="M24 13.813c0-0.849-0.133-1.667-0.378-2.434l-10.056 10.056c0.768 0.245 1.586 0.378 2.435 0.378 4.418 0 8-3.582 8-8z"></path><path style="fill:%COLOR%;" d="M25.938 9.062l-2.168 2.168c0.040 0.025 0.079 0.049 0.118 0.074 1.88 1.199 3.473 2.805 4.67 4.697-1.197 1.891-2.79 3.498-4.67 4.697-2.362 1.507-5.090 2.303-7.889 2.303-1.208 0-2.403-0.149-3.561-0.439l-2.403 2.403c1.866 0.671 3.873 1.036 5.964 1.036 6.978 0 13.027-4.064 16-10-1.407-2.81-3.504-5.2-6.062-6.938z"></path></svg>',
		'remove':'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><title>remove layer</title><path style="fill:%COLOR%;" d="M31.708 25.708c-0-0-0-0-0-0l-9.708-9.708 9.708-9.708c0-0 0-0 0-0 0.105-0.105 0.18-0.227 0.229-0.357 0.133-0.356 0.057-0.771-0.229-1.057l-4.586-4.586c-0.286-0.286-0.702-0.361-1.057-0.229-0.13 0.048-0.252 0.124-0.357 0.228 0 0-0 0-0 0l-9.708 9.708-9.708-9.708c-0-0-0-0-0-0-0.105-0.104-0.227-0.18-0.357-0.228-0.356-0.133-0.771-0.057-1.057 0.229l-4.586 4.586c-0.286 0.286-0.361 0.702-0.229 1.057 0.049 0.13 0.124 0.252 0.229 0.357 0 0 0 0 0 0l9.708 9.708-9.708 9.708c-0 0-0 0-0 0-0.104 0.105-0.18 0.227-0.229 0.357-0.133 0.355-0.057 0.771 0.229 1.057l4.586 4.586c0.286 0.286 0.702 0.361 1.057 0.229 0.13-0.049 0.252-0.124 0.357-0.229 0-0 0-0 0-0l9.708-9.708 9.708 9.708c0 0 0 0 0 0 0.105 0.105 0.227 0.18 0.357 0.229 0.356 0.133 0.771 0.057 1.057-0.229l4.586-4.586c0.286-0.286 0.362-0.702 0.229-1.057-0.049-0.13-0.124-0.252-0.229-0.357z"></path></svg>',
		'edit':'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><title>edit layer</title><path style="fill:%COLOR%;" d="M27 0c2.761 0 5 2.239 5 5 0 1.126-0.372 2.164-1 3l-2 2-7-7 2-2c0.836-0.628 1.874-1 3-1zM2 23l-2 9 9-2 18.5-18.5-7-7-18.5 18.5zM22.362 11.362l-14 14-1.724-1.724 14-14 1.724 1.724z"></path></svg>',
		'add':'<svg version="1.1" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="32" height="32" viewBox="0 0 32 32" sodipodi:docname="add.svg"><defs id="defs10" /><sodipodi:namedview pagecolor="#ffffff" bordercolor="#666666" borderopacity="1" objecttolerance="10" gridtolerance="10" guidetolerance="10" inkscape:pageopacity="0" inkscape:pageshadow="2" inkscape:window-width="1160" inkscape:window-height="719" id="namedview8" showgrid="false" inkscape:zoom="7.375" inkscape:cx="16" inkscape:cy="16" inkscape:window-x="0" inkscape:window-y="0" inkscape:window-maximized="0" inkscape:current-layer="svg2" /><title id="title4">add layer</title><path style="fill:#000000" d="m 20.243,30.989 0,0 0,-10.746 10.746,0 0,0 c 0.148,0 0.288,-0.03 0.414,-0.09 0.346,-0.158 0.586,-0.505 0.586,-0.909 l 0,-6.486 c 0,-0.404 -0.241,-0.751 -0.586,-0.909 -0.126,-0.06 -0.266,-0.09 -0.413,-0.09 l 0,0 -10.747,0 0,-10.78035 0,0 c 0,-0.1478 -0.03,-0.2878 -0.09,-0.4137 -0.158,-0.3458 -0.505,-0.5855 -0.909,-0.5855 l -6.486,0 c -0.404,0 -0.751,0.2411 -0.909,0.5855 -0.06,0.1266 -0.09,0.2659 -0.09,0.4144 l 0,0 0,10.77965 -10.7457,0 0,0 c -0.14785,10e-4 -0.28785,0.03 -0.41445,0.09 -0.3451,0.157 -0.5855,0.505 -0.5855,0.909 l 0,6.486 c 0,0.404 0.2411,0.751 0.5855,0.909 0.1266,0.06 0.2659,0.09 0.41445,0.09 l 0,0 10.7457,0 0,10.746 0,0 c 0,0.148 0.03,0.288 0.09,0.414 0.158,0.346 0.505,0.586 0.909,0.586 l 6.486,0 c 0.404,0 0.752,-0.241 0.909,-0.586 0.06,-0.126 0.09,-0.266 0.09,-0.414 z" id="path6" inkscape:connector-curvature="0" sodipodi:nodetypes="ccccccsscccccccsscccccccsscccccccsscc" /></svg>',
		'info':'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path style="fill:%COLOR%" d="M 16 0 A 16 16 0 0 0 0 16 A 16 16 0 0 0 16 32 A 16 16 0 0 0 32 16 A 16 16 0 0 0 16 0 z M 17.087891 5.4433594 C 17.405707 5.4433594 17.696853 5.483046 17.955078 5.5625 C 18.223235 5.641954 18.451922 5.7610139 18.640625 5.9199219 C 18.829328 6.0788298 18.970994 6.2715698 19.070312 6.5 C 19.179566 6.7284301 19.236328 6.9911102 19.236328 7.2890625 C 19.236328 7.6068785 19.179565 7.8960715 19.070312 8.1542969 C 18.961062 8.4025907 18.813703 8.6161505 18.625 8.7949219 C 18.436297 8.9637616 18.20761 9.0979486 17.939453 9.1972656 C 17.681227 9.2866511 17.395775 9.3300781 17.087891 9.3300781 C 16.809803 9.3300781 16.549076 9.2866516 16.300781 9.1972656 C 16.052488 9.1078798 15.833234 8.9831268 15.644531 8.8242188 C 15.455828 8.6553791 15.300822 8.4569458 15.181641 8.2285156 C 15.072389 7.9901537 15.019531 7.7217806 15.019531 7.4238281 C 15.019531 7.1060122 15.072387 6.8282057 15.181641 6.5898438 C 15.300822 6.3415501 15.455828 6.1336835 15.644531 5.9648438 C 15.833234 5.7960041 16.052488 5.6655579 16.300781 5.5761719 C 16.549076 5.4867855 16.809803 5.4433594 17.087891 5.4433594 z M 18.609375 9.9902344 L 16.402344 20.076172 C 16.392444 20.135762 16.367855 20.24913 16.328125 20.417969 C 16.298334 20.576877 16.258644 20.765876 16.208984 20.984375 C 16.169259 21.202874 16.123879 21.437253 16.074219 21.685547 C 16.024563 21.933841 15.979183 22.166268 15.939453 22.384766 C 15.899727 22.603265 15.865728 22.797958 15.835938 22.966797 C 15.806148 23.135637 15.791016 23.249004 15.791016 23.308594 C 15.791016 23.447639 15.815574 23.59695 15.865234 23.755859 C 15.914894 23.904834 15.994268 24.039022 16.103516 24.158203 C 16.222697 24.277385 16.377703 24.377581 16.566406 24.457031 C 16.765041 24.536491 17.012595 24.576172 17.310547 24.576172 C 17.399937 24.576172 17.515253 24.564812 17.654297 24.544922 C 17.793342 24.525052 17.940701 24.496761 18.099609 24.457031 C 18.258517 24.417305 18.428651 24.371926 18.607422 24.322266 C 18.786193 24.272606 18.960066 24.212098 19.128906 24.142578 L 19.619141 24.142578 L 19.619141 25.439453 C 19.241735 25.657953 18.844867 25.841259 18.427734 25.990234 C 18.020532 26.129279 17.617973 26.238909 17.220703 26.318359 C 16.833364 26.407753 16.466753 26.466294 16.119141 26.496094 C 15.77153 26.535824 15.469162 26.556641 15.210938 26.556641 C 14.764009 26.556641 14.380315 26.482959 14.0625 26.333984 C 13.744684 26.185009 13.482005 25.999749 13.273438 25.78125 C 13.074803 25.552821 12.925492 25.31096 12.826172 25.052734 C 12.726854 24.784577 12.677734 24.535071 12.677734 24.306641 C 12.677734 24.028553 12.71173 23.705366 12.78125 23.337891 C 12.86071 22.970416 12.945766 22.564115 13.035156 22.117188 L 14.912109 13.580078 C 14.961773 13.37151 14.942906 13.209025 14.853516 13.089844 C 14.764126 12.970663 14.631896 12.870466 14.453125 12.791016 L 12.380859 11.867188 L 12.380859 10.839844 L 18.609375 9.9902344 z " /></svg>',
		'fit':'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path style="fill:%COLOR%" d="M 0,12 L0,0 12,0 12,4 6,4 12,10 10,12 4,6 4,12 M20,0 L 32,0 32,12 28,12 28,6 22,12 20,10 26,4 20,4 20,0 M 20,32 L20,28 26,28 20,22 22,20 28,26 28,20 32,20, 32,32 20,32 M 12,32 L 0,32 0,20 4,20 4,26 10,20 12,22 6,28 12,28 12,32" /></svg>',
		'zoomin':'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path style="fill:%COLOR%" d="M 11 11 l 0,-5 2,0 0,5 5,0 0,2 -5,0 0,5 -2,0 0,-5 -5,0 0,-2 5,0 M 12,12 m -0.5,-12 a 12, 12, 0, 1, 0, 1, 0 Z m 1 2 a 10, 10, 0, 1, 1, -1, 0 Z M 20.5 20.5 l 1.5,-1.5 8,8 -3,3 -8,-8Z" /></svg>',
		'zoomout':'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path style="fill:%COLOR%" d="M 12 12 m 0,-1 l 6,0 0,2 -12,0 0,-2Z M 12,12 m -0.5,-12 a 12, 12, 0, 1, 0, 1, 0 Z m 1 2 a 10, 10, 0, 1, 1, -1, 0 Z M 20.5 20.5 l 1.5,-1.5 8,8 -3,3 -8,-8Z" /></svg>',
		'geo':'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path style="fill:%COLOR%" d="M 16,0 L30,30 0,16 12,12 Z" /></svg>',
		'marker':'<svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" width="7.0556mm" height="11.571mm" viewBox="0 0 25 41.001" id="svg2" version="1.1"><g id="layer1" transform="translate(1195.4,216.71)"><path style="fill:%COLOR%;fill-opacity:1;fill-rule:evenodd;stroke:#ffffff;stroke-width:0.1;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;stroke-miterlimit:4;stroke-dasharray:none" d="M 12.5 0.5 A 12 12 0 0 0 0.5 12.5 A 12 12 0 0 0 1.8047 17.939 L 1.8008 17.939 L 12.5 40.998 L 23.199 17.939 L 23.182 17.939 A 12 12 0 0 0 24.5 12.5 A 12 12 0 0 0 12.5 0.5 z " transform="matrix(1,0,0,1,-1195.4,-216.71)" id="path4147" /><ellipse style="opacity:1;fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:1.428;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" id="path4173" cx="-1182.9" cy="-204.47" rx="5.3848" ry="5.0002" /></g></svg>'
	}

	function getIcon(icon,colour){
		if(icons[icon]) return icons[icon].replace(/%COLOR%/g,(colour||"black"));
		else return icon.replace(/%COLOR%/g,(colour||"black"));
	}

	function makeMarker(icon,colour){
		return L.divIcon({
			'className': '',
			'html':	getIcon(icon,colour),
			'iconSize':	 [32, 42],
			'popupAnchor': [0, -41]
		});
	}
	
	var lat = 53.79659;
	var lon = -1.53385;
	var d = 0.0005;
	var bbox = [[lat-d, lon-d],[lat+d, lon+d]];

	var map = L.map('map',{'layers':[baseMaps['Greyscale']],'scrollWheelZoom':true,'editable': true,'zoomControl': false}).fitBounds(bbox);



	// Convert metres to pixels (used by GeoLocation)
	function m2px(m,lat,zoom){
		if(!lat) lat = map.getCenter().lat;
		if(!zoom) zoom = map.getZoom();
		var mperpx = 40075016.686 * Math.abs(Math.cos(lat * 180/Math.PI)) / Math.pow(2, zoom+8);
		return m/mperpx;
	}
	
	function log(){
		console.log(arguments);
		var str = "";
		var el = document.getElementById('log');
		var typ = (typeof arguments[0]==="string" && (arguments[0]=="log" || arguments[0]=="warning" || arguments[0]=="error" || arguments[0]=="info")) ? arguments[0] : "log";
		var d = (new Date()).toISOString().replace(/^.*T([0-9]{2}:[0-9]{2}:[0-9]{2}).*$/,function(m,p1){ return p1; });
		for(var i = 1; i < arguments.length; i++){
			console[typ](i,arguments[i]);
			if(typeof arguments[i]==="string") str += (str ? "<br />":"")+d+': '+arguments[i];
		}
		el.innerHTML = str+'<br />'+el.innerHTML;
		return this;
	}
	// Define a function to get user location
	function GeoLocation(options){
		if(!options) options = {};

		this.locating = false;

		var _obj = this;

		this.setLocation = function(p){

			if(!p){
				log('warning','No location provided');
				return this;
			}
			log('info','setLocation');
			var btns = document.getElementsByClassName('leaflet-control-geolocate');

			console.log('setLocation',p);

			if(!this.locating){
				this.p = null;
				navigator.geolocation.clearWatch(this.watchID);
	//			btn.removeClass('live-location');
				this.marker.remove();
				this.marker = null;
				clearTimeout(this.check);
				return;
			}

			lat = p.coords.latitude;
			lon = p.coords.longitude;
			this.p = p;
			var a = Math.round(2*m2px(p.coords.accuracy,lat));
			var marker;

	//		btn.addClass('live-location');
			if(!this.marker){
				var s = 10;
				var ico = L.divIcon({ html: '<div class="my-location-accuracy" style="width:'+a+'px;height:'+a+'px"></div>', 'className':'my-location', 'iconSize': L.point(s, s) });
				this.marker = L.marker([lat, lon],{icon:ico});
				this.marker.addTo(map);
				var _obj = this;
			}else{
				this.marker.setLatLng([lat, lon]).update();
				acc = document.getElementsByClassName('my-location-accuracy')[0];
				acc.style.setProperty('width',a+'px');
				acc.style.setProperty('height',a+'px');
			}


			if(!this.centred){
				// We want to centre the view and update the nodes
				map.panTo(new L.LatLng(lat, lon))
				this.centred = true;
			}

		}

		if("geolocation" in navigator){

			// We need a function that checks how live the position is
			// that runs independently of the geolocation api
			this.updateLive = function(){
				console.log('GeoLocation check',this.p);
				if(this.p){
					var ago = ((new Date())-this.p.timestamp)/1000;
					if(ago > 10) S('.leaflet-control-geolocate').removeClass('live-location');
				}
			}

			var _obj = this;

			this.control = L.Control.extend({
				"options": { position: 'topleft' },
				"onAdd": function (map){

					console.log('control onAdd',map)

					var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-geolocate');
					container.innerHTML = '<a href="#">'+getIcon('geo','black')+'</a>';
					container.onclick = function(e){

						e.preventDefault();
						_obj.centred = false;
						_obj.locating = !_obj.locating;

						if(_obj.locating){
							//if(options.mapper.callbacks && options.mapper.callbacks.geostart) options.mapper.callbacks.geostart.call(this);

							// Start watching the user location
							_obj.watchID = navigator.geolocation.watchPosition(function(position){
								_obj.setLocation(position);
							},function(){
								console.error("Sorry, no position available.");
							},{
								enableHighAccuracy: true, 
								maximumAge        : 30000, 
								timeout           : 27000
							});

							// Create a checker to see if the geolocation is live
							_obj.check = setInterval(function(){ _obj.updateLive(); },10000);

						}else{

							_obj.setLocation();

						}
					}
					return container;
				}
			});

			map.addControl(new _obj.control());

		}else{

			console.warn('No location services available');

		}

		return this;
	}

	// Add geolocation control and interaction
	var geolocation = new GeoLocation({});


	var signals;
	
	ajax("signals.geojson",{
		"dataType":"json",
		"success":function(d){
			console.log('success',d);
			var colour = "black";
			
			var customicon = makeMarker("marker",colour);
			console.log(customicon);
			var _obj = this;

			var geoattrs = {
				'style': { "color": colour, "weight": 2, "opacity": 0.65 },
				'pointToLayer': function(geoJsonPoint, latlng){ return L.marker(latlng,{icon: customicon}); },
				'onEachFeature': function(feature, layer){
					//var popup = popuptext(feature,{'id':id,'this':_obj});
					//if(popup) layer.bindPopup(popup);
				}
			};
			
			
			signals = L.geoJSON(d,geoattrs);
			signals.addTo(map);
		}
	});

	app = {'map':map};
})(window || this);