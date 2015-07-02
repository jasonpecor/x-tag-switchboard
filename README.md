# x-tag-switchboard
A mixin for managing application-wide events for x-tags

## Why does this exist

It is often necessary for x-tag custom elements to communicate with each other in an application.  Having one element call the method of, or change the property or attribute of another element is messy.  Such tight coupling of elements can quickly lead to JavaScript errors, maintenance headaches (`.parentNode.parentNode.firstChild...`), and memory leaks as elements are added and removed from the page.

An events mechanism is the most obvious solution, and HTML and x-tags already provide almost all of the functionality we need.  The missing piece is a central place to coordinate interface-wide events.

The **x-tag-switchboard** mixin adds this missing piece.  When added to a project, the 'switchboard' mixin will become available to all of your x-tag definitions, as will the `xtag.switchboard` object, which gives you access to the switchboard API.

## Bower

You can add the `x-tag-switchboard` mixin as a dependency using bower.
```
bower install --save x-tag-switchboard
```

## Usage

The switchboard mixin aims to use as much of the native x-tag functionality as possible to simplify its usage.  Here we will cover how to send an event to the switchboard, and how to listen for an event from the switchboard in your element.

### Sending Events

In this example, we will define a `<menu-button>` element, and have it transmit a "menu.toggle" event to the switchboard.  Note that this element does not use the "x-tag-switchboard" mixin.  If an element only sends events to the switchboard, it does not need the mixin.

> _See "Receiving Events" to learn when to use the mixin_

```javascript
xtag.register('menu-button', {
  events: {
    'tap': function () {
      xtag.switchboard.transmit('menu.toggle'); // send "menu.toggle" event to switchboard
    }
  }
});
```

Switchboard events are standard HTML `Event` or `CustomEvent` objects.  You can set standard event properties on any event sent to the switchboard.  In this example we will send a "nickname.changed" event, with some detail about the event.

```javascript
xtag.switchboard.transmit('nickname.changed', {
  bubbles: false,
  cancelable: true,
  detail: {oldName: "fred", newName: "strongbad"}
});
```
### Receiving Events

In order for your x-tag elements to be able to receive switchboard events, they will need to use the "switchboard" mixin. In the `created` lifecycle function, you need to "patch" into the events in which your element is interested.  When your element is inserted into the DOM, it will automatically be connected to the switchboard, and notified of any patched events.  Likewise, when your element is removed from the DOM, it will be automatically disconnected from the switchboard.  The mixin will automatically connect, disconnect, and reconnect your element to the switchboard as needed.

Once your element is "patched" into the switchboard, you need to set up an event listener for that patched event.  To do this, use the standard x-tag `events` object when registering the element.

In this example, we define a `<chatroom-user>` element, which listens for a "nickname.change" event.  When received, it will update itself appropriately.

```javascript
xtag.register('chatroom-user', {
  mixins: ['switchboard'], // <- use the mixin to receive switchboard events
  lifecycle: {
    created: function () {
      this.switchboard.patch(this, 'nickname.change'); // <- patch into 'nickname.change' event
    }
  },
  events: {
    'nickname.change': function (e) {
      this.textContent = e.detail.newName;
    }
  }
});
```

You can patch in multiple events.

```javascript
this.switchboard.patch(this, 'nickname.change'); // single patch
this.switchboard.patch(this, ['status.change', 'font.change', 'message.received']); // multi patch
this.switchboard.patch(this, 'kicked.by-server'); // add another single patch
```

You can also unpatch events, in order to stop receiving events from the switchboard.  In this example, we will define a `<chat-window>` element that listens for 'message.received' and 'kicked.by-server' events.  When it gets a 'kicked.by-server' event, it will unpatch the 'message.received' event, so the element will no longer receive this type of event.

```javascript
xtag.register('chat-window', {
  mixins: ['switchboard'],
  lifecycle: {
    created: function () {
      this.switchboard.patch(this, [
        'message.received',
        'kicked.by-server'
      ]);
    }
  },
  events: {
    'message.received': function (e) {
      // add message to chat window
      this.textContent += e.detail.nickname + ': ' + e.detail.message + '<br>';
    },
    'kicked.by-server': function (e) {
      alert("KICKED!\n" + e.detail.reason);
      // user was kicked, use "unpatch" stop listening for message.received events
      this.switchboard.unpatch(this, 'message.received');
    }
  }
});
```
You can unpatch an element from *all* events at the same time by calling `.unpatch()` with no arguments.
```javascript
this.switchboard.unpatch();
```

### Other HTML Elements

You can use the switchboard with standard elements like `<button>` by doing the following.

```javascript
var btn = document.querySelector('button#pay-now');

xtag.switchboard.patch(btn, 'payment.submitted');
xtag.switchboard.connect(btn);

// disable "pay now" button once 'payment.submitted' event is heard

xtag.addEvent(btn, 'payment.submitted', function (e) {
  this.disabled = true;
});

xtag.switchboard.transmit('payment.submitted'); // button will react by disabling itself
```
> _**IMPORTANT** There is currently no automatic connect / disconnect for elements which to not use the switchboard mixin.  As such, you will need to manually call `xtag.switchboard.disconnect(element)` before a connected element is disposed of, otherwise you will get memory leaks.  This may be remedied in future using MutationObservers, but for now, be careful._

### Any Object

You can actually use switchboard with _any_ object.  This allows your x-tag elements to communicate with any object in your application, and vice-versa.  This allows you to avoid any tight-coupling between your front-end application logic, and the elements in your interface.

In this example, we'll create a (fairly crude) object to send and receive chat messages via a WebSocket.

```javascript
(function chat() {
  var socket = new WebSocket('wss://chat.server');
  
  // when a message is received from the server via the socket, 
  // transmit it to UI via the switchboard
  
  socket.onmessage = function (m) {
    xtag.switchboard.transmit('message.received', { detail: message: m.data }});
  };
  
  // handle messages from user
  
  xtag.switchboard.patch(this, 'message.send'); // patch the chat function `this`
  xtag.switchboard.connect(this); // connect
  
  // listen for 'message.send' events from the UI via the switchboard,
  // and send the message to the server via the socket
  
  this.addEventListener('message.send', function (e) {
    socket.send(e.detail.message);
  });
  
  // NOTE: `this` has had the standard HTML events API mixed into it by .patch()
  // That is why you can call this.addEventListener() here.
  // You can also use xtag.addEvent() and xtag.fireEvent on standard objects 
  // which have been patched in this way.
  
  socket.connect();

}());
```

### Disable Switchboard

You can enable and disable all switchboard events application-wide.  You may want to do this when some critical error occurs.

```javascript
// disable events
xtag.switchboard.online = false;

// enable events
xtag.switchboard.online = true;
```

### Debugging

You can view all active connections to the switchboard by doing the following in the console.
```javascript
xtag.switchboard.showConnections()
```
