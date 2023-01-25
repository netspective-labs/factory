export function describeModule(dependencies) {
    const { assert, inspectUrlHttpHeaders } = dependencies;

    describe("mod", () => {
        it("inspectUrlHttpHeaders", () => {
            inspectUrlHttpHeaders({
                onHeaders: (headers) => {
                    assert(headers);
                    assert(typeof headers === "object");
                },
                onHeader: {
                    "content-length": (value, key, alias, url) => {
                        assert(key == "content-length");
                        assert(value > 0);
                        assert(alias == "contentLength");
                        assert(url);
                    },
                    "contentLength": (value, key, alias, url) => {
                        assert(key == "contentLength");
                        assert(value > 0);
                        assert(alias == "content-length");
                        assert(url);
                    },
                }
            });
        });
    });
}
