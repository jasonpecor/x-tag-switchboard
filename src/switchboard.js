xtag.mixins.switchboard = (function () {
	"use strict";
	
	var connections = {},	// connection pools
		online = true;		// switchboard online
	
	// Add a connection to an event pool
	
	function addConnection(evt, element) {
		if (!connections[evt])
			connections[evt] = [];
		
		if (connections[evt].indexOf(element) === -1)
			connections[evt].push(element);
	}
	
	// Remove a connection from an event pool
	
	function removeConnection(evt, element) {
		if (!connections[evt]) return false;
		var i = connections[evt].indexOf(element);
		if (i === -1) return false;
		connections[evt].splice(i,1);
		return true;
	}
	
	// Switchboard API
	
	var api = {
		patch: function (element, events) {
			// prepare certain events to be patched into the switchboard for this element
			if (typeof events === 'string')
				element._patches.push(events);
			else if (events instanceof Array)
				element._patches = element._patches.concat(events);
			else
				throw new TypeError("Cannot patch event: Must be string or array of strings");
		},
		connect: function (element) {
			// connect the element to the switchboard
			if (!element._patches) return;
			
			var n = element._patches.length;
			
			for (var i = 0; i < n; i++)
				addConnection(element._patches[i], element);				
		},
		disconnect: function (element) {
			if (!element._patches) return;
			
			var n = element._patches.length;
			
			for (var i = 0; i < n; i++)
				removeConnection(element._patches[i], element);				
		},
		unpatch: function (element, events) {
			if (events) {
				var n = events.length;
				for (var i = 0; i < n; i++) {
					var x = element._patches.indexOf(events[i]);
					if (x !== -1) {
						element._patches.splice(x, 1);
						if (element.parentNode)
							removeConnection(events[i], element);
					}
				}
			} else {
				if (element.parentNode)
					api.disconnect(element);
				element._patches = [];
			}
		},
		transmit: function (evt, options) {
			// no sender means anonymous
			if (!online) return 0;
			if (!connections[evt]) return 0;
			
			var n = connections[evt].length;
			
			for (var i = 0; i < n; i++)
				xtag.fireEvent(connections[evt][i], evt, options);

			return n;
		},
		get online() {
			return online;
		},
		set online(v) {
			online = !!v;
		},
		get connections() { // TODO: REMOVE THIS!!!
			return connections;
		}
	};
	
	// Make Switchboard API globally available
	
	xtag.switchboard = api;

	// Define switchboard mixin for x-tag
	
	var mixin = {
		lifecycle: {
			created: function () {
				
				Object.defineProperty(this, 'switchboard', {
					value: api,
					writable: false,
					enumerable: false
				});
				
				Object.defineProperty(this, '_patches', {
					value: [],
					enumerable: false,
					writable: true
				});
			},
			inserted: function () {
				this.switchboard.connect(this);
			},
			removed: function () {
				this.switchboard.disconnect(this);
			}
		}
	};
	
	return mixin;
}());
				