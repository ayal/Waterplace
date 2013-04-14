// REST with limit/skip?
// security + security interface
// client side script
// multiple water places and associate with users
// UI like forge
// indexes?

Waterplace = new Meteor.Collection("waterplace");

Meteor.methods({
  findone: function(selector) {
    if (!this.isSimulation) {
      var res = Waterplace.findOne(selector);
      console.log('FINDONE METHOD CALL ON SERVER', res);
      return JSON.stringify(res);
    }
  }
})

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
    // Meteor.call('findone', {key: part}, function(ex, kv){
    // kv = kv ? JSON.parse(kv) : kv;
    // });
    
    kv = Waterplace.findOne({key: part});
	    var id = null;
	    if (!kv) {
		// add time
    var values = {empty: 1};
		var lastref = null;
		if (lastpart) {
      delete values.empty;
		    values[lastpart.key] = lastpart.id;
		}
		if (part) {
		    id = Waterplace.insert({key: part, values: values});
		}
	    }
	    else {
		id = kv._id;
		if (lastpart && kv.values[lastpart.key] !== lastpart.id) {
      // TODO: grabage collection of overridden objects
      var newvals = typeof kv.values !== 'object' ? {} : kv.values;
      var toupdate = {values: newvals};
		    toupdate.values[lastpart.key] = lastpart.id;
		    Waterplace.update(kv._id, {$set: toupdate});
		}
	    }

	    if (lastpart && id) {
		Waterplace.update(lastpart.id, {$set: {parent: id}})
	    }

	    lastpart = {id: id, key: part};
	    if (!self._ref) {
		self._ref = lastpart;
	
	    }
	});
      
	self.ref = function() {
		    return self;
  };
      
   self.name = function(){
     return self._ref.key;
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
		       parent[x.key.split('/').splice(-1)[0]] = obj;
		       $.each(x.values, function(k,v) {
		    var key = k.split('/').splice(-1)[0];
		    $.extend(obj, self.objectify(Waterplace.findOne(v))); 
		});
	    }
	    
	    return parent;
	};

	this.val = function(){
	    return _.values(self.objectify(Waterplace.findOne(self._ref.id)))[0];
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
    
	    var debouncedcb = _.debounce(cb, 0);

	    Waterplace.find().observe({
		  added: function(obj) {
		    // triggered twice if client inserts?
		    var ref = self.ref();
        
		    if (obj && obj.key && obj.key.indexOf(self._ref.key) === 0 && 
			obj.key.split('/').length - 1 === self._ref.key.split('/').length) {
			setTimeout(function(){
			    what === 'child_added' && cb(new WP(obj.key));
			},0);
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
    
    


  Meteor.startup(function() {
   });

}

if (Meteor.isServer) {
    
}
