/*
 JSXML
  start 0.2.2 (2012-07-18)
 {@link http://JSXML.net/ }

 JavaScript XML/XSLT Library

 Copyright (c) 2007-2012, Anton Zorko
 All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:
 * Redistributions of source code must retain the above copyright
 notice, this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright
 notice, this list of conditions and the following disclaimer in the
 documentation and/or other materials provided with the distribution.
 * Neither the name of the <organization> nor the
 names of its contributors may be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
 DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * для работы с XML,XSLT + трансформация в результирующий DOM
 * @class JSXML
 * @singleton
 * Demo:<ul>
 * <li/> Loading an XML string into DOM and converting DOM back to XML string
 * @example <pre>
 *   var dom = JSXML.fromString('<?xml version="1.0" encoding="UTF-8"?><root/>'),
 *   child = dom.createElement('child');
 *   child.setAttribute('foo', 'bar');
 *   dom.documentElement.appendChild(child);
 *   alert(JSXML.toXml(dom));
 * </pre>
 *
 * <li/> Loading anything into DOM and doing something with it
 * @example <pre>
 *   JSXML.fromFile('xml.xml', function(dom){
 *   	var child = dom.createElement('child');
 *   	child.setAttribute('foo', 'bar');
 *   	dom.documentElement.appendChild(child);
 *   	alert(JSXML.toXml(dom));
 *   });
 *   // OR
 *   JSXML.load(source, function(dom){
 *   	// doing something here
 *   });
 * </pre>
 *
 * <li/> Transforming an XML with an XSLT
 * @example <pre>
 *   var resultString = JSXML.transReady(xml, xsl);
 *   // OR
 *   JSXML.trans(xmlSource, xslSource, function(resultString){
 *   	// doing something here
 *   });
 * </pre>
 * </ul>
 *
 * @cfg {Object} [context=window] The host object to hold the JSXML object;
 * @cfg {String} [name='JSXML'] Key to access the JSXML object;
 * @cfg {Boolean} [file_cache=true] — whether to cache DOM objects from retrieved XML files and use them next time the same file is called;
 * @cfg {'alert'|'throw'} [errors='alert'] How to behave in case an error occurred (broken XML, invalid XSLT etc.).
 */
