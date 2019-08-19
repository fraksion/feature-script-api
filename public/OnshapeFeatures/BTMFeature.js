class BTMFeature{
    constructor(name, parameters, documentId, versionId, elementId, microversionId){
        this.type = 134;
        this.typeName = "BTMFeature",
        this.message.featureType = "myFeature";
        this.message.featureId = "";
        this.message.nodeId = "";
        this.message.name = name;
        this.message.namespace = `d${documentId}::v${versionId}::e${elementId}::m${microversionId}`;
        this.message.parameters = parameters;
    }
}
