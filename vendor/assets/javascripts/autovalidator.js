(function($, window) {
  var logError = function(message) {
    if ( window['console'] && typeof(window['console']['error']) == 'function') {
      window.console.error(message);
    }
  }, logInfo = function(message) {
    if ( window['console'] && typeof(window['console']['log']) == 'function') {
      window.console.log(message);
    }
  };

  $.ValidationList = function() {
    this._names = [];
    this._validations = [];
  };
    
  $.extend($.ValidationList.prototype, {
    _spliceInValidation: function(start, deleteCnt, validation, validator) {
      validation = (validation.constructor == $.Validation) ? validation : new $.Validation(validation);
      if (validator) { validation.validator(validator); }
      this._names.splice(start, deleteCnt, validation.name);
      this._validations.splice(start, deleteCnt, validation);
    },
    register: function(validation, validator) {
      this._spliceInValidation(this._validations.length, 0, validation, validator);
    },
    unregister: function(name) {
      var idx = $.inArray(name, this._names);
      if (idx >= 0) {
        this._names.splice(idx, 1);
        this._validations.splice(idx, 1);
      }
    },
    replace: function(name, validation, validator) {
      var idx = $.inArray(name, this._names);
      if (idx >= 0) {
        this._spliceInValidation(idx, 1, validation, validation);
      }
    },
    registerBefore: function(name, validation, validator) {
      var idx = $.inArray(name, this._names);
      idx = idx >= 0 ? idx : this._names.length;
      this._spliceInValidation(idx, 0, validation, validator);
    },
    registerAfter: function(name, validation, validator) {
      var idx = $.inArray(name, this._names);
      idx = idx >= 0 ? idx : 0;
      this._spliceInValidation(idx + 1, 0, validation, validator);
    },
    registerEach: function(array, validator) {
      var self = this;
      $.each(array, function(i, value) {
        self.register(value, validator);
      });
    },
    describe: function() {
      this.each(function(i) {
        logInfo(this.description());
      });
    },
    each: function(fn) {
      var self = this;
      $.each(this._validations, function(i, value) {
        fn.call(this, i, value);
      });
    },
    clone: function() {
      var clone = new $.ValidationList();
      this.each(function(i) {
        clone.register(this.clone());
      });
      return clone;
    }
  });
  
  // A validation object. Defined by options, a selector, and a test function.
  $.Validation = function(options) {
    this._create(options);
  };
  
  $.Validation.settings = {
    emailRegex: /\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,4}\b/i,
    telRegex: null,
    defaults: {
      selector: '*',
      test: function(element) { this.validity(element, true); },
      message: "${name} is invalid.",
      onChange: true,
      onSubmit: true
    }
  };
  
  $.Validation.Global = new $.ValidationList();
  
  $.extend($.Validation.prototype, {
    _create: function(options) {
      this._options = $.extend(true, {}, $.Validation.settings.defaults, options || {});
      this.name = this._options.name;
      this._message = this._options.message;
      this._testFn = this._options.test;
      this._selector = this._options.selector;
    },
    _shouldBeRunOn: function(element, options) {
      return element.is(this._selector) && ((this._options.onSubmit || !options.submit) && (this._options.onChange || !options.change));
    },
    _errorMessageFor: function(element) {
      var msg = this._message;
      if (typeof(this._message) == "function") {
        msg = this._message.call(this, element);
      }      
      return msg.replace(/\$\{name\}/gi, element.attributeName()).
                 replace(/\$\{val\}/gi, element.val()).
                 replace(/\$\{attr\|([^\}]+)\}/gi, function(all, attr) { return element.attr(attr); });
    },
    validator: function(value) {
      if (value) {
        this._validator = value;        
      }
      return this._validator;
    },
    description: function() {
      var describe = "Run " + this.name + " validation on inputs matching " + this._selector;
      if (this.onChange) { describe += " on change"; }
      if (this.onSubmit && this.onChange) { describe += " and"; }
      if (this.onSubmit) { describe += "on submit"; }
      return describe;
    },
    _triggerEvent: function(element, data) {
      var validator = this.validator(),
        target = ((validator && validator.element) || element), event;
      data = $.extend({target: element, message: null, validation: this}, data || {});
      element.valid(data.valid);
      element.data('autovalidator.status', data.status);

      if (!!element.valid() !== !!data.valid || data.message !== element.data('autovalidator-error-message')) {
        element.data('autovalidator.error-message', data.message);
        event = $.Event('autovalidatorchange', data, validator);
        if (validator && $.isFunction(validator.option("change"))) {
          validator.option("change").call(target, event, validator);
        }
        target.trigger(event);
      }
    },
    _valid: function(element, options) {
      options = options || {};
      options.message = null;
      options.valid = true;
      options.status = 'valid';
      this._triggerEvent(element, options);
    },
    _invalid: function(element, options) {
      options = options || {};
      options.message = options.message || this._errorMessageFor(element);
      options.valid = false;
      options.status = 'invalid';
      this._triggerEvent(element, options);
    },
    validity: function(element, validity, options) {
      if (element.valid() || validity || element.data('autovalidator.status') === 'loading') {
        element.valid(validity);
        return validity ? this._valid(element, options) : this._invalid(element, options);
      }
    },
    loading: function(element, options) {
      options = options || {};
      options.message = null;
      options.valid = null;
      options.status = 'loading';
      this._triggerEvent(element, options);
    },
    clone: function() {
      return new $.Validation($.extend(true, {}, this._options));
    },
    run: function(element, options) {
      element = $(element);
      
      if (this._shouldBeRunOn(element, options)) {
        this._testFn.call(this, element, options);
      }
    }
  });
    
  $.Validator = function(element, options) {
    this.element = $(element);
    this._create(options);
    this._init();
  };
  
  $.Validator.settings = {
    change: null,
    create: null,
    run: null
  };
  
  $.Validator.prototype = {
    _create: function(options) {
      var event = $.Event('autovalidatorcreate');
      this._options = $.extend(true, {}, $.Validator.settings, options || {});
      if ($.isFunction(this._options.create)) {
        this._options.create.call(this.element, event, this)
      }
      this.element.trigger(event, this);
    },
    _init: function() {
      var self = this;
      this.element.attr('novalidate', 'novalidate');
      this._inputs().valid(true).unbind('.autovalidator').bind('change.autovalidator', function(e) {
        self.run({change: true, inputs: $(this)});
      });
      this.element.unbind('.autovalidator').bind('submit.autovalidator', function(e) {
        var form = $(this);
        if (!form.data('autovalidator.validity')) {
          e.preventDefault();
          
          if (form.validate({submit: true})) {
            form.data('autovalidator.validity', true);
            form.submit();
            form.data('autovalidator.validity', false);
          }
        }
      });
    },
    _inputs: function() {
      return this.element.find('input, textarea, select').filter(':not([formnovalidate]):not([disabled])');
    },
    option: function() {
      if (arguments.length == 2) {
        this._options[arguments[0]] = arguments[1];
        return this;
      } else if (arguments.length == 1) {
        return this._options[arguments[0]];
      }
    },
    validate: function(options) {
      this.run(options);
      return this.valid();
    },
    valid: function() {
      return this._inputs().filter('[aria-invalid=true]').length === 0
    },
    run: function(options) {
      options = $.extend({
        submit: false,
        change: false
      }, options || {});
      
      var self = this,
        event = $.Event('autovalidatorrun', options),
        inputs = options.inputs || this._inputs();
        
        if ($.isFunction(this._options.run)) {
          this._options.run.call(this.element, event, this)
        }
        this.element.trigger(event, this);

      inputs.valid(true).data('autovalidator.error-message', null).data('autovalidator.status', null);

      this.validations().each(function(i) {
        var validation = this;
        $.each(inputs, function(i) {
          validation.run(this, options);
        });
      });
    },
    errors: function() {
      var errors = [];
      this._inputs().each(function(i) {
        if (!$(this).valid()) {
          errors.push($(this).data('autovalidator.error-message'));
        }
      });
      return errors;
    },
    validations: function() {
      var self = this;
      
      if (!this._validations) {
        this._validations = $.Validation.Global.clone();
        this._validations.each(function(i) {
          this.validator(self);
        });
      }
      return this._validations;
    }
  };
  
  $.each(['replace', 'unregister', 'register', 'registerEach', 'registerBefore', 'registerAfter', 'describe'], function(i, value) {
    $.Validator.prototype[value] = function() {
      var validations = this.validations(),
        args = $.makeArray(arguments);
      args.push(this);
      validations[value].apply(validations, args);
    };
  });
  
      
  $.extend($.fn, {
    clear: function() {
      $(this).filter('form').each(function() {
        var inputs = $(this).find(':input').not(':button, :submit, :reset, [type=hidden], .placeholder');
        inputs.val('').removeAttr('checked').removeAttr('selected').blur(); 
        $(this).find('li').removeClass('valid').removeClass('loading').removeClass('invalid');
      });
      return $(this);
    },
    attributeName: function() {
      return $(this).attr('aria-label') || $(this).attr('placeholder') || $(this).attr('data-attr-name');
    },
    valid: function(val) {
      if (val !== undefined && val !== null) {
        $(this).attr('aria-invalid', val ? 'false' : 'true');
        $(this).data('autovalidator.status', val ? 'valid' : 'invalid');
        return this;
      } else {
        return $(this).is(':not([aria-invalid])') || $(this).attr('aria-invalid') == 'false';
      }
    },
    floatVal: function(val) {
      if (val) {
        $(this).val(val);
        return this;
      } else {
        val = parseFloat($(this).val(), 10);
        return val ? val : 0;
      }
    },
    minValue: function(val) {
      if (val) {
        $(this).attr('min', val);
        return this;
      } else {
        val = parseFloat($(this).attr('min'), 10);
        return val ? val : 0;
      }
    },
    maxValue: function(val) {
      if (val) {
        $(this).attr('max', val);
        return this;
      } else {
        val = parseFloat($(this).attr('max'), 10);
        return val ? val : Infinity;
      }
    },
    minLength: function(val) {
      if (val) {
        $(this).attr('minlength', val);
        return this;
      } else {
        val = parseInt($(this).attr('minlength'), 10);
        return val ? val : 0;
      }
    },
    maxLength: function(val) {
      if (val) {
        $(this).attr('maxlength', val);
        return this;
      } else {
        val = parseInt($(this).attr('maxlength'), 10);
        return val ? val : Infinity;
      }
    },
    pattern: function(regex) {
      if (regex) {
        $(this).attr('pattern', regex.source);
        return this;
      } else if ($.Validation.settings.emailRegex && $(this).filter('[type=email]').length > 0) {
        return $.Validation.settings.emailRegex;
      } else if ($.Validation.settings.telRegex && $(this).filter('[type=tel]').length > 0) {
        return $.Validation.settings.telRegex;
      } else {
        return new RegExp($(this).attr('pattern'));
      }
    }
  });
  
  $.extend($.fn, {
    autovalidator: function(options) {
      var instance, 
        args = Array.prototype.slice.call( arguments, 1 ),
        retVal = [];
            
      if (typeof(options) == 'string') {
        this.each(function() {
          instance = $.data(this, 'autovalidator');
          if ( !instance ) {
            logError( "cannot call methods on autovalidator prior to initialization; " +
              "attempted to call method '" + options + "'" );
            return;
          }
          if ( !$.isFunction( instance[options] ) || options.charAt(0) === "_" ) {
            logError( "no such method '" + options + "' for autovalidator instance" );
            return;
          }
          retVal.push(instance[ options ].apply( instance, args ));
        });
      } else {
        this.each(function() {
          var instance = $(this).data('autovalidator');
          if ( instance ) {
            // apply options & init
            instance.option( options || {} );
            instance._init();
          } else {
            // initialize new instance
            instance = new $.Validator( this, options )
          }
          $(this).data('autovalidator', instance);
          retVal.push(instance);
        });
      }
      return retVal;
    }
  });
  
  // Register Common Validations
  // Register Required Validation
  $.Validation.Global.register({
    name: 'required',
    selector: '[required]',
    message: "${name} is required",
    test: function(element) {
      if (element.is('input, textarea')) {
        this.validity(element, $.trim(element.val()).length > 0);
      } else if (element.is('select')) {
        this.validity(element, $.trim(element[0].options[select.selectedIndex].value).length > 0);
      }
    }
  });

  // Register Email Validation
  $.Validation.Global.register({
    name: 'email',
    selector: '[type=email]',
    message: "that doesn't look like an email address",
    test: function(element) {
      this.validity(element, element.val().length === 0 || element.pattern().test(element.val()));
    }
  });

  // Register Pattern Validation
  $.Validation.Global.register({
    name: 'pattern',
    selector: '[pattern]',
    message: "${name} doesn't look right",
    test: function(element) {
      this.validity(element, element.val().length === 0 || element.pattern().test(element.val()));
    }
  });

  // Register Length Validation
  $.Validation.Global.register({
    name: 'length',
    selector: '[minlength], [maxlength]',
    message: function(element) {
      var min = element.attr('minlength'), max = element.attr('maxlength');
      if (typeof(min) !== 'undefined' && min !== false && typeof(max) !== 'undefined' && max !== false) {
        msg = "${name} should be between ${attr|minlength} and ${attr|maxlength} characters long";
      } else if (typeof(min) !== 'undefined' && min !== false) {
        msg = "${name} should be at least ${attr|minlength} characters long";
      } else if (typeof(max) !== 'undefined' && max !== false) {
        msg = "${name} can't be longer than ${attr|maxlength} characters long";
      }
      return msg;
    },
    test: function(element) {
      var length = $.trim(element.val()).length;
      this.validity(element, length <= element.maxLength() && length >= element.minLength());
    }
  });

  // Register Numeric Validation
  $.Validation.Global.register({
    name: 'numeric',
    selector: '[min], [max]',
    message: function(element) {
      var min = element.attr('min'), max = element.attr('max');
      if (typeof(min) !== 'undefined' && min !== false && typeof(max) !== 'undefined' && max !== false) {
        msg = "between ${attr|min} and ${attr|max}";
      } else if (typeof(min) !== 'undefined' && min !== false) {
        msg = "can't be less than ${min}";
      } else if (typeof(max) !== 'undefined' && max !== false) {
        msg = "can't be more than ${max}";
      }
      return msg;
    },
    test: function(element) {
      var floatVal = element.floatVal();
      this.validity(element, floatVal <= element.maxValue() && floatVal >= element.minValue());
    }
  });
}(jQuery, window));