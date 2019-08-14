class ParameterMessageBase{
    constructor(parameterId, hasUserCode, nodeId){
        this.parameterId = parameterId;
        this.hasUserCode = hasUserCode;
        this.nodeId = nodeId;
    }

    get parameterId() {
        return this._parameterId;
      }
    
      set parameterId(param) {
        this._parameterId = param;
      }

      get hasUserCode() {
        return this._hasUserCode;
      }
    
      set hasUserCode(param) {
        this._hasUserCode = param;
      }

      get nodeId() {
        return this._nodeId;
      }
    
      set nodeId(param) {
        this._nodeId = param;
      }
}

class BTMParameterBooleanMessage extends ParameterMessageBase{
    constructor(parameterId, hasUserCode, nodeId, value){ 
        super(parameterId, hasUserCode, nodeId);
        this.value = value;
    }

    get value() {
        return this._value;
      }
    
      set value(param) {
        this._value = param;
      }
}

 class BTMParameterFeatureList extends ParameterMessageBase
{
    constructor(parameterId, hasUserCode, nodeId, featureIds){
        super(parameterId, hasUserCode, nodeId);
        this.featureIds = featureIds;
    }
    
    get featureIds() {
        return this._featureIds;
      }
    
      set featureIds(param) {
        this._featureIds = param;
      }
}

class BTMParameterEnumMessage extends ParameterMessageBase{
    constructor(parameterId, hasUserCode, nodeId, value, enumName){ 
        super(parameterId, hasUserCode, nodeId);
        this.value = value;
        this.enumName = enumName;
    }

    get value() {
        return this._value;
      }
    
      set value(param) {
        this._value = param;
      }

      get enumName() {
        return this._enumName;
      }
    
      set enumName(param) {
        this._enumName = param;
      }
}

class BTMParameterArray extends ParameterMessageBase
{
    constructor(parameterId, hasUserCode, nodeId, items){
        super(parameterId, hasUserCode, nodeId);
        this.items = items;
    }
    
    get items() {
        return this._items;
      }
    
      set items(param) {
        this._items = param;
      }
}

let featureTypeId = {
    BTMSketch : 151,
    BTMFeature : 134,
    BTMIndividualQuery : 138,
    BTMIndividualSketchRegionQuery : 140,
    BTMIndividualCoEdgeQuery : 1332,
    BTMSketchConstraint : 2,
    BTMSketchPoint : 158,
    BTMSketchCurve : 4,
    BTMSketchCurveSegment : 155,

    BTCurveGeometryEllipse : 1189,
    BTCurveGeometryCircle : 115,
    BTCurveGeometryInterpolatedSpline : 116,
    BTCurveGeometryLine : 117,
    BTCurveGeometryConic : 2284,

    BTMParameterBoolean : 144,
    BTMParameterEnum : 145,
    BTMParameterQueryList : 148,
    BTMParameterQuantity : 147,
    BTMParameterString : 149,
    BTMParameterLookupTablePath : 1419,

    BTMParameterFeatureList : 1749,
    BTMParameterArray : 2025,
    BTFSValueArray : 1499,
    BTFSValueString : 1422,
    BTFSValueMap : 2062,
    BTFSValueMapEntry : 2077,
    BTFSValueNumber : 772
}
