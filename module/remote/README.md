# Remote Typescript and Javascript Module Execution Library

This library is used by both the client and server side - servers ("server 
runtime" or "SR") allow definitions of multiple inventories of remotely
executable Typescript and Javascript. They can be executed safely by identity
and "bind params" (type-safe arguments passing), when user agents cannot be
trusted or can allow arbitrary code execution in case user agents are trusted.

It's important to keep governance of interfaces and types properly separated so
that user agents can receive TS-emitted JS code that doesn't contain unsafe
content.
