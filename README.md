# Netspective Labs Factory

Sub-modules in this library (e.g. `cache`, `sql`, `git`, etc.) should generally
be independent of each other as well, keeping dependencies to a minimum.

The purpose of _The Factory_ is to eliminate dependencies by writing minimal,
testable, helpers without unnecessarily relying on 3rd party libraries. For
simple to medium complexity requirements, it's better to write our own (well
tested) code instead of relying on 3rd parties. For high complexity code or
widely used dependencies with many contributors it's great to use 3rd party
libraries.