(function(cfg){
	var defaults = {
		context: window,
		name: 'JSXML',
		file_cache: true,
		errors: 'alert' // throw, ignore
	};
	if (!cfg) cfg = {};
	for (var i in defaults)
		if (cfg[i]) defaults[i] = cfg[i];
	cfg = defaults;

	// conveyor is used to build and execute callback chains
	var conveyor = function(cb){
		if (cb) this.cb = cb;
		this.tasks = [];
	};
	conveyor.prototype.add = function(task){
		this.tasks.push(task);
	};
	conveyor.prototype.exe = function(i){
		if (typeof(i) == 'function') {
			this.cb = i;
			i = 0;
		}
		i = i ? i : 0;
		var $this = this;
		if (this.tasks.length > i) this.tasks[i](function(){
			$this.exe(i+1);
		}); else if (typeof(this.cb) == 'function') this.cb();
	};

	// -----[ PROTECTED functions ]-----
	function _isA(v){
		return v && typeof v.length == "number" && typeof v.splice == "function";
	}
	/**
	 * выводит сообщение об ошибке или создает исключение
	 * @param {String} msg
	 * @param {Error} e
	 * @private
	 */
	function _throw(msg,e){
		var sourceAppName = 'JSXML';
		if(!e){
			e={
				message: msg
				,file:'jsxml.js'
				,'function':sourceAppName
			};
		}
		ERROR.add(e)
		switch (cfg.errors) {
			case 'alert':
				if(msg) alert(sourceAppName + ":\r\n" + msg)
					else ERROR.show(e)
				break;
			case 'throw':
				if(msg) throw new Error(sourceAppName + ":\r\n" + msg)
					else throw e
				break;
		}
	}
	function _borrowRootName(names){
		return names ? ( _isA(names) ? names.shift() : names ) : 'root';
	}
	var _ajax= null;
	// ===============================
	
	
	var lib = function(){Constructor.call(this)};
	lib.prototype = {
		/**
		 * Ajax запрос формирует
		 * @param {Object} cfg конфиг запроса
		 */
		ajax: function(cfg){
			if (_ajax === null) {
				if (window.jQuery) {
					_ajax = jQuery.ajax;
				} else if (window.Ext && window.Ext.Ajax) { // ExtJS
					_ajax = function(cfg){
						Ext.Ajax.request({
							url: cfg.url,
							success: function(x){
								cfg.success(x.responseXML);
							},
							failure: cfg.error
						});
					};
				} else if (window.Ajax && Ajax.Request) { // Prototype
					_ajax = function(cfg){
						new Ajax.Request(cfg.url, {
							method:'get',
							onSuccess: function(x){
								cfg.success(x.responseXML);
							},
							onFailure: cfg.error,
							onException: function(r, e) {
								cfg.error(e);
							}
						});
					};
				} else if (window.YAHOO) { // YAHOO
					_ajax = function(cfg){
						YAHOO.util.Connect.asyncRequest('GET', cfg.url, {
							success: function(x){
								cfg.success(x.responseXML);
							},
							failure: cfg.error
						});
					};
				} else {
					_ajax = false;
				}
			} else if(window.Ajax) {
				_ajax = function(cfg){
					Ajax.request({
						url: cfg.url,
						success: function(x){
							cfg.success(x.responseXML);
						},
						failure: cfg.error
					});
				};
			}
			if (_ajax) {
				try {
					_ajax(cfg);
				} catch (e) {
					cfg.error(e);
				}
			} else _throw(this.lng.noajax);
		},

		/**
		 * The following two pieces of code are taken from http://www.alistapart.com/articles/crossbrowserscripting
		 * @const nodeTypes
		 * @property {Object} nodeTypes
		 * @static
		 * @member JSXML
		 */
		nodeTypes: {
			ELEMENT_NODE: 1,
			ATTRIBUTE_NODE: 2,
			TEXT_NODE: 3,
			CDATA_SECTION_NODE: 4,
			ENTITY_REFERENCE_NODE: 5,
			ENTITY_NODE: 6,
			PROCESSING_INSTRUCTION_NODE: 7,
			COMMENT_NODE: 8,
			DOCUMENT_NODE: 9,
			DOCUMENT_TYPE_NODE: 10,
			DOCUMENT_FRAGMENT_NODE: 11,
			NOTATION_NODE: 12
		},

		/**
		 * ...
		 * @param document
		 * @param node
		 * @param allChildren
		 * @returns {Element|Text}
		 * @method importNode
		 * @member JSXML
		 */
		importNode: function(document, node, allChildren) {
			var result;
			/* find the node type to import */
			switch (node.nodeType) {
				case this.nodeTypes.ELEMENT_NODE:
					/* create a new element */
					var newNode = document.createElement(node.nodeName);
					/* does the node have any attributes to add? */
					if (node.attributes && node.attributes.length > 0)
					/* add all of the attributes */
						for (var i = 0, il = node.attributes.length; i < il;)
							newNode.setAttribute(node.attributes[i].nodeName, node.getAttribute(node.attributes[i++].nodeName));
					/* are we going after children too, and does the node have any? */
					if (allChildren && node.childNodes && node.childNodes.length > 0)
					/* recursively get all of the child nodes */
						for (var i = 0, il = node.childNodes.length; i < il;)
							newNode.appendChild(this.importNode(document, node.childNodes[i++], allChildren));
					result = newNode;
					break;
				case this.nodeTypes.TEXT_NODE:
				case this.nodeTypes.CDATA_SECTION_NODE:
				case this.nodeTypes.COMMENT_NODE:
					result = document.createTextNode(node.nodeValue);
					break;
			}
			return result
		},

		/**
		 * создает XML-документ
		 * @param [node]
		 * @returns {XMLDocument}
		 */
		newDoc: function(node){
			function _createElement(){
				var res;
				var xml = document.createElement('xml');
				xml.src = '<?xml version="1.0" encoding="UTF-8"?>';
				document.body.appendChild(xml);
				res = xml.XMLDocument;
				document.body.removeChild(xml);
				return res
			}
			function _createActiveXObject(){
				var progIDs = [
					"Microsoft.XMLDOM",
					"Msxml2.DOMDocument.6.0",
					"Msxml2.DOMDocument.5.0",
					"Msxml2.DOMDocument.4.0",
					"Msxml2.DOMDocument.3.0",
					"MSXML2.DOMDocument",
					"MSXML.DOMDocument"
				]
				for (var i = 0; i < progIDs.length; i++) {
					try {
						return new ActiveXObject(progIDs[i]);
					} catch(e) {}
				}
				return null
			}

			var d=null;
			// create IE xml DOM without ActiveX, submitted by alfalabs.net@gmail.com
			try{
				if(typeof(ActiveXObject)!='undefined' && ActiveXObject instanceof Object){
					d = _createActiveXObject();
					if(d){
						d.async = false;
						while(d.readyState != 4) {}
					}else d= _createElement();
				}else{
					d= _createElement();
				}
			}catch(e){ ERROR.show(e) }
			if(!d){
				try{
					d= _createElement();
				}catch(e){ ERROR.show(e) }
			}
			if(!d){
				try{
					d = document.implementation.createDocument("", node && !node.tagName ? node : 'test', null);
				}catch(e){ ERROR.show(e) }
			}
			if(!d){
				try {
					d = new DOMParser();
					//d = d.parseFromString('','text/xml');
					// text/xml
					// application/xml
					// application/xhtml+xml
					// image/svg+xml
				}catch(e){ ERROR.show(e) }
			}
			if(!d){
				_throw(this.lng.broken);
				return null
			}

			if(node){
				try{
					if (typeof(ActiveXObject)!='undefined' && ActiveXObject instanceof Object) {
						if (node.tagName) {
							d.appendChild(this.importNode(d, node, true));
						} else {
							d.appendChild(d.createElement(node));
						}
					} else {
						if (node.tagName) {
							d.replaceChild(d.importNode(node, true), d.documentElement);
						}
					}
				}catch(e){ ERROR.show(e) }
			}
			return d;
		}

		/**
		 * клонирует XML
		 * @param obj
		 * @returns {XMLDocument}
		 */
		,copy: function(obj){
			return this.fromString(this.stringify(obj));
		},

		/**
		 * создает XMLDocument из строки ИЛИ объекта (XMLDocument)
		 * @param src
		 * @method fromStringOrObject
		 * @member JSXML
		 * @returns {XMLDocument}
		 */
		fromStringOrObject: function(src) {
			return this.fromObject(src) || this.fromString(src);
		}
		/**
		 * создает XMLDocument из строки
		 * @param {String} str строка содержащая тело XML
		 * @param {Boolean} [checkXmlDeclaration=true] проверять Xml декларацию?
		 * @param {String} [type='text/xml'] тип документа <ul>
		 *   <li/>text/xml
		 *   <li/>application/xml
		 *   <li/>application/xhtml+xml
		 *   <li/>image/svg+xml
		 * </ul>
		 * @method fromString
		 * @member JSXML
		 * @returns {XMLDocument}
		 */
		,fromString: function(str, checkXmlDeclaration,type) {
			//TODO: добавить создание всего xml в теле как в newDoc <test> по _createElement()
			type = type || 'text/xml';
			if (typeof(str) != 'string') return null;
			checkXmlDeclaration = (checkXmlDeclaration !== false);
			var o = null;
			if (checkXmlDeclaration && !/^<\?xml/.test(str)) return null;
			if(window.DOMParser){
				o = new DOMParser();
			}else
				o = this.newDoc();
			if(!o){
				_throw(this.lng.broken);
				return null
			}
			if('loadXML' in o){
				o.loadXML(str);
				if (!o.documentElement || (o.parseError && o.parseError.errorCode != 0)) {
					e={
						message : (o.parseError.reason +"\r\n"+ o.parseError.linepos)
						,userMsg : this.lng.broken
						,line : o.parseError.line
						,'function' : 'fromString->loadXML'
						,file : 'jsxml.js'
					};
					_throw(this.lng.broken +"\r\n"+ o.parseError.reason, e);
					return null;
				}
			}else if('load' in o){
				o.load(str);
			}else if( o instanceof DOMParser && 'parseFromString' in o && typeof str == 'string'){
				o = o.parseFromString(str, type);
				var e = (o.getElementsByTagName('parsererror') || o.documentElement.tagName=="parsererror");
				if (e.length > 0) {
					_throw(this.lng.broken +"\r\n"+ o.documentElement.textContent);
					return null;
				}
			}
			return o;
		}
		/**
		 * создает XMLDocument из Node
		 * @param {Node} el Node для создания XML
		 * @method fromString
		 * @member JSXML
		 * @returns {XMLDocument}
		 */
		,fromObject : function(el) {
			if(!el.documentElement){
				if(el.tagName){
					return this.newDoc(el);
				}
				return null;
			}
			return el;
		}

		/**
		 * подгрузка XML из файла (может ajax)
		 * @method fromFile
		 * @param file Имя файла с путем содержащего XML
		 * @param callback
		 * @param [scope]
		 * @member JSXML
		 */
		,fromFile: function(file, callback, scope) {
			var cl = this._cache_loading,
					c = this._cache,
					$this = this;
			if (cl[file]) { // i.e. the same file is currently loading
				if (cl[file] === true) cl[file] = new conveyor;
				cl[file].add(function(cb){
					callback.call(scope ? scope : c[file], c[file]);
					cb();
				});
			} else if (c[file]) {
				callback.call(scope ? scope : c[file], c[file]);
			} else {
				cl[file] = true;
				this.ajax({
					url: file,
					success: function(xml){
						if (!xml.documentElement) {
							_throw($this.lng.brokenfile + ': ' + file);
							return;
						}
						c[file] = xml;
						callback.call(scope ? scope : xml, xml);
						if (typeof(cl[file]) == 'object') cl[file].exe();
						if (cl[file]) delete cl[file];
					},
					error: function(e){
						cl[file] = false;
						if (e) {
							var m = [];
							m.push($this.lng.exception + ":\r\n" + file);
							if (e.name) m.push(e.name);
							if (e.message) m.push(e.message);
							_throw(m.join("\r\n"));
						} else _throw($this.lng.brokenfile + ': ' + file);
					}
				})
			}
		},

		/**
		 * загрузка XML с сервера или из переданной строки или из переданного XMLDocument
		 * @method load
		 * @param {String} source строка XML или XMLDocument (XML-object) или URL-адрес откуда подгружать XML
		 * @param {Function} callback
		 * @param [scope]
		 * @member JSXML
		 */
		load: function(source, callback, scope) {
			var o = this.fromStringOrObject(source);
			if (o) callback.call(scope ? scope : o, o);
			else this.fromFile(source, callback, scope);
		},

		/**
		 * XML to String
		 * @param source
		 * @param {Boolean} [xmlHeaderNeeded=true] показывать заголовок xml
		 * @method stringify
		 * @member JSXML
		 * @returns {*}
		 */
		stringify: function(source, xmlHeaderNeeded){
			xmlHeaderNeeded = (xmlHeaderNeeded !== false);
			var xml = typeof(source) == 'string' ? source : (source.xml ? source.xml : new XMLSerializer().serializeToString(source)),
					xmlHeaderPresent = /^<\?xml/.test(xml);
			if (xmlHeaderNeeded && /="UTF\-16"\?/.test(xml)) xml = xml.replace(/="UTF\-16"\?/, '="UTF-8"?');
			if (xmlHeaderNeeded && !xmlHeaderPresent) return this._xmlHeader + xml;
			if (!xmlHeaderNeeded && xmlHeaderPresent) return xml.replace(/^<\?xml[^<]+/, '');
			return xml;
		}

		,toXml: function(source, xmlHeaderNeeded){
			xmlHeaderNeeded = !(xmlHeaderNeeded === false);
			var xml = typeof(source) == 'string' ? source : (source.xml ? source.xml : new XMLSerializer().serializeToString(source)),
					xmlHeaderPresent = /^<\?xml/.test(xml);
			if (xmlHeaderNeeded && /\="UTF\-16"\?/.test(xml)) xml = xml.replace(/\=\"UTF\-16\"\?/, '="UTF-8"?');
			if (xmlHeaderNeeded && !xmlHeaderPresent) return this._xmlHeader + xml;
			if (!xmlHeaderNeeded && xmlHeaderPresent) return xml.replace(/^<\?xml[^<]+/, '');
			return xml;
		}

		,toDom: function(o, names, parentNode){
			var rootName = _borrowRootName(names);
			if (parentNode) parentNode = parentNode.appendChild(parentNode.ownerDocument.createElement(rootName));
			else parentNode = this.newDoc(rootName).documentElement;
			var t;
			if (_isA(o)) {
				for (var i = 0; i < o.length; i++ )
					this.toDom(o[i], this._copy(names), parentNode);
			} else {
				for (var i in o) {
					t = typeof o[i];
					switch (t) {
						case 'string':
						case 'number':
						case 'boolean':
							try {
								var v = t == 'boolean' ? (o[i]?1:0) : o[i];
								parentNode.setAttribute(i, String(v));
							} catch(e) {
								_throw(String.format(this.lng['Unable to set attribute named "{0}"; {1}'] ,i ,e.message));
							}
							break;
						case 'object':
							if (o[i] !== null)
								this.toDom(o[i], _isA(names) ? [i].concat(names) : i, parentNode);
							break;
						default:
							_throw(String.format(this.lng.unsuitableType, i ,t));
							return false;
							break;
					}
				}
			}
			return parentNode.ownerDocument.documentElement == parentNode ? parentNode.ownerDocument : parentNode;
		},

		trans: function(xmlSrc, xslSrc, callback, nativeResult, doc){
			var $this = this;
			this.load(xmlSrc, function(xml){
				$this._trans2(xml, xslSrc, callback, nativeResult, doc);
			});
		},

		transReady: function(xmlSrc, xslSrc, nativeResult, doc){
			var xmlSrc = this.fromStringOrObject(xmlSrc),
					xslSrc = this.fromStringOrObject(xslSrc),
					r;
			if (!xmlSrc || !xslSrc) return false;
			try {
				if (ActiveXObject instanceof Object) {
					r = xmlSrc.transformNode(xslSrc);
					r = this.fromStringOrObject(r) || r;
				} else {
					var processor = new XSLTProcessor();
					processor.importStylesheet(xslSrc);
					r = doc ? processor.transformToDocument(xmlSrc) : processor.transformToFragment(xmlSrc, document);
				}
			} catch (e) {
				_throw(this.lng.brokenxslt);
				return false;
			}
			return nativeResult ? r : this.stringify(r, false);
		},

		getXslWrap: function(cfg){
			cfg = cfg || {};
			cfg.indent = cfg.indent || 'yes';
			cfg.method = cfg.method || 'html';
			return ['<?xml version="1.0" encoding="UTF-8"?><xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0"><xsl:output encoding="UTF-8" indent="' + cfg.indent + '" method="' + cfg.method + '" />', '</xsl:stylesheet>'];
		},

		_trans2: function(xml, xslSrc, callback, nativeResult, doc){
			this.load(xslSrc, function(xsl){
				var scope;
				if (callback && typeof callback.length == "number" && typeof callback.splice == "function") {
					scope = callback[1];
					callback = callback[0];
				} else scope = callback;
				callback.call(scope, this.transReady(xml, xsl, nativeResult, doc));
			}, this);
		},

		_xmlHeader: '<?xml version="1.0" encoding="UTF-8"?>\r\n',
		_cache: {},
		_copy: function(o){
			if (typeof o != 'object' || o === null) return o;
			var r;
			if (_isA(o)) {
				r = [];
				for (var i = 0; i < o.length; i++) r.push(o[i]);
			} else {
				r = {};
				for (var i in o) r[i] = o[i]
			}
			return r;
		},
		_cache_loading: {},

		/**
		 * @property {Object} lng сообщения/тексты, которые могут быть переведены под конкретный язык
		 */
		lng: {
			broken: 'Broken XML string'
			,brokenfile: 'Broken XML file'
			,brokenxslt: 'Broken XSLT'
			,noajax: 'No AJAX library found. See docs for supported libraries.'
			,exception: 'An exception happened while trying to load url'
			,unsuitableType : 'Unsuitable type of index "{0}" for converting to XML: {1}'
			,'Unable to set attribute named "{0}"; {1}': 'Unable to set attribute named "{0}"; {1}'
		}


		/**
		 * @static
		 * @member JSXML
		 */
		,version : '0.3.2'
		/**
		 * @static
		 * @member JSXML
		 * @property {{major : number,minor : number,patch : number}} versionDetail
		 */
		,versionDetail : {
			major : 0
			,minor : 3
			,patch : 2
		}
	};


	// for (var i in pro) lib.prototype[i] = pro[i];
	cfg.context[cfg.name] = new lib();
})();