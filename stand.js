Constructor = function(){
	for(var io in this){
		if(isArray(this[io])) this[io] = this[io].clone();
		if(isObject(this[io])) this[io] = clone({},this[io]);
		this[io] = this[io];
	}
};

if(typeof(JSON)!="undefined"){
  if(typeof(JSON.parse) !="undefined")
    JSON.decode = JSON.parse;
  if(typeof(JSON.stringify) !="undefined")
    JSON.encode = JSON.stringify;
}


/**
 * создает объект ERROR для работы с ошибками<br/>
 * формат объекта ошибки, с которой работает = {@link ERROR#_Error Error}
 * @class ERROR
 * @singleton
 */
ERROR = new function(){
	/**
	 * @property {Array} errors массив всех произошедших ошибок
	 * @private
	 */
	var self = this
      ,errors=[]
      ,_fw = (typeof(Ext)!='undefined'? Ext : {})
      ,SITE_URL = ''
      ,LOG = (typeof(LOG)!="undefined" ? LOG : {ds:{getValue:function(){},setValue:function(){}},show:function(){alert('Окна ошибок нет');}})
      ,JSON = (typeof(JSON)!="undefined" ? JSON : {encode:function(o){return o;}})
      ,Ajax = (typeof(Ajax)!="undefined" ? Ajax : {request:function(){}})
  ;
  
  /**
   * производит реинициализацию этого объекта согласно конфига
   * @member ERROR
   * @method reinit
   * @param [config] <ul>
   *      <li><b>SITE_URL</b> url</li>
   *      <li><b>JSON</b> набор утилит JSON</li>
   *      <li><b>Ajax</b> набор утилит для отправки Ajax-запросов</li>
   *      <li><b>fw</b> FrameWork для работы с окнами используемый в системе (ExtJS, jQuery-UI, YUI...)</li>
   *      <li><b>LOG</b> Лог, куда можно скидывать ошибки (системный)</li>
   *   </ul>
   */
  this.reinit = function(config){
    config = (config||{});
    _fw = (config.fw || Ext || _fw);
    SITE_URL = (config.SITE_URL || SITE_URL);
    LOG = (config.LOG || window.LOG || LOG);
		JSON = (config.JSON || (_fw.util? _fw.util.JSON : window.JSON) || JSON);
    Ajax = (config.Ajax || _fw.Ajax || window.Ajax || Ajax);

		LOG.ds.setValue(JSON.encode(errors) + "\r\n")
  };

  
  /**
   * из объекта Ошибки вытаскивает сообщение и возвращает модицифированное сообщение согласно возможностям пользователя
   *   (в DEBUG режиме выводит почти всю инфу об ошибке
   * @private
   * @method {String} _debugModeMsg
   * @member ERROR
   * @param {{code: number, message: string, userMsg: string, file: string, line: number, function: string, stack: string}} e
   */
  function _debugModeMsg(e){
    var msg = e.userMsg || e.message || ' Возникла непредвиденная ошибка ';
    if(DEBUG) msg = "file: "+ e.file +"; line: "+ e.line +"; function: "+ e['function'] +"; msg: "+ e.message +"; stack: "+ e.stack;
    return msg
  }
  /**
   * производит валидацию объекта Ошибки для исключения ошибок внутри ошибки
   * возвращает объект ошибки
   * @param {Error} [e]
   * @private
   * @class ERROR._Error
	 * @extends Error
   * @member ERROR
   */
  var _Error = function(e){
    e= (e|| new Error());
	  /**
	   *    @cfg {Number} [code=0]
	   */
	  e.code = (e.code||e.number||0);
	  /**
	   *    @cfg {String} [message]
	   */
	  e.message = (e.message||'');
	  /**
	   *    @cfg {String} [userMsg]
	   */
	  e.userMsg = (e.userMsg||''); // (e.userMsg? e.userMsg : e.message);
	  /**
	   *    @cfg {String} [file]
	   */
	  e.file = e.file||'';
	  /**
	   *    @cfg {Number} [line=0]
	   */
	  e.line = e.line||0;
	  /**
	   *    @cfg {String} [function]
	   */
	  e['function'] = e['function']||'';
	  /**
	   *    @cfg {String} [stack]
	   */
	  e.stack = (e.stack||''); //TODO: вставить формирование stack с помощью StackTrace.JS
    
    return e;
  };
    
  
  /**
   * отправка ошибки на сервер
   * @param {Object} e объект ошибки
   * @method send
   * @member ERROR
   */
  this.send = function(e){
    var f=0;
    function timeRuner(){ window.setTimeout( run, 3000 ) }
    function run(){
      if(f++ >3){ return; }
      Ajax.request({
        url: SITE_URL
        ,params: e
        ,failure: timeRuner
      })
    }
    run()
  };
  /**
   * добавляет объект Ошибки в массив ошибок
	 * @member ERROR
   * @method add
   */
  this.add= function(e){
    errors.push(new _Error(e))
    
    LOG.ds.setValue(LOG.ds.getValue() + "-------------\r\n"+ JSON.encode(e) + "\r\n")
    if(typeof(DEBUG_LOG)!="undefined" && DEBUG_LOG) self.send(e)
  };
  /**
   * возвращает последнюю ошибку
   * @method {_Error} getLastError
	 * @member ERROR
   */
  this.getLastError= function(){
    var last = (errors.length? (errors.length-1) : 0);
    return (errors[last]|| new _Error());
  };
	/**
	 * возвращает сообщение в первую очередь приятное для пользователя
	 * **Note** Если включен режим отладки DEBUG=true, ТО будет выведен еще и стэк
	 * @member ERROR
	 * @method {String} getLastMessage
	 */
	this.getLastMessage = function(){
		return _debugModeMsg(self.getLastError());
	};
  /**
   * выводит сообщение с текстом указанного объекта Ошибки
	 * @method show
   * @member ERROR
   */
  this.show = function(e){
    var msg = _debugModeMsg(new _Error(e));
    
    if(_fw && _fw.Msg){
      _fw.Msg.show({ title:"Внимание"
        ,msg: msg
        ,icon: _fw.Msg.ERROR
        ,buttons: _fw.Msg.OK
      })
    }else{
      alert(msg);
    }
  };
  
  /*
   * навешивает обработчик на событие глобальной ошибки, для добавления ее в лог
   * (!)arguments брался из IE9,10. Работает не во всех браузерах.
   */
  window.onerror = function(){
    var e = {
      message: arguments[0]
      ,file: arguments[1]
      ,line: arguments[2]
    };
	  //TODO: вставить формирование stack с помощью StackTrace.JS
    self.add(e);
  };
  
  return this;
};
