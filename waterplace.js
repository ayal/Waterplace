// REST with limit/skip?
// security + security interface
// client side script
// multiple water places and associate with users
// UI like forge
// indexes?

Waterplace = new Meteor.Collection("waterplace");

if (Meteor.isClient) {
    WP = function(url) {
	var self = this;
	this.ref = null;
	var parts = url.trim('/').split('/').reverse();
	var lastpart = null;
	$.each(parts, function(i, p){
	    parts[i] = parts.slice(i).reverse().join('/');
	});

	this.verify = function(v){
	    var valtoset = v;
	    $.each(parts, function(i, part) {	
		if (i > 0) {
		    valtoset = undefined;
		}

		kv = Waterplace.findOne({key: part});
		var id = null;
		if (!kv) {
		    // add time
		    var values = typeof valtoset !== 'undefined' ? valtoset : {empty : 1};
		    var lastref = null;
		    if (lastpart) {
			values = {};
			values[lastpart.key] = lastpart.id;
		    }
		    if (part) {
			id = Waterplace.insert({key: part, values: values});
		    }
		}
		else {
		    id = kv._id;
		    if (lastpart && (!kv.values || kv.values[lastpart.key] !== lastpart.id)) {
			// TODO: grabage collection of overridden objects
			var newvals = (kv.values.empty || typeof kv.values !== 'object') ? {} : kv.values;
			var toupdate = {values: newvals};
			toupdate.values[lastpart.key] = lastpart.id;
			Waterplace.update(kv._id, {$set: toupdate});
		    }

		    if (!lastpart && typeof valtoset !== 'undefined') {
			Waterplace.update(kv._id, {$set: {values: valtoset}});
		    }
		}

		if (lastpart && id && (!kv || kv.parent !== id)) {
		    Waterplace.update(lastpart.id, {$set: {parent: id}})
		}

		lastpart = {id: id, key: part};
		if (!self._ref.id) {
		    self._ref.id = id;
		}
	    });
	};


	self._ref = {key: parts[0]};

	self.ref = function() {
	    return self;
	};
	
	self.name = function(){
	    return self._ref.key;
	}

	ifArrayMakeArray = function (obj) {
	    var arr = []
	    _.keys(obj).forEach(function(k){
		if (k.match(/^\d+$/i)) {
		    arr[parseInt(k)] = obj[k];
		} })
	    return arr.length && arr.length >= _.keys(obj).length ? arr : obj;
	    
	}
	
	this.objectify = function(x) {
	    if (!x) {
		return null;
	    }

	    if (typeof x.values == undefined || x.values === null) {
		return null;
	    }

	    if (!x.key) {
		return x.value;
	    }

	    var obj = {};
	    var parent = {}


	    if (typeof x.values !== 'object') {
		parent[x.key.split('/').splice(-1)[0]] = x.values;
	    }
	    else {
		var pkey = x.key.split('/').splice(-1)[0];
		parent[pkey] = obj;
		$.each(x.values, function(k,v) {
		    var key = k.split('/').splice(-1)[0];
		    $.extend(obj, self.objectify(Waterplace.findOne(v))); 
		});
		parent[pkey] = ifArrayMakeArray(obj);
	    }

	   return parent;
	};

	this.val = function(){
	    self.verify();
	    return _.values(self.objectify(Waterplace.findOne(self._ref.id)))[0];
	}

	this.set = function(obj) {
	    // naively delete values of objects we are about to set
/*	    var ref = Waterplace.findOne({key: self._ref.key});
	    if (ref) {
		self._ref.id = ref._id;
		Waterplace.update(self._ref.id, {$set: {values: null}});
	    }*/


	    if (!obj || typeof obj !== 'object') {
		self.verify(obj);
		return self;
	    }
	    
	    var urlz = self.urlify(obj);
	    $.each(urlz, function(k,v) {
		var n = new WP(self._ref.key + '/' + k);
		n.set(v);
	    });

	    return self;
	};

	this.urlify = function(obj) {
	    var newobj = {};
	    $.each(obj, function(k,v) {
		if (typeof v !== 'object') {
		    newobj[k] = v;
		    return;
		}

		var res = self.urlify(v);

		$.each(res, function(nk,nv){
		    newobj[k + '/' + nk] = nv;
		});
	    });

	    return newobj;
	}



	this.push = function(v) {
	    var objtoset = {};
	    objtoset['' + (new Date()).getTime()] = v;
	    self.set(objtoset);
	}
	
	this.once = function(what, cb) {
	    self.on(what,cb,true);
	};

	this.on = function(what, cb, stop) {
	    // use "stop" to create a "once" effect
	    console.log('listening on', what);

	    var debouncedcb = _.debounce(cb, 0);

	    // .on(value) should work every time but now only on first load and onvalue change..

	    Waterplace.find().observe({
		added: function(obj) {
		    console.log('added called', obj);

		    // triggered twice if client inserts?
		    var ref = self.ref();
		    
		    if (obj && obj.key && obj.key.indexOf(self._ref.key) === 0 && 
			obj.key.split('/').length - 1 === self._ref.key.split('/').length) {
			setTimeout(function(){
			    what === 'child_added' && cb(new WP(obj.key));
			}, 0);
		    }

		    if (obj && obj.key && obj.key.indexOf(self._ref.key) === 0 && 
			obj.key.split('/').length === self._ref.key.split('/').length) {
			setTimeout(function(){
			    what === 'value' && !obj.empty && debouncedcb(new WP(obj.key));
			}, 100);
		    }

		},
		changed: function(obj, old) {
		    // no old object
		    var ref = self.ref();
		    if (obj &&  obj.key && obj.key.indexOf(self._ref.key) === 0) {
			setTimeout(function(){
			    what === 'value' && debouncedcb(new WP(self._ref.key));
			})
		    }
		}
	    });	
	};
    }
    
    
    chatTest = function(){
	chat = (new WP('/chat'));
	chat.on('child_added', function(x){console.log('child added', x.val())})
    }

    Meteor.startup(function() {
    });

}

if (Meteor.isServer) {
    
}
