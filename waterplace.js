// REST with limit/skip?
// security + security interface
// client side script
// multiple water places and associate with users
// UI like forge
// indexes?

var Waterplace = new Meteor.Collection("waterplace");

if (Meteor.isClient) {
    WP = function(url) {
	var self = this;
	this.ref = null;
	var parts = url.trim('/').split('/').reverse();
	var lastpart = null;
	$.each(parts, function(i, p){
            parts[i] = parts.slice(i).reverse().join('/');
	});

	$.each(parts, function(i, part){
	    var kv = Waterplace.findOne({key: part});
	    var id = null;
	    if (!kv) {
		// add time
		var values = {};
		var lastref = null;
		if (lastpart) {
		    values[lastpart.key] = lastpart.id;
		}
		if (part) {
		    id = Waterplace.insert({key: part, values: values});
		}
	    }
	    else {
		id = kv._id;
		if (lastpart) {
		    var toupdate = {};
		    toupdate['values.' + lastpart.key] = lastpart.id;
		    Waterplace.update(kv._id, {$set: toupdate});
		}
	    }

	    if (lastpart) {
		Waterplace.update(lastpart._id, {$set: {parent: id}})
	    }

	    lastpart = {id: id, key: part};
	    if (!self._ref) {
		self._ref = lastpart;
		self.ref = function() {
		    return Waterplace.findOne(self._ref.id);
		};
	    }
	});

	var objectify = function(x) {
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
		parent[x.key.split('/').splice(-1)[0]] = obj;
		$.each(x.values, function(k,v) {
		    var key = k.split('/').splice(-1)[0];
		    $.extend(obj, objectify(Waterplace.findOne(v))); 
		});
	    }
	    
	    return parent;
	};

	this.val = function(){
	    return objectify(self.ref());
	}

	this.set = function(obj) {
	    if (typeof obj !== 'object') {
		Waterplace.update(self._ref.id, {$set: {values: obj}});
		return self;
	    }

	    $.each(obj, function(k,v) {
		var n = new WP(self._ref.key + '/' + k);
		n.set(v);
	    });
	    return self;
	};

	this.push = function(){
	    // TODO: add type array with 0,1,2 as keys and special objectify treatment
	}

	this.on = function(what, cb) {
	    var debouncedcb = _.debounce(cb, 0);

	    Waterplace.find().observe({
		added: function(obj) {
		    // triggered twice if client inserts?
		    var ref = self.ref();
		    if (obj && obj.key && obj.key.indexOf(ref.key) === 0 && 
			obj.key.split('/').length - 1 === ref.key.split('/').length) {
			setTimeout(function(){
			    what === 'child_added' && cb(new WP(obj.key));
			},0);
		    }
		},
		changed: function(obj, old) {
		    // no old object
		    var ref = self.ref();
		    if (obj &&  obj.key && obj.key.indexOf(ref.key) === 0) {
			setTimeout(function(){
			    what === 'value' && debouncedcb(new WP(ref.key));
			})
		    }
		}
	    });	
	};
    }


    // tests:

    test = function(){
	var ayalast = new WP('/users/ayal/name/last');	
	var amirlast = new WP('/users/amir/name/last');
	amirlast.on('value', function(c){
	    console.log('amirlast changed', JSON.stringify(c.val()));
	    console.log(Waterplace.find().fetch());
	});

	ayalast.set('gelles');
	amirlast.set({thename: {is: {gafner: true}}});
    }
    
    var users = new WP('/users');
    users.on('child_added', function(user){
	console.log('added', user.val());
    });

    users.on('value', function(user){
	console.log('changed', user.val());
    });

}

if (Meteor.isServer) {
    
}
