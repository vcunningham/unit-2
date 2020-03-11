/* notes from Tim's office hours 03/09:
*  The colors could be: green back, light gray panel, red font/red drop shadow, red color marker
*
*  Make a new layer to do recoloring of the individual marker(?) assuming that I can grab the marker from the popup
*
* revised notes 03/11:
* 	making the marker change color to show what country is selected is not an easy task, so for submission the text in the panel will have to be enough.
*   If I completely reworked how I assign the svgs so I could jquery modify the svg I might be able to make it work somewhat quickly, but otherwise
*   it is a large endeavour and either way the gain is minimal for this version of the product
*
*/

// various globals that are useful:
// the map itself
var map;
// min and max for symbol and legend gen
var minValue;
var maxValue;
// this for populating the info panel
var prevId;
// used for legend gen
var count = 0;
var total = 0;

// create the map with the desired view and zoom
function createMap(){
	// restrict the panning area and set zoom to only be a few levels
	bounds = L.latLngBounds(L.latLng(13,-18.5),L.latLng(55,55));
	map = L.map('mapid',{maxBounds: bounds,maxBoundsViscosity: 1.0}).setView([36,20], 4)
	// load the tileset I found
	L.tileLayer('https://{s}.tile.thunderforest.com/neighbourhood/{z}/{x}/{y}.png?apikey={apikey}', {
		attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a> contributors, <a href="img/sources.txt">Images</a>',
		apikey: '5905384e78ab4358b59022a245531c74',
		maxZoom: 8,
		minZoom: 4
	}).addTo(map);
	
	// load the data
	getMap();

	// when a popup gets opened instead close it and populate the info panel
	map.on('popupopen', function(e){
		//console.log(typeof(e.popup._source._myId));
		// if it's not the first time then also hide the previous content
		if(prevId){
			document.getElementById("supp-text-"+prevId).style.display = "none";
		}
		id = e.popup._source._myId;
		content = e.popup._source._myContent;
		year = e.popup._source._myYear;
		
		map.closePopup();
		
		//console.log("supp-text-"+id);
		info = document.getElementById(id + "-stat");
		info.innerHTML = "<b>" + id + " in " + year + ":</b> " + content + " species";
		document.getElementById("supp-text-"+id).style.display = "block";
		
		prevId = id;
	});
}

// load the geojson I made from my data into the map
function getMap(){
	$.getJSON("data/map_data.geojson", function(response){
			minValue = calcMinVal(response);
            // create a Leaflet GeoJSON layer and add it to the map
			// createSeq(response);
			createSeqControl(response);
			createLegend();
        });
}

// just formatting data and then leads to making the symbols
function processData(data){
    // empty array to hold attributes
    var attributes = [];

    // properties of the first feature in the dataset
    var properties = data.features[0].properties;

    // push each attribute name into attributes array
    for (var attribute in properties){
        // only take attributes with population values
        if (attribute.indexOf("yr") > -1){
            attributes.push(attribute);
        };
    };
    createPropSymbs(data,attributes);
	return attributes;
};


// just a loop through the data to make the layer
function createPropSymbs(response,attrs){
	L.geoJson(response, {
		pointToLayer : function (feature, latlng) {
			return pointToLayer(feature, latlng, attrs);
		}
	}).addTo(map);
}

// this is the intitial marker creation
function pointToLayer(feature, latlng, attrs){
	var attr = attrs[0];
	// $('#legend').text(attr.slice(2));
	
	// create marker options
    var geojsonMarkerOptions = {
		radius: 8,
		fillColor: "#009933",
		color: "#000",
		weight: 1,
		opacity: 1,
		fillOpacity: 0.8
    };
          
	var attValue = Number(feature.properties[attr]);

	geojsonMarkerOptions.radius = calcRadius(attValue);

	// create circle markers
	var layer = L.circleMarker(latlng, geojsonMarkerOptions);
			
	// I left this the same(other than adding the hardcoded string that used to be separate),
	// see above method for explanation
	
	// build popup content string
	var popupContent = "<p><b>Country:</b> " + feature.properties.Country + "</p><p><b>" + "Threatened Species " + attr.slice(2) + ":</b> " + feature.properties[attr] + "</p>";
	// bind an ID and stuff to the marker so I can populate content later
	layer._myId = feature.properties.Country;
	layer._myContent = feature.properties[attr];
	layer._myYear = attr.slice(2);
	// bind the popup to the circle marker
	layer.bindPopup(popupContent, {
		offset: new L.Point(0,-geojsonMarkerOptions.radius)
	});
			
	return layer;
}

// I left this the same, didn't think a helper function was needed because the efficiency increase is not worth my time
// (it's very small for something like generating a string)
function updatePropSymbols(attribute){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            // access feature properties
            var props = layer.feature.properties;

            // update each feature's radius based on new attribute values
            var radius = calcRadius(props[attribute]);
            layer.setRadius(radius);

            // add city to popup content string
            var popupContent = "<p><b>Country:</b> " + props.Country + "</p>";

            // add formatted attribute to panel content string
            var year = attribute.slice(2);
            popupContent += "<p><b>Threatened Species " + year + ":</b> " + props[attribute] + "</p>";

            // update popup content
            popup = layer.getPopup();
            popup.setContent(popupContent).update();
			layer._myContent = props[attribute];
			layer._myYear = year;
			
			info = document.getElementById(props.Country + "-stat");
			info.innerHTML =  "<b>" + props.Country + " in " + year + ":</b> " + props[attribute]  + " species";
			
			$('#legend').html("<b>Threatened Species in: </b>" + year);
        };
    });
}


