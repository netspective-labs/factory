# Web-friendly route management library

This library is useful if your web routes are dynamically generated in memory,
extracted from a database, or read from file system routes. It can be used to
mimic the behavior of modern static site generators (SSGs) but is also useful in
more general-purpose use cases.

Terminology:

- Route Unit. A _unit_ is a single path entry
- Route. A _route_ is a complete route with multiple _units_.
- Route Tree. A _tree_ is a hierarchical set of routes.

# TODO

- [ ] `../fs/fs-route.ts` canonical should be `./fs-route-parse.ts` -- right
      now, other libraries are using `../fs/fs-route.ts` and should be updated
- [ ] use `route-tree_test.sh` to generate fs routes dynamically and execute
      tests
