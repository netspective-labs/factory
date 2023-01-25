# Remote SQL Module Execution Library

This library is used by both the client and server side - servers ("server
runtime" or "SR") allow definitions of multiple inventories of remotely
executable SQL statements. They can be executed safely by identity and "bind
params" (type-safe arguments passing), when user agents cannot be trusted or can
allow arbitrary code execution in case user agents are trusted.

It's important to keep governance of interfaces and types properly separated so
that user agents can receive TS-emitted JS code that doesn't contain unsafe
content.

# TODO

- Create cloudquery.io proxy to allow easy access to Cloud resources through
  SQL.
- Use techniques like
  [this](https://www.techrepublic.com/article/run-a-single-command-on-multiple-linux-machines/amp/)
  to run SQL proxies like `osqueryi` across mutliple machines and collect
  results. We could treat any SQL proxy as multi-machine executable through SSH.
