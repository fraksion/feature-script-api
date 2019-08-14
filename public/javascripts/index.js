(function () {

    let microversion;
    let featureStudios = [];
    var features;
    let sketches = [];
    let customFeatures = [];


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

        $('#create-feature-submit').click(()=>{
            createFeatureStudio();
        })

        $('#elt-select2').change(function () {
            features = [];
            $('#stl-progress-bar').css("display", "block");

            $('#feature-parameters').empty();
            $("#sketch-select").empty();
            $('#configDiv').css("display", "none");
            $('#config-btn').css("display", "none");
            getCurrentMicroversion();
            $('#stl-tolerance-modal').modal('hide');
            //getFeaturesList();
            
        });

        $('#doc-select').change(function () {

            var selectedDocID = $("#doc-select").val();
            sketches = [];
            $('#feature-parameters').empty();
            $("#wp-select").empty();
            $("#sketch-select").empty();
            $('#configDiv').css("display", "none");
            $('#config-btn').css("display", "none");
            $("#elt-select2").empty();
            $("#elt-select2").append("<option>-- Top of List --</option>");
            $("#wp-select").append("<option>-- Top of List --</option>");
            $('#add-feature-btn').css("display", "none");
            getWorkplaces(selectedDocID);
            // getCurrentMicroversion();
        });

        $('#wp-select').change(function () {
            sketches = [];
            $('#feature-parameters').empty();
            $('#configDiv').css("display", "none");
            $('#config-btn').css("display", "none");
            $("#sketch-select").empty();
            $("#elt-select2").empty();
            $("#elt-select2").append("<option>-- Top of List --</option>");
            $('#add-feature-btn').css("display", "none");
            getElements();
            getCurrentMicroversion();
        });

        init();
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
        featureStudios = [];
        var onshapeElements = $("#onshape-elements");
        onshapeElements.empty();
        for (var i = 0; i < data.length; ++i) {
            console.log(data[i].elementType);
            if (data[i].elementType === "PARTSTUDIO") {
                // URL must contain query string!
                // (Query string contains document and workspace information)
                var docId = $("#doc-select").val();
                var wpId = $("#wp-select").val();
                var href = "?documentId=" + docId + "&workspaceId=" + wpId + "&elementId=" + data[i].id + "&microversion=" + microversion;
                $("#elt-select2")
                    .append(
                        "<option value='" + href + "'>" + "Element - " + data[i].name + "</option>"
                    )
            }
            else if (data[i].elementType === "FEATURESTUDIO"){
                console.log(data[i]);
                var docId = $("#doc-select").val();
                var wpId = $("#wp-select").val();
                var href = "?documentId=" + docId + "&workspaceId=" + wpId + "&elementId=" + data[i].id;
                featureStudios.push(href);
            }
        }
        dfd.resolve();
        elementsDict = createElementsDict(data);
        featureStudios.forEach(studio => {
            getFeatureStudioSpecs(studio);
        });
        dfd.resolve();
    }

    function createElementsDict(elementsArray) {
        dict = {};
        for (var i = 0; i < elementsArray.length; ++i) {
            dict[elementsArray[i]["id"]] = elementsArray[i];
        }
        return dict;
    }

    function getFeatureStudioSpecs(href) {
        customFeatures = [];
        var dfd = $.Deferred();
        $.ajax('/api/featureStudioSpecs' + href, {
            dataType: 'json',
            type: 'GET',
            contentType: "application/json",
            Accept: 'application/vnd.onshape.v1+json',
            success: function (data) {
                addCustomFeature(data, dfd);
            },
            error: function () {
                console.log('getFeatureStudioSpecs error');
            }
        });
        return dfd.promise();
    }

    function addCustomFeature(data, dfd){
        for (let i=0; i< data.featureSpecs.length; i++){
            let feature = {
                name : data.featureSpecs[i].message.featureTypeName,
                parameters:  data.featureSpecs[i].message.parameters,
                serializationVersion: data.serializationVersion,
                sourceMicroversion: data.sourceMicroversion,
                rejectMicroversionSkew: data.rejectMicroversionSkew
            }
            console.log(feature);
            addCustomFeaturesToBOM(feature);
            customFeatures.push(feature);
        }
        dfd.resolve();
    }

    function addCustomFeaturesToBOM(customFeatures){
            $("#feature-select")
            .append(
                "<option class=\"my-feature\" value='" + customFeatures.name + "'>"  + customFeatures.name + "</option>"
            )
    }

    function sendCustomFeature(body) {
        var dfd = $.Deferred();
        $.ajax("/api/addCustomFeature" + $('#elt-select2').val(), {
            type: "POST",
            dataType: "json",
            data: JSON.stringify(body),
            contentType: "application/json",
            Accept: 'application/vnd.onshape.v1+json',
            complete: function () {
            },
            success: function (data) {
            },
            error: function () {
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
        $('#stl-progress-bar').css("display", "none");
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

    function getFeatureJSON(microversion, feature) {
        let body = {
            feature: feature,
            serializationVersion: "1.1.17",
            sourceMicroversion: microversion,
            rejectMicroversionSkew: false
        };
        return body;
    }

    
    function createFeatureStudio() {
        var dfd = $.Deferred();
        let body = { name: $('#feature-studio-name').val()};
        console.log($('#feature-studio-name').val());
        var documentId = $("#doc-select").val();
        var wpId = $("#wp-select").val();
        $.ajax("/api/createFeatureStudio?documentId=" + documentId + "&workspaceId=" + wpId, {
            type: "POST",
            dataType: "json",
            data: JSON.stringify(body),
            contentType: "application/json",
            Accept: 'application/vnd.onshape.v1+json',
            complete: function () {
            },
            success: function (data) {
                getElements();
                console.log('createFeatureStudio content: ')
                let newFeature;
                let customFeatures = document.getElementsByClassName('my-feature');
                console.log(customFeatures[0].option);
                customFeatures.filter(customFeature=>customFeature.option.innerText === data.name);

            },
            error: function () {
            },
        });
        return dfd.resolve();
    }

})();
