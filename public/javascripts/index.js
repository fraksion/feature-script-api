(function() {
    if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
    var container, stats;
    var camera, controls, scene, renderer;
    var loadedModels = [];
    var previousData = false;
    var microversion;
    var configString;
    var features;
    const medium = {angleTolerance: 0.1090830782496456, chordTolerance:  0.004724409448818898, minFacetWidth: 0.009999999999999998};
    const coarse = {angleTolerance: 0.2181661564992912, chordTolerance:  0.009448818897637795, minFacetWidth: 0.024999999999999998};
    const fine = {angleTolerance: 0.04363323129985824, chordTolerance:  0.002362204724409449, minFacetWidth: 0.001};

    window.onload = function() {
        // prevent mouse clicks from going to model while dialog is open
        $('#stl-tolerance-modal').bind('click mousedown', function(e) {
            e.stopImmediatePropagation();
        });

        $('#resolution-select').change(function(){
            let value =  $('#resolution-select').val();
            if (value == 'custom'){
                $('#stl-parameters').css("display","block");
            }
            else
            {
                $('#stl-parameters').css("display","none");
            }
        });

        $('#elt-select2').change(function(){
            $('#configDiv').css("display","none");
            $('#config-btn').css("display","none");
            $('#stl-tolerance-btn').css("display","none");
            deleteModels();
            getCurrentMicroversion();

            $('#stl-tolerance-btn').css("display","block");
            $('#stl-tolerance-modal').modal('hide');
            getFeaturesList();
        });

        $('#add-feature-btn').click(function(){
            if (microversion===undefined){
                getCurrentMicroversion();
            }
            let feature = changeParametersValue();
            let body =  getFeatureJSON(microversion, feature);
            addCustomFeature(body);
        });

        $('#doc-select').change(function(){
            deleteModels();
            var selectedDocID = $("#doc-select").val();
            $("#wp-select").empty();
            $('#configDiv').css("display","none");
            $('#config-btn').css("display","none");
            $('#stl-tolerance-btn').css("display","none");
            $("#elt-select2").empty();
            $("#elt-select2").append("<option>-- Top of List --</option>");
            $("#wp-select").append("<option>-- Top of List --</option>");
            getWorkplaces(selectedDocID);
           // getCurrentMicroversion();
        });

        $('#wp-select').change(function(){
            deleteModels();
            $('#configDiv').css("display","none");
            $('#config-btn').css("display","none");
            $('#stl-tolerance-btn').css("display","none");
            $("#elt-select2").empty();
            $("#elt-select2").append("<option>-- Top of List --</option>");
            getElements();
            getCurrentMicroversion();
        });
        
        $('#feature-select').change(function(){
            addFeatureParameters();
        })

        init();
        //loadStl(-1, -1);
        
        animate();
    }

    function init() {

        // Make sure there is nothing kept from the previous model shown
//        deleteModels();

        // Setup the drop list for models ...
        $("#elt-select2").append("<option>-- Top of List --</option>");
        $("#doc-select").append("<option>-- Top of List --</option>");
        $("#wp-select").append("<option>-- Top of List --</option>");
        getDocuments();

        // Initialize Camera
        camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 0.1, 1e6);
        camera.position.set(3, 3, 3); // must initialize camera position

        // Initialize Controls
        controls = new THREE.TrackballControls(camera);
        controls.minDistance = 0.5;

        // Initialize Scene
        scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0xffffff, 0.1, 1e6);

        createLights();

        // Renderer
        renderer = new THREE.WebGLRenderer( { antialias: true } );
        renderer.setSize( window.innerWidth, window.innerHeight );

        renderer.setClearColor( scene.fog.color, 1 );

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
        container.append( stats.domElement );

        window.addEventListener( 'resize', onWindowResize, false );
    }

    function deleteModels() {
        for (var i = loadedModels.length - 1; i >= 0; --i) {
            scene.remove(loadedModels[i]);
            loadedModels.pop();
        }
    }

    function createLights() {
        scene.add( new THREE.AmbientLight( 0x777777 ) );
        addShadowedLight( 10, 10, 15, 0xffffff, 1.35 );
        addShadowedLight( 5, 10, -10, 0xffffff, 1 );
        addShadowedLight( -10, -5, -10, 0xffffff, 1 );
    }

    /*
     * Grab STL data from server. Information about which STL to grab is located
     * in the URL query string.
     * 
     *  window.location.search == "?documentId=0d86c205100fae7001a39ea8&workspaceId=aae7a1ff196df52c5a4c153c&elementId=a7d49a58add345ddb7362051&stlElementId=a7d49a58add345ddb7362051&partId=JUD"
     */
    function loadStl(angleTolerance, chordTolerance,  minFacetWidth, configurationString,) {
        var url = '/api/stl' +  $("#elt-select2").val();

        // Parse the search string to make sure we have the last piece to load
        var local =  $("#elt-select2").val();
        var index = local.indexOf("&stl");
        if (index > -1) {
            // Find the last stl segment and keep just that part
            var lastIndex = local.lastIndexOf("&stl");
            if (index != lastIndex) {
                var baseLocal = local.substring(0, index);
                var lastLocal = local.substring(lastIndex);
                var newLocal = baseLocal + lastLocal;

                url = '/api/stl' + newLocal;
            }
        }

        var binary = false;

        if (angleTolerance && chordTolerance && minFacetWidth) {
            url += '&angleTolerance=' + angleTolerance;
            url += '&chordTolerance=' + chordTolerance;
            url += '&minFacetWidth=' + minFacetWidth;
        }

        if (configurationString != undefined)
        {
            url += '&' + configurationString;
        }

        $('#stl-progress-bar').css("display","block");
        var dfd = $.Deferred();
        $.ajax(url, {
            type: 'GET',
            data: {
                binary: binary
            },
            success: function(data) {
                if (binary) {
                    // Convert base64 encoded string to Uint8Array
                    var u8 = new Uint8Array(atob(data).split('').map(function(c) {
                        return c.charCodeAt(0);
                    }));
                    // Load stl data from buffer of Uint8Array
                    loadStlData(u8.buffer);
                } else {
                    // ASCII
                    loadStlData(data);
                }
                $('#stl-progress-bar').css("display","none");
            },
            error: function() {
              console.log('loading STL error');
              
              $('#stl-progress-bar').css("display","none");
             
            },
        });
        return dfd.resolve();
    }

    /*
     * Load STL data using the STL loader included with three.js
     * @param data The data from the STL file.
     */
    function loadStlData(data) {

        var material = new THREE.MeshPhongMaterial({
            ambient: 0x555555,
            color: 0x0072BB,
            specular: 0x111111,
            shininess: 200
        });
        // Initialize loader
        var loader = new THREE.STLLoader();
        // Load using loader.parse rather than loader.load because we are loading
        // from data rather than from a file
        var geometry = loader.parse(data);

        // Zoom Camera to model
        THREE.GeometryUtils.center(geometry);
        geometry.computeBoundingSphere();
        fitToWindow(geometry.boundingSphere.radius);

        // Add mesh to scene
        var mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        loadedModels.push(mesh);
        scene.add(mesh);
    }

    function addShadowedLight(x, y, z, color, intensity) {
        var directionalLight = new THREE.DirectionalLight( color, intensity );
        directionalLight.position.set( x, y, z );
        scene.add( directionalLight );

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
        renderer.setSize( window.innerWidth, window.innerHeight );
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

    // Functions to support loading list of models to view ...
    function getElements() {
        var dfd = $.Deferred();
        var documentId = $("#doc-select").val();
        var wpId = $("#wp-select").val();
        $.ajax('/api/elements?documentId=' + documentId + "&workspaceId=" + wpId, {
            dataType: 'json',
            type: 'GET',
            success: function(data) {
                addElements(data, dfd);
            },
            error: function() {
            }
        });
        return dfd.promise();
    }

    function getWorkplaces(docId){
        var dfd = $.Deferred();
        $.ajax('/api/workplaces?documentId=' + docId, {
            dataType: 'json',
            type: 'GET',
            success: function(data) {
                addWorkplaces(data, dfd);
            },
            error: function() {
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
            success: function(data) {
                microversion = data.microversion;
            },
            error: function() {
            }
        });
        return dfd.promise();
    }

    function addWorkplaces(data, dfd){
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
        $.ajax('/api/documents'+ window.location.search, {
            dataType: 'json',
            type: 'GET',
            success: function(data) {
                addDocuments(data, dfd);
            },
            error: function() {
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
                var baseHref = "?documentId=" + docId + "&workspaceId="+wpId + "&elementId=" + data[i].id + "&microversion=" + microversion;
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

    function addCustomFeature(body){
        var dfd = $.Deferred();
            $.ajax("/api/addCustomFeature",{
                type: "POST",
                dataType: "json",
                data: JSON.stringify(body), 
                contentType: "application/json",
                Accept:'application/vnd.onshape.v1+json',
                complete: function() {
                  //called when complete
                  alert("Custom feature added");
                  console.log('addCustomFeature complete');
                },
                success: function(data) {
                   //console.log('addCustomFeature success');
                   alert("Custom feature added");
               },
                error: function() {
                  console.log('addCustomFeature error');
                },
              });
              return dfd.resolve();
    }

    function addFeatureParameters(){
       
        $('#feature-parameters').empty();
        let i=0;
        var list = document.getElementById('feature-parameters');
        let currentFeature = getCurrentFeature();
        currentFeature.message.parameters.forEach(parameter => {
            if (parameter.type === 147){
                let valueArray = parameter.message.expression.split(' ');
                if (valueArray[1] == undefined)
                valueArray[1] = '';

                $('<label for="first-input-test' + i + '">' + parameter.message.parameterId +'</label>').appendTo(list);
    
                $('<p><input class="inputValues" style="border-top: none; border-left: none; border-right: none; border-bottom: 1px solid dimgray;" type="number" value= "' + valueArray[0] + '" type="number" step="1" id="first-input-test' + i + '"> <label id="first-input-label' + i + '">'+ valueArray[1] + '</label> </p>').appendTo(list);
                
                i++;
            }
            else if (parameter.type === 144){

                $('<p><input class="inputValues" type="checkbox" class="custom-control-input" id="first-input-test' + i + '" >'+ parameter.message.parameterId + ' </p>').appendTo(list);
                i++;
            }
        });

        
    }

    function changeParametersValue(){
        let currentFeature = getCurrentFeature();
        let arrayOfParameters = [];
        let i=0;
        while ($('#first-input-test' + i).val()!==undefined){
            arrayOfParameters.push($('#first-input-test' + i));
            i++;
        }
        currentFeature.message.parameters.forEach(parameter => {
            if (parameter.type === 147){
                let valueArray = parameter.message.expression.split(' ');
                if (valueArray[1] == undefined)
                valueArray[1] = '';
                valueArray[0] = arrayOfParameters.shift().val();
                parameter.message.expression = valueArray.join(' ');
            }
            else if (parameter.type === 144){
                parameter.message.value = arrayOfParameters.shift().is(":checked");
            }
            console.log(parameter);
        });
        return currentFeature;
    }

    function getCurrentFeature(){
        if (features != undefined){
                for (var i=0; i< features.length; i++){
                    if (features[i].message.name == $("#feature-select").val()){
                        return features[i];
                    }
            } 
        }

    }

    function getFeatureJSON(microversion, feature){
        let body ={
            feature :  feature,
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
            success: function(data) {
                addFeatures(data, dfd);
            },
            error: function() {
            }
        });
        return dfd.promise();
    }

    function addFeatures(data, dfd){

        $("#feature-select").empty();
        let prevFeature;
        features = data.features;
        data.features.forEach(element => {
            if (element.message.featureType == 'myFeature'){
                
                $("#feature-select")
                .append(
                "<option value='" + element.message.name + "'>" + element.message.name + "</option>"
            );
            prevFeature = element.message;
            }
        }); 
    dfd.resolve();
    }

    const getIdScript = "function(context is Context, queries)"+
    "{"+
        "var top =  qCreatedBy(makeId(\"Top\"), EntityType.EDGE);"+
       " var right =  qCreatedBy(makeId(\"Right\"), EntityType.EDGE);"+
       " var front =  qCreatedBy(makeId(\"Front\"), EntityType.EDGE);"+
       " var edges = evaluateQuery(context, qSubtraction(qEverything(EntityType.EDGE), qUnion([top, right, front])));"+
        "var result = makeArray(size(edges));"+
        "for (var i = 0; i < size(edges); i += 1)"+
        "{"+
           " result[i] = transientQueriesToStrings(edges[i]);"+
        "}"+
        "return {\"curves\" : result};"+
    "}";

    function FeatureScriptBody(script, queries){
        let result = {
            "script" : script, 
            "queries" : queries
        }
        return result;
    }
})();
