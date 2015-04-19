
+(function (window, document, $) {
	'use script';

	function Validate(opt) {
		if (!(this instanceof Validate)) {
			return new Validate(opt);
		}

		this.prefix = '$';
		this.RESULT = false;
		this.ERROR_TYPE = {
			'null': 'null',
			'error': 'error',
			'diff': 'diff',
			'short': 'short',
			'long': 'long',
			'below': 'below',
			'above': 'above'
		};
		this.errors = {};
		this.rules = [];
		this.options = {
			delay: 200,
			onBlur: false,
			onChange: false,
			isStepCheck: false,
			callback: null,
			suffix: '_msg',
			css: 'form-error',
			icon: '',
			template: '<p id="{id}" class="{css}">{msg}</p>'
		};
		this.isNull = false;
		if ($.isPlainObject(opt)) {
			$.extend(this.options, opt);
		}
	}
	Validate.prototype = {
		rule: function(rules) {
			var that = this,
				opt = this.options;
			if ($.isArray(rules)) {
				this.rules = rules;
				$.each(rules, function(k, v) {
					if (opt.onBlur) {
						$('body').delegate(v.id, 'blur', function(e) {
							var flag = ($(this).val() != '') ? true : false;
							if (flag) {
								setTimeout(function() {
									that.valid(v);
								}, opt.delay);
							}
						});
					}
				});
			}
		},
		valid: function(rule) {
			var that = this,
				opt = this.options,
				errors = {},
				fn = null,
				node = null,
				id, value, type, msg, same, ret;
			if ($.isPlainObject(rule) && !$.isEmptyObject(rule)) {
				rule = $.extend({
					id: '',
					type: '',
					msg: null,
					same: '',
					regex: null,
					limit: null,
					length: null,
					isNull: false,
					helper: '',
					args: [],
					callback: null,
					isDelay: false,
					delayTime: 100,
					context: this
				}, rule);
				id = rule.id;
				type = rule.type;
				msg = rule.msg;
				same = $(rule.same).val();
				node = $(id);
				value = node.val();
				fn = that[type] || null;
				that.isNull = rule.isNull;
			}
			if ($.isFunction(fn)) {
				switch (type) {
				case 'regex':
					ret = fn.apply(that, [value, rule.regex]);
					break;
				case 'matches':
					ret = fn.apply(that, [value, same]);
					break;
				case 'amount':
					ret = fn.apply(that, [value, id]);
					break;
				case 'cnId':
					ret = fn.apply(that, [value, rule.isLimit18]);
					break;
				default:
					ret = fn.apply(that, [value]);
					break;
				}
				if (ret === true && rule.limit) {
					ret = this.limit(value, rule.limit);
				}
				if (ret === true && rule.length) {
					ret = this.length(value, rule.length);
				}
				if (ret === true && rule.helper != '') {
					ret = this.emit(rule.helper, rule.args, rule.context);
				}
				if (ret === true && $.isFunction(rule.callback)) {
					if (rule.isDelay) {
						setTimeout(function() {
							ret = rule.callback.apply(that, rule.args, rule.context);
						}, rule.delayTime);
					} else {
						ret = rule.callback.apply(that, rule.args, rule.context);
					}
				}
				if (ret === true) {
					try {
						delete that.errors[id];
					} catch (e) {};
					setTimeout(function() {
						$(id + opt.suffix).remove();
					}, opt.delay);
				} else {
					that.errors[id] = msg[ret] || '[' + ret + ']' + '输入内容有误';
					that.showErrors();
				}
				$.extend(that.errors, errors);
			}
			that.RESULT = $.isEmptyObject(that.errors);
			return that.RESULT;
		},
		check: function() {
			var that = this,
				rules = this.rules,
				opt = this.options;
			$.each(rules, function(k, v) {
				that.valid(v);
				if (!that.RESULT && opt.isStepCheck) {
					return false;
				}
			});
			that.RESULT = $.isEmptyObject(that.errors);
			that.showErrors();
			that.isNull = false;
			if ($.isFunction(opt.callback)) {
				opt.callback.apply(this, []);
			}
			return that.RESULT;
		},
		show: function(id, msg) {
			var opt = this.options,
				node = $(id),
				error_id = id + opt.suffix,
				error_node = $(error_id),
				str = '';
			msg = opt.icon + msg;
			if (error_node.size() > 0) {
				error_node.html(msg);
			} else {
				str = this.getErrorHtml({
					id: error_id,
					msg: msg
				});
				$(str).appendTo(node.parent());
			}
		},
		showErrors: function() {
			var that = this,
				errors = this.errors;
			$.each(errors, function(k, v) {
				setTimeout(function() {
					that.show(k, v);
				}, 200);
			});
		},
		outPutErr: function(id, msg) {
			this.errors[id] = msg;
			this.showErrors();
		},
		on: function(name, fn) {
			var key = this.prefix + name;
			if ($.isFunction(fn)) {
				this[key] = fn;
			}
		},
		emit: function(name, args, context) {
			var key = this.prefix + name,
				fn = this[key];
			context = context || this;
			if (!$.isArray(args)) {
				args = args ? [args] : [];
			}
			if ($.isFunction(fn)) {
				return fn.apply(context, args);
			}
		},
		getErrorHtml: function(o) {
			var opt = this.options,
				id = o.id.replace(/^\#/, ''),
				temp = opt.template,
				str = '';
			str = temp.replace(/\{id\}/, id).replace(/\{msg\}/, o.msg).replace(/\{css\}/, opt.css);
			return str;
		},
		regex: function(v, reg) {
			var type = '',
				error = this.ERROR_TYPE;
			v = $.trim(v);
			if ((typeof reg === 'object') && v) {
				if (!reg.test(v)) {
					type = error['error'];
				}
			}
			if (v == '') {
				type = error['null'];
			}
			if (type != '') {
				return type;
			}
			return true;
		},
		limit: function(v, limit) {
			var type = '',
				error = this.ERROR_TYPE;
			v = parseInt($.trim(v), 10);
			if (this.isNull) {
				return true;
			}
			if ($.isArray(limit)) {
				if (isNaN(v)) {
					type = error['error'];
				} else if (v < limit[0] && limit[0] > 0) {
					type = error['below'];
				} else if (v > limit[1] && limit[1] > 0) {
					type = error['above'];
				}
			} else {
				type = error['error'];
			}
			if (v == '') {
				type = error['null'];
			}
			if (type != '') {
				return type;
			}
			return true;
		},
		length: function(v, limit) {
			var type = '',
				error = this.ERROR_TYPE;
			v = $.trim(v);
			if (this.isNull) {
				return true;
			}
			if ($.isArray(limit)) {
				if (v.length < limit[0] && limit[0] > 0) {
					type = error['short'];
				} else if (v.length > limit[1] && limit[1] > 0) {
					type = error['long'];
				}
			} else {
				type = error['error'];
			}
			if (v == '') {
				type = error['null'];
			}
			if (type != '') {
				return type;
			}
			return true;
		},
		required: function(v) {
			var type = '',
				error = this.ERROR_TYPE;
			v = $.trim(v);
			if (v == '') {
				type = error['null'];
			}
			if (type != '') {
				return type;
			}
			return true;
		},
		matches: function(v, s) {
			var type = '',
				error = this.ERROR_TYPE;
			v = $.trim(v);
			s = $.trim(s);
			if (v == '' && s == '') {
				type = error['null'];
			} else if (v != s) {
				type = error['diff'];
			}
			if (type != '') {
				return type;
			}
			return true;
		},
		email: function(v) {
			var type = '',
				error = this.ERROR_TYPE;
			v = $.trim(v);
			if (v == '' && this.isNull) {
				return true;
			}
			if (v == '') {
				type = error['null'];
			} else if (!this.isEmail(v)) {
				type = error['error'];
			}
			if (type != '') {
				return type;
			}
			return true;
		},
		isEmail: function(v) {
			var reg = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
			return v ? reg.test(v) : false;
		},
		passwd: function(v) {
			var type = '',
				error = this.ERROR_TYPE;
			v = $.trim(v);
			if (v == '' && this.isNull) {
				return true;
			}
			if (v == '') {
				type = error['null'];
			} else if (v.length < 6) {
				type = error['short'];
			} else if (v.length > 16) {
				type = error['long'];
			} else if (!this.isPasswd(v)) {
				type = error['error'];
			}
			if (type != '') {
				return type;
			}
			return true;
		},
		isPasswd: function(v) {
			var reg = /[a-zA-Z\d`~!@#$%^&*()_\-+={}\[\]\\|:;"'<>,.?\/]{6,16}/;
			return v ? reg.test(v) : false;
		},
		mobile: function(v) {
			var type = '',
				error = this.ERROR_TYPE;
			v = $.trim(v);
			if (v == '' && this.isNull) {
				return true;
			}
			if (v == '') {
				type = error['null'];
			} else if (!this.isMobile(v)) {
				type = error['error'];
			}
			if (type != '') {
				return type;
			}
			return true;
		},
		isMobile: function(v) {
			var reg = /^1\d{10}$/;
			return v ? reg.test(v) : false;
		},
		trueName: function(v) {
			var type = '',
				error = this.ERROR_TYPE;
			v = $.trim(v);
			if (v == '' && this.isNull) {
				return true;
			}
			if (v == '') {
				type = error['null'];
			} else if (!this.isTrueName(v)) {
				type = error['error'];
			}
			if (type != '') {
				return type;
			}
			return true;
		},
		text: function(v) {
			var type = '',
				error = this.ERROR_TYPE;
			v = $.trim(v);
			if (v == '' && this.isNull) {
				return true;
			}
			if (v == '') {
				type = error['null'];
			}
			if (type != '') {
				return type;
			}
			return true;
		},
		isTrueName: function(v) {
			var re = /^[\u4E00-\u9FA5\·\u00B7]+$/;
			return re.test(v);
		},
		amount: function(v, id) {
			var type = '',
				error = this.ERROR_TYPE;
			if (v == '' && this.isNull) {
				return true;
			}
			if (v == '') {
				type = error['null'];
			} else {
				v = parseFloat($.trim(v), 10);
				if (!v || 0 == v) {
					type = error['error'];
				}
			}
			v && $(id).val(v);
			if (type != '') {
				return type;
			}
			return true;
		},
		formatAmount: function(s, bit) {
			s = (typeof s === "string") ? s : s.toString();
			bit = (typeof bit === "undefined") ? 2 : ((typeof bit === "number") ? bit : 2);
			s = s.replace(/,/g, "");
			s = (/(\.[0-9]+)$/.test(s) ? s : (s + ".00"));
			var re = new RegExp("^([\+-]?)([0-9]+)(\.[0-9]{1," + bit + "})?$", ""),
				arr = null;
			arr = s.match(re);
			if (!arr) {
				return false;
			}
			if (+s >= 1000000000000) {
				return false;
			}
			arr[2] = arr[2].replace(/^0+(\d)/, "$1");
			if (arr[3] !== "") {
				re = new RegExp("(\\d{" + bit + "})\\d+", "");
				arr[3] = arr[3].replace(re, "$1");
				if (arr[3].length < 3) {
					arr[3] += '0';
				}
			} else {
				arr[3] = ".00";
			}
			arr.shift();
			return arr.join("").replace(/^\+/, "").replace(/^0\.0+$/, "0");
		},
		date: function(v) {
			var type = '',
				error = this.ERROR_TYPE;
			v = $.trim(v);
			if (v == '' && this.isNull) {
				return true;
			}
			if (v == '') {
				type = error['null'];
			} else if (!this.isDate(v)) {
				type = error['error'];
			}
			if (type != '') {
				return type;
			}
			return true;
		},
		isDate: function(v) {
			var reg = /^\d{4}(\-|\/|\.)\d{2}\1\d{2}$/;
			return v ? reg.test(v) : false;
		},
		number: function(v) {
			var type = '',
				error = this.ERROR_TYPE;
			v = $.trim(v);
			if (v == '' && this.isNull) {
				return true;
			}
			if (v == '') {
				type = error['null'];
			} else if (!this.isNumber(v)) {
				type = error['error'];
			}
			if (type != '') {
				return type;
			}
			return true;
		},
		isNumber: function(v) {
			var reg = /^[0-9]+$/;
			return v ? reg.test(v) : false;
		},
		bankCardNo: function(v) {
			var type = '',
				error = this.ERROR_TYPE;
			v = $.trim(v);
			if (v == '' && this.isNull) {
				return true;
			}
			if (v == '') {
				type = error['null'];
			} else if (!this.isBankCardNo(v)) {
				type = error['error'];
			}
			if (type != '') {
				return type;
			}
			return true;
		},
		isBankCardNo: function(v) {
			var reg = /[^0-9-\s]+/,
				tag = 0,
				num = 0,
				flag = false,
				len, n;
			if (reg.test(v)) {
				return false;
			}
			v = v.replace(/\D/g, '');
			len = v.length - 1;
			for (len; len >= 0; len--) {
				n = v.charAt(len);
				num = parseInt(n, 10);
				if (flag) {
					if ((num *= 2) > 9) {
						num -= 9;
					}
				}
				tag += num;
				flag = !flag;
			}
			return (tag % 10) == 0;
		},
		cnId: function(v, isLimit18) {
			var type = '',
				_is_limit_18 = (isLimit18 || false),
				error = this.ERROR_TYPE;
			v = $.trim(v);
			if (v == '' && this.isNull) {
				return true;
			}
			if (v == '') {
				type = error['null'];
			} else if (!this.isCnId(v)) {
				type = error['error'];
			}
			if (_is_limit_18) {
				var y = v.substr(6, 4),
					m = v.substr(10, 2),
					d = v.substr(12, 2),
					birthday = (new Date(y, m - 1, d)),
					now_y = parseInt($("header").data("now-year"), 10),
					now_m = parseInt($("header").data("now-month"), 10),
					now_d = parseInt($("header").data("now-day"), 10),
					now = new Date(now_y - 18, now_m - 1, now_d);
				if (birthday.getTime() > now.getTime()) {
					type = error['below'];
				}
			}
			if (type != '') {
				return type;
			}
			return true;
		},
		isValidDate: function(y, m, d) {
			var _y, _m, _d, now;
			now = new Date(y, m - 1, d);
			_y = now.getFullYear();
			_m = now.getMonth() + 1;
			_d = now.getDate();
			return (y == _y && m == _m && d == _d);
		},
		isCnId: function(v) {
			var arrExp = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
			var arrValid = [1, 0, "X", 9, 8, 7, 6, 5, 4, 3, 2];
			var y, m, d;
			if (/^\d{15}$/.test(v)) {
				y = "19" + v.substr(6, 2);
				m = v.substr(8, 2);
				d = v.substr(10, 2);
				return this.isValidDate(y, m, d);
			} else if (/^\d{17}\d|x$/i.test(v)) {
				var sum = 0,
					vBit;
				for (var i = 0; i < v.length - 1; i++) {
					sum += parseInt(v.substr(i, 1), 10) * arrExp[i];
				}
				vBit = sum % 11;
				y = v.substr(6, 4);
				m = v.substr(10, 2);
				d = v.substr(12, 2);
				return (arrValid[vBit] == v.substr(17, 1).toUpperCase() && this.isValidDate(y, m, d));
			} else {
				return false;
			}
		},
		hkId: function(v) {
			var type = '',
				error = this.ERROR_TYPE;
			v = $.trim(v);
			if (v == '' && this.isNull) {
				return true;
			}
			if (v == '') {
				type = error['null'];
			} else if (!this.isHkId(v)) {
				type = error['error'];
			}
			if (type != '') {
				return type;
			}
			return true;
		},
		isHkId: function(v) {
			var charCodeHashTable = {
				" ": 58,
				"A": 10,
				"B": 11,
				"C": 12,
				"D": 13,
				"E": 14,
				"F": 15,
				"G": 16,
				"H": 17,
				"I": 18,
				"J": 19,
				"K": 20,
				"L": 21,
				"M": 22,
				"N": 23,
				"O": 24,
				"P": 25,
				"Q": 26,
				"R": 27,
				"S": 28,
				"T": 29,
				"U": 30,
				"V": 31,
				"W": 32,
				"X": 33,
				"Y": 34,
				"Z": 35
			};
			var sum, len, ch;
			s = s.toUpperCase().replace(/\(|\)/g, "");
			if (/^[ A-Z]{0,1}[A-Z]\d{6}[0-9A]$/.test(s)) {
				len = s.length;
				sum = (len == 9) ? 0 : (9 * 58);
				for (var i = len; i > 0; i--) {
					ch = s.substr(len - i, 1);
					sum += ((ch in charCodeHashTable) ? charCodeHashTable[ch] : parseInt(ch, 10)) * i;
				}
				return ((sum % 11) == 0) ? true : false;
			} else {
				return false;
			}
		},
		twId: function(v) {
			var type = '',
				error = this.ERROR_TYPE;
			v = $.trim(v);
			if (v == '' && this.isNull) {
				return true;
			}
			if (v == '') {
				type = error['null'];
			} else if (!this.isTwId(v)) {
				type = error['error'];
			}
			if (type != '') {
				return type;
			}
			return true;
		},
		isTwId: function(v) {
			var charCodeHashTable = {
				"A": 10,
				"B": 11,
				"C": 12,
				"D": 13,
				"E": 14,
				"F": 15,
				"G": 16,
				"H": 17,
				"J": 18,
				"K": 19,
				"L": 20,
				"M": 21,
				"N": 22,
				"P": 23,
				"Q": 24,
				"R": 25,
				"S": 26,
				"T": 27,
				"U": 28,
				"V": 29,
				"X": 30,
				"Y": 31,
				"W": 32,
				"Z": 33,
				"I": 34,
				"O": 35
			};
			var sum, len, ch;
			s = s.toUpperCase().replace(/\(|\)/g, "");
			if (/^[A-Z]\d{9}$/.test(s)) {
				len = s.length;
				sum = 0;
				for (var i = len; i > 0; i--) {
					ch = s.substr(len - i, 1);
					if (ch in charCodeHashTable) {
						sum += parseInt(charCodeHashTable[ch] / 10);
						sum += (charCodeHashTable[ch] % 10) * (i - 1);
					} else {
						sum += parseInt(ch) * (i - 1);
					}
				}
				return (10 - sum % 10) == parseInt(s.substr(9, 1));
			}
			return false;
		}
	};

	$.Validate = Validate;
})(window, document, jQuery);