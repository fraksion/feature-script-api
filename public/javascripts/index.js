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
            getFeaturesList();
            getCurrentMicroversion();
        });
        
        $('#feature-select').change(function(){
            addFeatureParameters();
        })

        init();
        //loadStl(-1, -1);

    }

    function init() {

        $("#elt-select2").append("<option>-- Top of List --</option>");
        $("#doc-select").append("<option>-- Top of List --</option>");
        $("#wp-select").append("<option>-- Top of List --</option>");
        getDocuments();
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
