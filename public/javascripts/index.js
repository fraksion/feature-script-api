(function () {

    let microversion;
    let featureStudios = [];
    var features;
    let sketches = [];
    let customFeatures = [];
    let lastCreatedFeature;
    let lastCreatedFeatureContent;


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

        $('#create-feature-submit').click(async () => {
            await createFeatureStudio();

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

        $('#doc-select').change(async function () {

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
            await getWorkplaces(selectedDocID);
            // getCurrentMicroversion();
        });

        $('#wp-select').change(async function () {
            sketches = [];
            $('#feature-parameters').empty();
            $('#configDiv').css("display", "none");
            $('#config-btn').css("display", "none");
            $("#sketch-select").empty();
            $("#elt-select2").empty();
            $("#elt-select2").append("<option>-- Top of List --</option>");
            $('#add-feature-btn').css("display", "none");
            await getElements();
            getCurrentMicroversion();
        });

        init();
    }

    async function init() {

        $("#elt-select2").append("<option>-- Top of List --</option>");
        $("#doc-select").append("<option>-- Top of List --</option>");
        $("#wp-select").append("<option>-- Top of List --</option>");
        await getDocuments();

    }

    // Functions to support loading list of models to view ...
    async function getElements() {
        var documentId = $("#doc-select").val();
        var wpId = $("#wp-select").val();

        let response = await fetch('/api/elements?documentId=' + documentId + "&workspaceId=" + wpId);
        let result = await response.json();
        addElements(result);
    }

    async function getWorkplaces(docId) {
        let response = await fetch('/api/workplaces?documentId=' + docId);
        let result = await response.json();
        addWorkplaces(result);
    }

    async function getCurrentMicroversion() {
        var documentId = $("#doc-select").val();
        var wpId = $("#wp-select").val();
        let response = await fetch('/api/microversion?documentId=' + documentId + "&workspaceId=" + wpId);
        let result = await response.json();
        microversion = result.microversion;
    }

    function addWorkplaces(data) {
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
    }

    async function getDocuments() {
        let response = await fetch('/api/documents');
        let result = await response.json();
        addDocuments(result);
    }

    function addDocuments(data) {
        var onshapeElements = $("#onshape-elements");
        onshapeElements.empty();
        for (var i = 0; i < data.items.length; ++i) {
            $("#doc-select")
                .append(
                    "<option value='" + data.items[i].id + "'>" + " " + data.items[i].name + "</option>"
                )
        }
    }

    async function addElements(data) {
        featureStudios = [];
        var onshapeElements = $("#onshape-elements");
        onshapeElements.empty();
        for (var i = 0; i < data.length; ++i) {
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
            else if (data[i].elementType === "FEATURESTUDIO") {
                var docId = $("#doc-select").val();
                var wpId = $("#wp-select").val();
                var href = "?documentId=" + docId + "&workspaceId=" + wpId + "&elementId=" + data[i].id;
                featureStudios.push(href);
            }
        }
        elementsDict = createElementsDict(data);
        featureStudios.forEach(async (studio) => {
            await getFeatureStudioSpecs(studio);
        });
    }

    function createElementsDict(elementsArray) {
        dict = {};
        for (var i = 0; i < elementsArray.length; ++i) {
            dict[elementsArray[i]["id"]] = elementsArray[i];
        }
        return dict;
    }

    async function getFeatureStudioSpecs(href) {
        customFeatures = [];
        let response = await fetch('/api/featureStudioSpecs' + href);
        let result = await response.json();
        addCustomFeature(result);
    }

    function addCustomFeature(data) {
        for (let i = 0; i < data.featureSpecs.length; i++) {
            let feature = {
                name: data.featureSpecs[i].message.featureTypeName,
                parameters: data.featureSpecs[i].message.parameters,
                serializationVersion: data.serializationVersion,
                sourceMicroversion: data.sourceMicroversion,
                rejectMicroversionSkew: data.rejectMicroversionSkew
            }
            addCustomFeaturesToBOM(feature);
            customFeatures.push(feature);
        }
    }

    function addCustomFeaturesToBOM(customFeatures) {
        $("#feature-select")
            .append(
                "<option class=\"my-feature\" value='" + customFeatures.name + "'>" + customFeatures.name + "</option>"
            )
    }

    async function sendCustomFeature(body) {

        let response = await fetch("/api/addCustomFeature" + $('#elt-select2').val(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(body)
        });
        let data = await response.json();
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


    async function createFeatureStudio() {
        let body = { name: $('#feature-studio-name').val() };
        var documentId = $("#doc-select").val();
        var wpId = $("#wp-select").val();
        let response = await fetch("/api/createFeatureStudio?documentId=" + documentId + "&workspaceId=" + wpId, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(body)
        });
        let data = await response.json();
        lastCreatedFeature = {
            microversionId: data.microversionId,
            elementId: data.id,
            serializationVersion: customFeatures[0].serializationVersion !== undefined ? customFeatures[0].serializationVersion : '1.1.17',
            microversionSkew: false
        }
        await getCurrentMicroversion();
        await updateFeatureStudioContent();
    }

    function getNewFeatureStudioContent() {
        let textarea = document.getElementById('feature-studio-content').value;
        let body = {
            contents: textarea,
            serializationVersion: lastCreatedFeature.serializationVersion,
            sourceMicroversion: microversion,
            rejectMicroversionSkew: false
        }
        return body;
    }

    async function updateFeatureStudioContent() {
        let body = getNewFeatureStudioContent();
        var documentId = $("#doc-select").val();
        var wpId = $("#wp-select").val();

        let response = await fetch("/api/updateFeatureStudio?documentId=" + documentId + "&workspaceId=" + wpId + "&elementId=" + lastCreatedFeature.elementId, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.onshape.v1+json'
            },
            body: JSON.stringify(body)
        });
        //let data = await response.json();
        $('#feature-select').empty();
        await getElements();

    }
})();