// make the legend
function createLegend(attributes){
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function () {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');

			$(container).append('<p id="legend"><b>Threatened Species in:</b> 2004</p>');
			L.DomEvent.disableClickPropagation(container);
			
			var svg = '<svg id="attribute-legend" width="200px" height="90px">';

			//array of circle names to base loop on
			var circles = ["max", "mean", "min"];
			var radii = [maxValue, (total/count), minValue];

			//Step 2: loop to add each circle and text to svg string
			for (var i=0; i<circles.length; i++){
			    var radius = calcRadius(radii[i]);
                var cy = 75 - radius;
				//circle string
				svg += '<circle class="legend-circle" id="' + circles[i] + 
				'" fill="#009933" fill-opacity="0.8" stroke="#000000" cx="40"' + "r=" + radius + " cy=" + cy + "/>";
				
				var tY = i*20 + 19;
				
				svg += '<text id="' + circles[i] + '-text" x="90" y="' + tY + '">' + (Math.round(radii[i])*100)/100 + " species" + '</text>';
			};

			//close svg string
			svg += "</svg>";

			//add attribute legend svg to container
			$(container).append(svg);

            return container;
        }
    });

    map.addControl(new LegendControl());
	
};

// replaced the old seq create with this in-map one
function createSeqControl(data){
	// make the object
	var SequenceControl = L.Control.extend({
		options: {
			position: 'bottomleft'
		},
		
		onAdd: function(){
			var container = L.DomUtil.create('div', 'sequence-control-container');
			
			$(container).append('<input class="range-slider" type="range">');
			
			//I know we were supposed to use actual images here but I am attached to my button appearance
			$(container).append('<button class="step" id="reverse"><-</button>');
			$(container).append('<button class="step" id="forward">+></button>');
			
			L.DomEvent.disableClickPropagation(container);
			
			return container;
		}
	});
	
	// push to map
	map.addControl(new SequenceControl());
	
	
	// copied and refactored from the old method
	var attributes = processData(data);
				
	// set slider attributes
	$('.range-slider').attr({
		min: 0,
		max: 15,
		value: 0,
		step: 1
	});
	
	$('.range-slider').on('input', function(){
        var index = $(this).val();
		if(index >0 && index<6){
			index = 1;
			$('.range-slider').val(6);
		}
		else if(index == 6){
			index = 1;
		}
		else if(index >6 && index<11){
			index = 2;
			$('.range-slider').val(11);
		}
		else{
			index = checkIndices(index);
		}
		console.log(attributes);
		console.log(index);
		updatePropSymbols(attributes[index]);
    });
	
	$('.step').click(function(){
        // get the old index value
        var index = $('.range-slider').val();

        if ($(this).attr('id') == 'forward'){
			if(index == 0){
				index = 6;
			} else if(index == 6){
				index = 11;
			}
			else{
				index++;
				index = index > 15 ? 0 : index;
			}
        } else if ($(this).attr('id') == 'reverse'){
			if(index == 11){
				index = 6;
			} else if(index == 6){
				index = 0;
			} else{
				index--;
				index = index < 0 ? 15 : index;
			}
        };
        $('.range-slider').val(index);
		
		index = checkIndices(index);
		
		updatePropSymbols(attributes[index]);
    });
}

// used for flannery
function calcMinVal(data){
	// create empty array to store all data values
     var allValues = [];
     
     // loop through each country
     for(var country of data.features){
          // loop through each year
		  allValues.push(country.properties["yr2004"]);
		  count++;
		  total+=country.properties["yr2004"];
		  allValues.push(country.properties["yr2010"]);
		  count++;
		  total+=country.properties["yr2010"];
          for(var year = 2015; year <= 2019; year+=1){
               // get value for current year
               var value = country.properties["yr"+ String(year)];
               // push value to array
               allValues.push(value);
			   count++;
			   total += value;
           }
     }
     
     // get minimum value of our array
     minValue = Math.min(...allValues);
	 maxValue = Math.max(...allValues);
	 
	 //console.log(maxValue);
	 
	 //console.log("Max: " + maxValue + " Min: " + minValue + " Total and Count: " + total + "/" + count + " Avg: " + (total/count));

     return minValue;
}

// used for symbol gen
function calcRadius(val){
	// constant factor adjusts symbol sizes evenly
     var minRadius = 5;
     
     // Flannery Appearance Compensation formula
     var radius = 1.0083 * Math.pow(val/minValue,0.5715) * minRadius;
	 
	 //console.log(radius + " " + val);

     return radius;
}

// made these a helper function for efficiency
function checkIndices(index){
	if(index == 6){
		index = 1;
	}
	else if(index == 11){
		index = 2;
	}
	else if(index == 12){
		index = 3;
	}
	else if(index == 13){
		index = 4;
	}
	else if(index == 14){
		index = 5;
	}
	else if(index == 15){
		index = 6;
	}
	
	return index;
}

// make the map once the page is loaded
$(document).ready(createMap());