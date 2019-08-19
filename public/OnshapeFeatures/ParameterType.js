class ParameterBase{
    constructor(parameterId, hasUserCode, nodeId){
        this.message.parameterId = parameterId;
        this.message.hasUserCode = hasUserCode;
        this.message.nodeId = nodeId;
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

class BTMParameterBoolean extends ParameterBase{
    constructor(parameterId, hasUserCode, nodeId, value){ 
        super(parameterId, hasUserCode, nodeId);
        this.type = 144;
        this.typeName = 'BTMParameterBoolean' ;
        this.message.value = value;
    }

    get value() {
        return this._value;
      }
    
      set value(param) {
        this._value = param;
      }
}

class BTMParameterEnum extends ParameterBase{
    constructor(parameterId, hasUserCode, nodeId, value, enumName){ 
        super(parameterId, hasUserCode, nodeId);
        this.type = 145;
        this.typeName = 'BTMParameterEnum' ;
        this.message.value = value;
        this.message.enumName = enumName;
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

class BTMParameterQueryList  extends ParameterBase
{
    constructor(parameterId, hasUserCode, nodeId, queries ){
        super(parameterId, hasUserCode, nodeId);
        this.type = 148;
        this.typeName = 'BTMParameterQueryList' ;
        this.message.queries  = queries ;
    }
    
    get queries () {
        return this._items;
      }
    
      set queries (param) {
        this._items = param;
      }
}

class BTMParameterQuantity  extends ParameterBase
{
    constructor(parameterId, hasUserCode, nodeId, expression ){
        super(parameterId, hasUserCode, nodeId);
        this.type = 147;
        this.typeName = 'BTMParameterQuantity';
        this.message.expression   = expression ;
    }
    
    get expression () {
        return this._items;
      }
    
      set expression (param) {
        this._items = param;
      }
}

