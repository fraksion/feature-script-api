(function() {
    if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
    var container, stats;
    var camera, controls, scene, renderer;
    var loadedModels = [];
    var previousData = false;
    var microversion;
    var configString;
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
            $("#inputs-ul").empty();
            let parameters = getParameters();
            loadStl(parameters.angleTolerance, parameters.chordTolerance, parameters.minFacetWidth);
            getEncodedConfig();

            $('#stl-tolerance-btn').css("display","block");
            $('#stl-tolerance-modal').modal('hide');
        });

        $('#stl-tolerance-submit').click(function() {
            deleteModels();
            let parameters = getParameters();
            getEncodedConfigurationString(parameters.angleTolerance, parameters.chordTolerance, parameters.minFacetWidth);
            //loadStl(angleTolerance, chordTolerance);
            $('#stl-tolerance-modal').modal('hide');
        });

        $('#config-btn').click(function(){
            deleteModels();
            getCurrentMicroversion();
            generateEncodedMessage();
            let parameters = getParameters();
            getEncodedConfigurationString(parameters.angleTolerance, parameters.chordTolerance, parameters.minFacetWidth);
            updateConfiguration();
            $('#stl-tolerance-modal').modal('hide');
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
        });

        $('#wp-select').change(function(){
            deleteModels();
            $('#configDiv').css("display","none");
            $('#config-btn').css("display","none");
            $('#stl-tolerance-btn').css("display","none");
            $("#elt-select2").empty();
            $("#elt-select2").append("<option>-- Top of List --</option>");
            getElements().then(getParts);
            getCurrentMicroversion();
        });
        


        init();
        //loadStl(-1, -1);
        TEST();
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

    function getParts() {
        var dfd = $.Deferred();
        var documentId = $("#doc-select").val();
        var wpId = $("#wp-select").val();
        $.ajax('/api/parts?documentId=' + documentId + "&workspaceId=" + wpId, {
            dataType: 'json',
            type: 'GET',
            success: function(data) {
                addParts(data, dfd, elementsDict);
            },
            error: function() {
            }
        });
        return dfd.promise();
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

    function addParts(data, dfd, elementsDict) {
        data.sort(function(a, b) {
            var key1 = a["elementId"];
            var key2 = b["elementId"];
            if (key1 < key2) {
                return -1;
            } else if (key1 > key2) {
                return 1;
            } else {
                return 0;
            }
        });

        var prevElementId = null;
        var partList = null;
        for (var i = 0; i < data.length; ++i) {
            var elementId = data[i]["elementId"];
            var partId = data[i]["partId"];
            var docId = $("#doc-select").val();
            var wpId = $("#wp-select").val();
            var baseHref = "?documentId=" + docId + "&workspaceId="+wpId +"&elementId=" + elementId  + "&microversion=" + microversion;
            var href = baseHref + "&stlElementId=" +
                elementId + "&partId=" + partId;
            $("#elt-select2")
                .append(
                "<option value='" + href + "'>" + "Part -" + data[i].name + "</option>"
            )
        }
        dfd.resolve();
    }

    function createPartList(partsContainer, elementId, elementName) {
        var partListId = 'onshape-parts-' + elementId;
        partsContainer.append("<div class='panel-heading'><h3 class='panel-title'>" +
        escapeString(elementName) + "</h3></div>");
        partsContainer.append("<div class='list-group' id='" + partListId + "'></div>");
        return partListId;
    }

    function escapeString(string) {
        return string.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function TEST(){
        getCurrentMicroversion();
        var dfd = $.Deferred();
            $.ajax("/api/test",{
                type: "POST",
                dataType: "json",
                data:testCustomFeature, 
                contentType: "application/json",
                Accept:'application/vnd.onshape.v1+json',
                complete: function() {
                  //called when complete
                  console.log('TEST complete');
                },
                success: function(data) {
                   console.log('TEST success');
               },
                error: function() {
                  console.log('TEST error');
                },
              });
              return dfd.resolve();
    }
    const testCustomFeature = "{"+
        "\"feature\" : {"+
       " \"type\" : 134,"+
        "\"typeName\" : \"BTMFeature\","+
        "\"message\" : {"+
          "\"featureType\" : \"myFeature\","+
          "\"featureId\" : \"F72QEJFw4m6i2Fh_0\","+
          "\"name\" : \"Helix around the curve 1\","+
          "\"parameters\" : [ {"+
            "\"type\" : 148,"+
           " \"typeName\" : \"BTMParameterQueryList\","+
            "\"message\" : {"+
             " \"queries\" : [ {"+
               " \"type\" : 138,"+
               " \"typeName\" : \"BTMIndividualQuery\","+
                "\"message\" : {"+
                "  \"geometryIds\" : [ \"JFB\" ],"+
                  "\"hasUserCode\" : false,"+
                 " \"nodeId\" : \"FdpOUOU1jJ3DmQo\""+
               " }"+
              "} ],"+
              "\"parameterId\" : \"curve\","+
              "\"hasUserCode\" : false,"+
              "\"nodeId\" : \"JuN2B/4FU8DYaymZ\""+
            "}"+
          "}, {"+
            "\"type\" : 147,"+
            "\"typeName\" : \"BTMParameterQuantity\","+
            "\"message\" : {"+
              "\"units\" : \"\","+
             "\"value\" : 0.0,"+
             " \"expression\" : \"25 mm\","+
              "\"isInteger\" : false,"+
              "\"parameterId\" : \"radius\","+
              "\"hasUserCode\" : false,"+
              "\"nodeId\" : \"JS0zLyL8L6P4T3Ji\""+
           " }"+
         " }, {"+
            "\"type\" : 147,"+
           "\"typeName\" : \"BTMParameterQuantity\","+
            "\"message\" : {"+
              "\"units\" : \"\","+
              "\"value\" : 0.0,"+
              "\"expression\" : \"8\","+
              "\"isInteger\" : true,"+
             " \"parameterId\" : \"revolutions\","+
             "\"hasUserCode\" : false,"+
            " \"nodeId\" : \"HF+iLwj0pHP1PKDh\""+
            "}"+
          "}, {"+
            "\"type\" : 144,"+
            "\"typeName\" : \"BTMParameterBoolean\","+
           " \"message\" : {"+
             " \"value\" : false,"+
             " \"parameterId\" : \"isConnected\","+
             " \"hasUserCode\" : false,"+
              "\"nodeId\" : \"nWtVxCim6s0MGa+g\""+
            "}"+
         " } ],"+
          "\"suppressed\" : false,"+
          "\"namespace\" : \"ed1399b3f2457d65abf1c8426::m305a547f9d5ccdefeccc3ed5\","+
          "\"subFeatures\" : [ ],"+
          "\"returnAfterSubfeatures\" : false,"+
          "\"suppressionState\" : {"+
          "\"type\" : 0"+
         " },"+
        "  \"hasUserCode\" : false,"+
          "\"nodeId\" : \"MKfAioS6LKOPwpQfJ\""+
       " }"+
      "},"+
      "\"serializationVersion\": \"1.1.17\","+
      "\"sourceMicroversion\": \"" + microversion + "\","+
      "\"rejectMicroversionSkew\": \"false\""+
    "}"


  const test = "{"+
    "\"feature\" : { "+
      "\"type\" : 151,"+
      "\"typeName\" : \"BTMSketch\","+
      "\"message\" : {"+
        "\"entities\" : [ {"+
          "\"type\" : 155,"+
          "\"typeName\" : \"BTMSketchCurveSegment\","+
          "\"message\" : {"+
            "\"startPointId\" : \"SJimSiEbabpU.start\","+
            "\"endPointId\" : \"SJimSiEbabpU.end\","+
            "\"startParam\" : -0.09218808589015998,"+
            "\"endParam\" : 0.09218808589015998,"+
            "\"geometry\" : {"+
              "\"type\" : 117,"+
              "\"typeName\" : \"BTCurveGeometryLine\","+
              "\"message\" : {"+
                "\"pntX\" : -3.650076687335968E-4,"+
                "\"pntY\" : -2.73754820227623E-4,"+
                "\"dirX\" : 0.8067195748569134,"+
                "\"dirY\" : 0.5909344528310063"+
              "}"+
            "},"+
            "\"centerId\" : \"\","+
            "\"internalIds\" : [ ],"+
            "\"isConstruction\" : false,"+
            "\"parameters\" : [ ],"+
            "\"entityId\" : \"SJimSiEbabpU\","+
            "\"namespace\" : \"\","+
           " \"hasUserCode\" : false,"+
            "\"nodeId\" : \"MIrVwtX4VQmu7hpAA\""+
          "}"+
        "} ],"+
        "\"constraints\" : [ ],"+
        "\"featureType\" : \"newSketch\","+
       " \"featureId\" : \"FJlHrPjfK8YfWLg_0\","+
        "\"name\" : \"Sketch 1\","+
        "\"parameters\" : [ {"+
         " \"type\" : 148,"+
          "\"typeName\" : \"BTMParameterQueryList\","+
          "\"message\" : {"+
            "\"queries\" : [ {"+
              "\"type\" : 138,"+
              "\"typeName\" : \"BTMIndividualQuery\","+
              "\"message\" : {"+
               " \"geometryIds\" : [ \"JDC\" ],"+
                "\"hasUserCode\" : false,"+
               " \"nodeId\" : \"FA7j8HjzCZKYSBL\""+
              "}"+
           " } ],"+
            "\"parameterId\" : \"sketchPlane\","+
           " \"hasUserCode\" : false,"+
            "\"nodeId\" : \"YwiOmlzeyd6lZsWJ\""+
          "}"+
        "} ],"+
        "\"suppressed\" : false,"+
       " \"namespace\" : \"\","+
       " \"subFeatures\" : [ ],"+
        "\"returnAfterSubfeatures\" : false,"+
        "\"suppressionState\" : {"+
          "\"type\" : 0"+
        "},"+
        "\"hasUserCode\" : false,"+
        "\"nodeId\" : \"MRtw3M4XBiUCvFCJ5\""+
      "}"+
    "},"+
   " \"serializationVersion\": \"1.1.17\","+
   " \"sourceMicroversion\": \"052c2be70b18c78ff91f4bec\","+
   " \"rejectMicroversionSkew\": \"false\""+
  "}";
})();
