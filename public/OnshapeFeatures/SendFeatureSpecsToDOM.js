//form type = text
let contentDiv = $('#configContent');
function GetBTMParameterQuantity(parameter, iteration){
    let currentFeature;
    currentFeature.parameterName = parameter.message.parameterName;
    currentFeature.defaultValue = parameter.message.defaultValue.message.value;
    currentFeature.units = parameter.message.defaultValue.message.units;

    console.log(currentFeature);

    $('<div>').appendTo(contentDiv);
    $('<label for="first-input-test' + iteration + '">' + currentFeature.parameterName + '</label>').appendTo(contentDiv);

    $('<p><input class="inputValues" style="border-top: none; border-left: none; border-right: none; border-bottom: 1px solid dimgray;" type="number" value= "' + currentFeature.defaultValue + '" type="number" step="0.001" id="first-input-test' + iteration + '"> <label id="first-input-label' + i + '">' + currentFeature.units + '</label> </p>').appendTo(contentDiv);

    $('</div>').appendTo(contentDiv);
}

//select
function GetBTMParameterQueryList(parameter, iteration){
    let currentFeature;
    currentFeature.parameterName = parameter.message.parameterName;

    console.log(currentFeature);

    $('<div>').appendTo(contentDiv);
    $('<p><strong >' + currentFeature.parameterName + '</strong><br>').appendTo(contentDiv);

    $('<select class="form-control" id="feature-queries-select' + iteration + '"></select>').appendTo(contentDiv);

    $('</div>').appendTo(contentDiv);

}

//select
function GetBTMParameterEnum(parameter, iteration){
    let currentFeature;
    currentFeature.optionNames = parameter.message.optionNames;
    currentFeature.parameterName = parameter.message.parameterName;

    console.log(currentFeature);

    $('<div>').appendTo(contentDiv);
    $('<p><strong >' + currentFeature.parameterName + '</strong><br>').appendTo(contentDiv);

    $('<select class="form-control" id="feature-enums-select' + iteration + '"></select>').appendTo(contentDiv);

    currentFeature.optionNames.forEach(option => {

        $("#elt-select2")
        .append(
            "<option value='" + option + "'>" + "Element - " + option + "</option>"
        )
    });

    $('</div>').appendTo(contentDiv);
}

//checkbox
function GeBTMParameterBoolean(parameter, iteration){
    let currentFeature;
    currentFeature.parameterName = parameter.message.parameterName;

    console.log(currentFeature);

    $('<div>').appendTo(contentDiv);
    $('<p><input class="inputValues" type="checkbox" class="custom-control-input" id="first-input-test' + iteration + '" >' + currentFeature.parameterName + ' </p>').appendTo(contentDiv);
    $('<div>').appendTo(contentDiv);
}

function SortParameters(paramArray){
    let iteration;
    paramArray.forEach(parameter => {
        if (parameter.type === 173){
            GetBTMParameterQuantity(parameter, iteration);
        }
        else if (parameter.type === 170){
            GeBTMParameterBoolean(parameter, iteration);
        }
        else if (parameter.type === 171){
            GetBTMParameterEnum(parameter, iteration);
        }
        else if (parameter.type === 174){
            GetBTMParameterQueryList(parameter, iteration);
        }
        iteration++;
    });
}