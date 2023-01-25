# ServiceBus for unified type-safe user agent (browser) and server messages

Resource Factory's `ServiceBus` library provides a User Agent (e.g. browser or mobile) client-side _service bus_ for sending and receiving RPC, EventSource, and WebSocket messages. The important thing is that Typescript is used to define type-safe _services_ that can be consumed and served with the same Typescript code on *both* the _client_ (user agent or browser) _and server_.

## Strategy

The `ServiceBus` is basically a service listeners aggregator that allows observability of all outgoing and incoming messages. It's not meant to any of the actual communications work. Instead, it generalizes and aggregates `fetch`, `EventSource`, and `WebSocket` messages. All underlying work for each of remote procedure calls (RPC using `fetch`), server-sent events (SSE using `EventSource`) and sockets (WS using `WebSocket`) should be handled through composition and not inheritance. 

`ServiceBus` should remain an aggregator of different communication modalities like RPC, SSE, and WS and delegate the actual work to the browser's own libraries or facades for those librarys like our `EventSourceTunnel` and `WebSocketTunnel` wrappers do. `ServiceBus` uses EventTarget which means it's a small, convenience and type-safety, layer on top of `*.addEventListener` and `*.dispatchEvent` rather than inventing new approaches to observability.

## Structure

These directories exist:

* `core` -- the code for connecting, reconnecting, and managing the event listeners for all services
* `assurance` -- 


## TODO

* When doing connection validate consider sending user agent fingerprinting during ping operations so that it can be used for client provenance.
* For all modalities where we are sending messages (e.g. `fetch` or `WebSocket`) implement `transactionID` and `clientProvenance` so that we can tell who sent a message and should be receiving payloads. 
* In `ServiceBus.observeSolicitedPayload` add web sockets' send/receive when a receive is expected after a send event - need way to track sender/receiver asynchronously. `observeSolicitedPayload` is easy for fetch since we make the call ourselves and expect a response ourselves.
* We're expecting all `WebSocket` traffic to be JSON stringified and JSON parseable -- should we support binary in ServiceBus or leave that out? Should `ServiceBus` really be just for JSON messages?