// create the map with the desired view and zoom
var map;
var minValue;

function createMap(){
	map = L.map('mapid').setView([38,16], 4)
	// load the tileset I found
	L.tileLayer('https://{s}.tile.thunderforest.com/neighbourhood/{z}/{x}/{y}.png?apikey={apikey}', {
		attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		apikey: '5905384e78ab4358b59022a245531c74',
		maxZoom: 22
	}).addTo(map);
	
	getMap();
}

function calcMinVal(data){
	//create empty array to store all data values
     var allValues = [];
     
     // loop through each city
     for(var country of data.features){
          // loop through each year
		  allValues.push(country.properties["yr2004"]);
		  allValues.push(country.properties["yr2010"]);
          for(var year = 2015; year <= 2019; year+=1){
               // get value for current year
               var value = country.properties["yr"+ String(year)];
               // push value to array
               allValues.push(value);
           }
     }
     
     //get minimum value of our array
     var minValue = Math.min(...allValues)

     return minValue;
}

function calcRadius(val){
	// constant factor adjusts symbol sizes evenly
     var minRadius = 5;
     
     // Flannery Appearance Compensation formula
     var radius = 1.0083 * Math.pow(val/minValue,0.5715) * minRadius

     return radius;
}

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

function createSeq(data){
	$('#panel').append('<input class="range-slider" type="range">');
	
	// set slider attributes
    $('.range-slider').attr({
        min: 0,
        max: 15,
        value: 0,
        step: 1
    });
	
	$('#panel').append('<button class="step" id="reverse"><-</button>');
    $('#panel').append('<button class="step" id="forward">+></button>');
	
	var attributes = processData(data);
	
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
		
		updatePropSymbols(attributes[index]);
    });
	
	$('.step').click(function(){
        //get the old index value
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
		
		if(index == 6){
			index = 1;
		}
		if(index == 11){
			index = 2;
		}
		if(index == 12){
			index = 3;
		}
		if(index == 13){
			index = 4;
		}
		if(index == 14){
			index = 5;
		}
		if(index == 15){
			index = 6;
		}
		
		updatePropSymbols(attributes[index]);
    });
}

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
			
			$('#legend').text(year);
        };
    });
};

function pointToLayer(feature, latlng, attrs){
	var attr = attrs[0];
	$('#legend').text(attr.slice(2));
	var attrP = "Threatened Species "
	
	// create marker options
    var geojsonMarkerOptions = {
		radius: 8,
		fillColor: "#ff7800",
		color: "#000",
		weight: 1,
		opacity: 1,
		fillOpacity: 0.8
    };
          
	var attValue = Number(feature.properties[attr]);

	geojsonMarkerOptions.radius = calcRadius(attValue);

	// create circle markers
	var layer = L.circleMarker(latlng, geojsonMarkerOptions);
			
	// build popup content string
	var popupContent = "<p><b>Country:</b> " + feature.properties.Country + "</p><p><b>" + attrP + attr.slice(2) + ":</b> " + feature.properties[attr] + "</p>";

	// bind the popup to the circle marker
	layer.bindPopup(popupContent, {
		offset: new L.Point(0,-geojsonMarkerOptions.radius)
	});
			
	return layer;
}

function createPropSymbs(response,attrs){
	L.geoJson(response, {
		pointToLayer : function (feature, latlng) {
			return pointToLayer(feature, latlng, attrs);
		}
	}).addTo(map);
}

// load the geojson I made from my data into the map
function getMap(){
	$.getJSON("data/map_data.geojson", function(response){
			minValue = calcMinVal(response);
            // create a Leaflet GeoJSON layer and add it to the map
			createSeq(response);
        });
}
		
$(document).ready(createMap());