(function () {

    if (!Detector.webgl) Detector.addGetWebGLMessage();
    var container, stats;
    var camera, controls, scene, renderer;
    var loadedModels = [];
    var previousData = false;
    var microversion;
    var configString;
    var features;
    let sketches = [];
    let csvPointsArray;
    let SplinePointSctiptQuery;
    let SplinePointSctiptQueryString;
    const medium = { angleTolerance: 0.1090830782496456, chordTolerance: 0.004724409448818898, minFacetWidth: 0.009999999999999998 };
    const coarse = { angleTolerance: 0.2181661564992912, chordTolerance: 0.009448818897637795, minFacetWidth: 0.024999999999999998 };
    const fine = { angleTolerance: 0.04363323129985824, chordTolerance: 0.002362204724409449, minFacetWidth: 0.001 };

    window.onload = function () {
        // prevent mouse clicks from going to model while dialog is open
        $('#stl-tolerance-modal').bind('click mousedown', function (e) {
            e.stopImmediatePropagation();
        });

        $('#resolution-select').change(function () {
            let value = $('#resolution-select').val();
            if (value == 'custom') {
                $('#stl-parameters').css("display", "block");
            }
            else {
                $('#stl-parameters').css("display", "none");
            }
        });

        $('#elt-select2').change(function () {
            $("#feature-select").empty();
            $('#feature-parameters').empty();
            $("#sketch-select").empty();
            $('#configDiv').css("display", "none");
            $('#config-btn').css("display", "none");
            $('#stl-tolerance-btn').css("display", "none");
            getCurrentMicroversion();
            $('#stl-tolerance-btn').css("display", "block");
            $('#stl-tolerance-modal').modal('hide');
            getFeaturesList();
            getSketchesIDs();

        });

        $('#add-feature-btn').click(function () {
            if (microversion === undefined) {
                getCurrentMicroversion();
            }
            let feature = changeParametersValue();
            let body = getFeatureJSON(microversion, feature);
            addCustomFeature(body);
        });

        $('#doc-select').change(function () {

            var selectedDocID = $("#doc-select").val();
            $("#feature-select").empty();
            $('#feature-parameters').empty();
            $("#wp-select").empty();
            $("#sketch-select").empty();
            $('#configDiv').css("display", "none");
            $('#config-btn').css("display", "none");
            $('#stl-tolerance-btn').css("display", "none");
            $("#elt-select2").empty();
            $("#elt-select2").append("<option>-- Top of List --</option>");
            $("#wp-select").append("<option>-- Top of List --</option>");
            $('#add-feature-btn').css("display", "none");
            getWorkplaces(selectedDocID);
            // getCurrentMicroversion();
        });

        $('#wp-select').change(function () {

            $("#feature-select").empty();
            $('#feature-parameters').empty();
            $('#configDiv').css("display", "none");
            $('#config-btn').css("display", "none");
            $('#stl-tolerance-btn').css("display", "none");
            $("#sketch-select").empty();
            $("#elt-select2").empty();
            $("#elt-select2").append("<option>-- Top of List --</option>");
            $('#add-feature-btn').css("display", "none");
            getElements();
            getCurrentMicroversion();
        });

        $('#feature-select').change(function () {
            addFeatureParameters();
        })

        $('#get-id-btn').click(function () {
            //evaluateFeatureScript();
            deleteModels();
            $('#stl-progress-bar').css("display", "block");
            getSketchPoints();

        })

        //$('#script-btn').click(() => {
        //    evaluateFeatureScript();
        //});


        //var submit_button = document.getElementById('submit_button');
        //submit_button.addEventListener('click', parse_array);

        init();
        animate();
    }

    function init() {

        $("#elt-select2").append("<option>-- Top of List --</option>");
        $("#doc-select").append("<option>-- Top of List --</option>");
        $("#wp-select").append("<option>-- Top of List --</option>");
        getDocuments();



        // Initialize Camera
        camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1e6);
        camera.position.set(3, 3, 3); // must initialize camera position



        // Initialize Controls
        controls = new THREE.TrackballControls(camera);
        controls.minDistance = 0.5;

        $('#camera-position-btn').click(() => {
            camera.position.set(3, 3, 3);
            camera.rotation.set(0, 0, 0);
            controls.reset();

        })

        // Initialize Scene
        scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0xffffff, 0.1, 1e6);

        createLights();

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);

        renderer.setClearColor(scene.fog.color, 1);

        renderer.gammaInput = true;
        renderer.gammaOutput = true;

        renderer.shadowMapEnabled = true;
        renderer.shadowMapCullFace = THREE.CullFaceBack;

        // Stats
        stats = new Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.top = '0px';

        // Add to DOM
        container = $('#stl-viewport');
        container.append(renderer.domElement);
        container.append(stats.domElement);

        window.addEventListener('resize', onWindowResize, false);
    }

    function deleteModels() {
        for (var i = loadedModels.length - 1; i >= 0; --i) {
            scene.remove(loadedModels[i]);
            loadedModels.pop();
        }
    }

    function createLights() {
        scene.add(new THREE.AmbientLight(0x777777));
        addShadowedLight(10, 10, 15, 0xffffff, 1.35);
        addShadowedLight(5, 10, -10, 0xffffff, 1);
        addShadowedLight(-10, -5, -10, 0xffffff, 1);
    }

    function addShadowedLight(x, y, z, color, intensity) {
        var directionalLight = new THREE.DirectionalLight(color, intensity);
        directionalLight.position.set(x, y, z);
        scene.add(directionalLight);

        var d = 1;
        directionalLight.shadowCameraLeft = -d;
        directionalLight.shadowCameraRight = d;
        directionalLight.shadowCameraTop = d;
        directionalLight.shadowCameraBottom = -d;

        directionalLight.shadowCameraNear = 1;
        directionalLight.shadowCameraFar = 4;

        directionalLight.shadowMapWidth = 1024;
        directionalLight.shadowMapHeight = 1024;

        directionalLight.shadowBias = -0.005;
        directionalLight.shadowDarkness = 0.15;
    }

    function fitToWindow(boundingSphereRadius) {
        var dist = camera.aspect * boundingSphereRadius / Math.tan(camera.fov * (Math.PI / 180));

        var cameraUnitVector = camera.position.clone().normalize();
        camera.position = cameraUnitVector.multiplyScalar(dist);
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
        requestAnimationFrame(animate);
        render();
        stats.update();
    }

    function render() {
        controls.update();
        renderer.render(scene, camera);
    }

    function parse_array() {
        console.log('Parsing Array!');
        var file = document.getElementById("file").files[0];
        parseMe(file, doStuff);
    }

    function parseMe(url, callBack) {
        Papa.parse(url, {
            dynamicTyping: true,
            complete: function (results) {
                callBack(results.data);
            },

        });
    }

    function doStuff(data) {
        csvPointsArray = data;
        while(true)
        {
            if (csvPointsArray[csvPointsArray.length-1][0] === null){
                let tes = csvPointsArray.pop();
            }
            else{
                break;
            }
            
        }
        let testStringArray = '[';
        csvPointsArray.forEach(item => {
            testStringArray += `[${item[0]}, ${item[1]}, ${item[2]}],`;
        });
        testStringArray = testStringArray.substr(0,testStringArray.length-1);
        testStringArray+=']';
        csvPointsArray = testStringArray;
       // SplinePointSctiptQuery = { "key" : "csvData", "value" : csvPointsArray };
       // console.log(testStringArray);
    }

    // Functions to support loading list of models to view ...
    function getElements() {
        var dfd = $.Deferred();
        var documentId = $("#doc-select").val();
        var wpId = $("#wp-select").val();
        $.ajax('/api/elements?documentId=' + documentId + "&workspaceId=" + wpId, {
            dataType: 'json',
            type: 'GET',
            success: function (data) {
                addElements(data, dfd);
            },
            error: function () {
            }
        });
        return dfd.promise();
    }

    function getWorkplaces(docId) {
        var dfd = $.Deferred();
        $.ajax('/api/workplaces?documentId=' + docId, {
            dataType: 'json',
            type: 'GET',
            success: function (data) {
                addWorkplaces(data, dfd);
            },
            error: function () {
            }
        });
        return dfd.promise();
    }

    function getCurrentMicroversion() {
        var dfd = $.Deferred();
        var documentId = $("#doc-select").val();
        var wpId = $("#wp-select").val();
        $.ajax('/api/microversion?documentId=' + documentId + "&workspaceId=" + wpId, {
            dataType: 'json',
            type: 'GET',
            success: function (data) {
                microversion = data.microversion;
            },
            error: function () {
            }
        });
        return dfd.promise();
    }

    function addWorkplaces(data, dfd) {
        var onshapeElements = $("#onshape-elements");
        onshapeElements.empty();
        $("#wp-select").empty();
        $("#wp-select").append("<option>-- Top of List --</option>");
        for (var i = 0; i < data.length; ++i) {
            $("#wp-select")
                .append(
                    "<option value='" + data[i].id + "'>" + " " + data[i].name + "</option>"
                )
        }
        dfd.resolve();
    }

    function getDocuments() {
        var dfd = $.Deferred();
        $.ajax('/api/documents' + window.location.search, {
            dataType: 'json',
            type: 'GET',
            success: function (data) {
                addDocuments(data, dfd);
            },
            error: function () {
            }
        });
        return dfd.promise();
    }

    function addDocuments(data, dfd) {
        var onshapeElements = $("#onshape-elements");
        onshapeElements.empty();
        for (var i = 0; i < data.items.length; ++i) {
            $("#doc-select")
                .append(
                    "<option value='" + data.items[i].id + "'>" + " " + data.items[i].name + "</option>"
                )
        }
        dfd.resolve();
    }

    function addElements(data, dfd) {
        var onshapeElements = $("#onshape-elements");
        onshapeElements.empty();
        for (var i = 0; i < data.length; ++i) {
            if (data[i].elementType === "PARTSTUDIO") {
                // URL must contain query string!
                // (Query string contains document and workspace information)
                var docId = $("#doc-select").val();
                var wpId = $("#wp-select").val();
                var baseHref = "?documentId=" + docId + "&workspaceId=" + wpId + "&elementId=" + data[i].id + "&microversion=" + microversion;
                var href = baseHref + "&stlElementId=" + data[i].id;
                $("#elt-select2")
                    .append(
                        "<option value='" + href + "'>" + "Element - " + data[i].name + "</option>"
                    )

            }
        }

        elementsDict = createElementsDict(data);
        dfd.resolve();
    }

    function createElementsDict(elementsArray) {
        dict = {};
        for (var i = 0; i < elementsArray.length; ++i) {
            dict[elementsArray[i]["id"]] = elementsArray[i];
        }
        return dict;
    }

    function addCustomFeature(body) {
        var dfd = $.Deferred();
        $.ajax("/api/addCustomFeature" + $('#elt-select2').val(), {
            type: "POST",
            dataType: "json",
            data: JSON.stringify(body),
            contentType: "application/json",
            Accept: 'application/vnd.onshape.v1+json',
            complete: function () {
                //called when complete
                console.log('addCustomFeature complete');
            },
            success: function (data) {
                alert('addCustomFeature success');
            },
            error: function () {
                console.log('addCustomFeature error');
            },
        });
        return dfd.resolve();
    }

    function addFeatureParameters() {
        $('#feature-parameters').empty();
        let i = 0;
        var list = document.getElementById('feature-parameters');
        let currentFeature = getCurrentFeature();
        if (currentFeature !== undefined) {
            currentFeature.message.parameters.forEach(parameter => {
                if (parameter.type === 147) {
                    let valueArray = parameter.message.expression.split(' ');
                    if (valueArray[1] == undefined)
                        valueArray[1] = '';

                    $('<label for="first-input-test' + i + '">' + parameter.message.parameterId + '</label>').appendTo(list);

                    $('<p><input class="inputValues" style="border-top: none; border-left: none; border-right: none; border-bottom: 1px solid dimgray;" type="number" value= "' + valueArray[0] + '" type="number" step="1" id="first-input-test' + i + '"> <label id="first-input-label' + i + '">' + valueArray[1] + '</label> </p>').appendTo(list);

                    i++;
                }
                else if (parameter.type === 144) {

                    $('<p><input class="inputValues" type="checkbox" class="custom-control-input" id="first-input-test' + i + '" >' + parameter.message.parameterId + ' </p>').appendTo(list);
                    i++;
                }

            });
        }

    }

    function changeParametersValue() {
        let currentFeature = getCurrentFeature();
        let arrayOfParameters = [];
        let i = 0;
        while ($('#first-input-test' + i).val() !== undefined) {
            arrayOfParameters.push($('#first-input-test' + i));
            i++;
        }
        currentFeature.message.parameters.forEach(parameter => {
            if (parameter.type === 147) {
                let valueArray = parameter.message.expression.split(' ');
                if (valueArray[1] == undefined)
                    valueArray[1] = '';
                valueArray[0] = arrayOfParameters.shift().val();
                parameter.message.expression = valueArray.join(' ');
            }
            else if (parameter.type === 144) {
                parameter.message.value = arrayOfParameters.shift().is(":checked");
            }
            console.log(parameter);
        });
        return currentFeature;
    }

    function getCurrentFeature() {
        if (features != undefined) {
            for (var i = 0; i < features.length; i++) {
                if (features[i].message.name == $("#feature-select").val()) {
                    return features[i];
                }
            }
        }
    }

    getSelectedSketch = () => {
        let temp;
        sketches.forEach(item => {
            if (item.sketchId === $('#sketch-select').val())
                temp = item;
        });
        return temp;
    }

    function getSketchesIDs() {
        if (features != undefined) {
            features.forEach(element => {
                if (element.message.featureType == 'newSketch') {
                    let items = [];
                    element.message.entities.forEach(item => {
                        items.push({
                            entityId: item.message.entityId,
                            isConstruction: item.message.isConstruction
                        });
                    });
                    let sketch = {
                        sketchId: element.message.featureId,
                        sketchName: element.message.name,
                        entities: items
                    }

                    sketches.push(sketch);
                }
            });
            sketches.forEach(element => {
                $("#sketch-select")
                    .append(
                        "<option value='" + element.sketchId + "'>" + element.sketchName + "</option>"
                    );
            });
        }
    }

    function getFeatureJSON(microversion, feature) {
        let body = {
            feature: feature,
            serializationVersion: "1.1.17",
            sourceMicroversion: microversion,
            rejectMicroversionSkew: false
        };
        return body;
    }

    function getFeaturesList() {
        var dfd = $.Deferred();
        var parameters = $("#elt-select2").val();
        $.ajax('/api/features' + parameters, {
            dataType: 'json',
            type: 'GET',
            success: function (data) {
                addFeatures(data, dfd);
            },
            error: function () {
            }
        });
        return dfd.promise();
    }

    function addFeatures(data, dfd) {
        $('#add-feature-btn').css("display", "none");
        $("#feature-select").empty();
        features = data.features;
        data.features.forEach(element => {
            if (element.message.featureType == 'myFeature') {

                $("#feature-select")
                    .append(
                        "<option value='" + element.message.name + "'>" + element.message.name + "</option>"
                    );
                    $('#add-feature-btn').css("display", "inline");
            }
        });
        getSketchesIDs();
        addFeatureParameters();
        dfd.resolve();
    }

    function getScript(){
        return 'function(context is Context, queries is map) {'+
        'var startingIndices; '+ 'var testPoints = ' + csvPointsArray + ';'+
    'if (!(testPoints[0] is array))'+
    '{'+ 
       ' debug(context, testPoints); return;'+
    '}'+
   ' for (var rowIndex = 0; rowIndex < size(testPoints); rowIndex += 1)'+
    '{'+
        'var row = testPoints[rowIndex];'+
        'for (var columnIndex = 0; columnIndex < size(testPoints); columnIndex += 1)'+
        '{'+
           ' if (row[columnIndex] is number) {'+
                'startingIndices = [rowIndex, columnIndex];'+
            '}'+
        '}'+
    '}'+
        'const startRow = startingIndices[0];'+
        'const startColumn = startingIndices[1];'+
        'var points = [];'+
        'for (var i = startRow; i < size(testPoints); i += 1)'+
        '{'+
           ' const row = testPoints[i];'+
            'const point = vector(row[startColumn], row[startColumn + 1], row[startColumn + 2]) * meter;'+
           ' points = append(points, point);'+
            //'opPoint(context, id + "point" + i, {'+
           //         '"point" : point'+
           // '});'+
        '}'+
         //'opFitSpline(context, id + "fitSpline1", {'+
       //          '"points" : points'+
        // '});'+
    '}';
    }

    function FeatureScriptBody(script, queries) {
        let result = {
            script: script,
            queries: queries
        }
        return result;
    }

    function evaluateFeatureScript() {
        var dfd = $.Deferred();
        let body = FeatureScriptBody(testScript, []);
        console.log(JSON.stringify(body));
        var parameters = $("#elt-select2").val();
        $.ajax("/api/featurescript" + parameters, {
            type: "POST",
            dataType: "json",
            data: JSON.stringify(body),
            contentType: "application/json",
            Accept: 'application/vnd.onshape.v1+json',
            complete: function (data) {
                //called when complete

            },
            success: function (data) {
                console.log(data);
            },
            error: function () {
                console.log('addCustomFeature error');
            },
        });
        return dfd.resolve();
    }

    function getSketchPoints() {
        var dfd = $.Deferred();
        var elId = $('#elt-select2').val();
        var skId = $('#sketch-select').val();
        $.ajax('/api/tesselatedSketch' + elId + "&sketchId=" + skId, {
            dataType: 'json',
            type: 'GET',
            success: function (data) {
                translatePoints(data, dfd);
                $('#stl-progress-bar').css("display", "none");
            },
            error: function () {
            }
        });
        return dfd.promise();
    }

    function translatePoints(data, dfd) {
        deleteModels();
        let material;

        for (let i = 0; i < data.sketchEntities.length; i++) {
            let geometry = new THREE.Geometry();
            let isConstruction = false;
            let selectedSketch = getSelectedSketch();
            selectedSketch.entities.forEach(item => {
                if (item.entityId === data.sketchEntities[i].entityId && item.isConstruction === true)
                    isConstruction = true;
            });
            if (isConstruction) {
                material = new THREE.LineDashedMaterial({ color: 0x000000, dashSize: 0.005, gapSize: 0.001, linewidth: 2 });
            }
            else {
                material = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
            }
            let tessellationPoints = data.sketchEntities[i].tessellationPoints;
            tessellationPoints.forEach(point => {
                geometry.vertices.push(new THREE.Vector3(point[0], point[1], point[2]));
            });

            let line = new THREE.Line(geometry, material);
            if (i == 0) {
                const axes = new THREE.AxesHelper();
                axes.material.depthTest = false;
                axes.renderOrder = 1;
                scene.add(axes);
                loadedModels.push(axes);
            }
            line.computeLineDistances();
            scene.add(line);
            loadedModels.push(line);
            geometry.computeBoundingSphere();
            fitToWindow(geometry.boundingSphere.radius);
        }

        return dfd.resolve();
    }
})();
