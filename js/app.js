(function() {

    L.mapbox.accessToken = 'pk.eyJ1Ijoiam9lYmxhbmtlbnNoaXAxIiwiYSI6ImNqZGRjY2F3ZjAwNTMyd3FoOG83c3A4aWsifQ.bXiHMzyYHgFukGwVPUddAw';

    var map = L.mapbox.map('map', 'mapbox.light', {
        zoomSnap: .1,
        center: [-.23, 37.8],
        zoom: 7,
        minZoom: 6,
        maxZoom: 9,
        maxBounds: L.latLngBounds([-6.22, 27.72], [5.76, 47.83])
    });

    // use omnivore to load the CSV data
    omnivore.csv('data/kenya_education_2014.csv')
        .on('ready', function(e) {
            // push education data to map
            drawMap(e.target.toGeoJSON());
            drawLegend(e.target.toGeoJSON()); // add legend to map
        })
        .on('error', function(e) {
            console.log(e.error[0].message);
        });

    function drawMap(data) {
        // set layer symbol options
        var options = {
            pointToLayer: function(feature, ll) {
                return L.circleMarker(ll, {
                    opacity: 1,
                    weight: 2,
                    fillOpacity: 0,
                })
            }
        }

        // create two layers from the data
        var girlsLayer = L.geoJson(data, options).addTo(map),
            boysLayer = L.geoJson(data, options).addTo(map);

        // fit the bounds of the map
        map.fitBounds(girlsLayer.getBounds());

        // adjust zoom
        map.setZoom(map.getZoom() - .4);

        // set colors for layer symbols
        girlsLayer.setStyle({
            color: '#D96D02',
        });
        boysLayer.setStyle({
            color: '#6E77B0',
        });

        // call function to resize the county symbols in each layer
        resizeCircles(girlsLayer, boysLayer, 1);

        // update via slider UI position
        sequenceUI(girlsLayer, boysLayer);

        // update grade legend
        drawGradeLegend(1);

    }

    // calculate the radius of the county symbols
    function calcRadius(val) {
        // calculate radius of our circles per val
        var radius = Math.sqrt(val / Math.PI);
        return radius * .5; //adjust .5 as scale factor
    }

    // resize the circles for our layers when given a grade 1 to 8
    function resizeCircles(girlsLayer, boysLayer, currentGrade) {

        // adjust the girls layer symbols for G + currentGrade
        girlsLayer.eachLayer(function(layer) {
            var radius = calcRadius(Number(layer.feature.properties['G' + currentGrade]));
            layer.setRadius(radius);
        });
        // adjust the boys layer symbols for G + currentGrade
        boysLayer.eachLayer(function(layer) {
            var radius = calcRadius(Number(layer.feature.properties['B' + currentGrade]));
            layer.setRadius(radius);
        });

        // update the hover window with current grade's
        retrieveInfo(boysLayer, currentGrade);
    }

    function sequenceUI(girlsLayer, boysLayer) {
        // create Leaflet control for the slider
        var sliderControl = L.control({
            position: 'bottomleft'
        });

        sliderControl.onAdd = function(map) {

            var controls = L.DomUtil.get("slider");

            L.DomEvent.disableScrollPropagation(controls);
            L.DomEvent.disableClickPropagation(controls);

            return controls;

        }

        // add it to the map
        sliderControl.addTo(map);

        //select the slider's input and listen for change
        $('#slider input[type=range]')
            .on('input', function() {

                // current value of slider is current grade level
                var currentGrade = this.value;

                // resize the circles with updated grade level
                resizeCircles(girlsLayer, boysLayer, currentGrade);

                // update the grade legend
                updateGradeLegend(currentGrade);
            });

    }

    function drawGradeLegend(currentGrade) {
        // create Leaflet control for the gradeLegend
        var gradeControl = L.control({
            position: 'bottomleft'
        });

        // when the control is added to the map
        gradeControl.onAdd = function(map) {

            // select the legend using id attribute of legend
            var gradeLegend = L.DomUtil.get("grade");

            // disable scroll and click functionality
            L.DomEvent.disableScrollPropagation(gradeLegend);
            L.DomEvent.disableClickPropagation(gradeLegend);

            // return the selection
            return gradeLegend;

        }

        gradeControl.addTo(map);
        // update legend with currentGrade
        updateGradeLegend(currentGrade);

    }

    function updateGradeLegend(currentGrade) {
        // update the grade based on slider position
        $('#grade span').html(currentGrade);

    }

    function drawLegend(data) {
        // create Leaflet control for the legend
        var legendControl = L.control({
            position: 'bottomright'
        });

        // when the control is added to the map
        legendControl.onAdd = function(map) {

            // select the legend using id attribute of legend
            var legend = L.DomUtil.get("legend");

            // disable scroll and click functionality
            L.DomEvent.disableScrollPropagation(legend);
            L.DomEvent.disableClickPropagation(legend);

            // return the selection
            return legend;

        }

        legendControl.addTo(map);

        // loop through all features (i.e., the schools)
        var dataValues = data.features.map(function(school) {
            // for each grade in a school
            for (var grade in school.properties) {
                // shorthand to each value
                var value = school.properties[grade];
                // if the value can be converted to a number
                if (+value) {
                    //return the value to the array
                    return +value;
                }

            }
        });
        // sort our array
        var sortedValues = dataValues.sort(function(a, b) {
            return b - a;
        });

        // round the highest number and use as our large circle diameter
        var maxValue = Math.round(sortedValues[0] / 1000) * 1000;

        // calc the diameters
        var largeDiameter = calcRadius(maxValue) * 2,
            smallDiameter = largeDiameter / 2;

        // select our circles container and set the height
        $(".legend-circles").css('height', largeDiameter.toFixed());

        // set width and height for large circle
        $('.legend-large').css({
            'width': largeDiameter.toFixed(),
            'height': largeDiameter.toFixed()
        });
        // set width and height for small circle and position
        $('.legend-small').css({
            'width': smallDiameter.toFixed(),
            'height': smallDiameter.toFixed(),
            'top': largeDiameter - smallDiameter,
            'left': smallDiameter / 2
        })

        // label the max and median value
        $(".legend-large-label").html(maxValue.toLocaleString());
        $(".legend-small-label").html((maxValue / 2).toLocaleString());

        // adjust the position of the large based on size of circle
        $(".legend-large-label").css({
            'top': -11,
            'left': largeDiameter + 30,
        });

        // adjust the position of the large based on size of circle
        $(".legend-small-label").css({
            'top': smallDiameter - 11,
            'left': largeDiameter + 30
        });

        // insert a couple hr elements and use to connect value label to top of each circle
        $("<hr class='large'>").insertBefore(".legend-large-label")
        $("<hr class='small'>").insertBefore(".legend-small-label").css('top', largeDiameter - smallDiameter - 8);

    }

    function retrieveInfo(boysLayer, currentGrade) {
        // select the element and reference with variable
        // and hide it from view initially
        var info = $('#info').hide();

        // since boysLayer is on top, use to detect mouseover events
        boysLayer.on('mouseover', function(e) {

            // remove the none class to display and show
            info.show();

            // access properties of target layer
            var props = e.layer.feature.properties;

            // empty arrays for boys and girls values
            var girlsValues = [],
                boysValues = [];

            // loop through the grade levels and push values into those arrays
            for (var i = 1; i <= 8; i++) {
                girlsValues.push(props['G' + i]);
                boysValues.push(props['B' + i]);
            }

            // populate HTML elements with relevant info
            $('#info span').html(props.COUNTY);
            $(".girls span:first-child").html('(Grade ' + currentGrade + ')');
            $(".boys span:first-child").html('(Grade ' + currentGrade + ')');
            $(".girls span:last-child").html(Number(props['G' + currentGrade]).toLocaleString());
            $(".boys span:last-child").html(Number(props['B' + currentGrade]).toLocaleString());
            $('.girlspark').sparkline(girlsValues, {
                width: '200px',
                height: '30px',
                lineColor: '#D96D02',
                fillColor: '#d98939 ',
                spotRadius: 0,
                lineWidth: 2
            });
            $('.boyspark').sparkline(boysValues, {
                width: '200px',
                height: '30px',
                lineColor: '#6E77B0',
                fillColor: '#878db0',
                spotRadius: 0,
                lineWidth: 2
            });

            // raise opacity level as visual affordance
            e.layer.setStyle({
                fillOpacity: .6
            });

        });

        // hide the info panel when mousing off layergroup and remove affordance opacity
        boysLayer.on('mouseout', function(e) {

            // hide the info panel
            info.hide();

            // reset the layer style
            e.layer.setStyle({
                fillOpacity: 0
            });
        });

        // when the mouse moves on the document
        $(document).mousemove(function(e) {
            // first offset from the mouse position of the info window
            info.css({
                "left": e.pageX + 6,
                "top": e.pageY - info.height() - 25
            });

            // if it crashes into the top, flip it lower right
            if (info.offset().top < 4) {
                info.css({
                    "top": e.pageY + 15
                });
            }
            // if it crashes into the right, flip it to the left
            if (info.offset().left + info.width() >= $(document).width() - 40) {
                info.css({
                    "left": e.pageX - info.width() - 80
                });
            }
        });
    }

})();
