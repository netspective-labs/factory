export async function describeModule(depsSupplier, testDepsSupplier) {
    const { registerBadgenBadgeCE } = await depsSupplier();
    const { assert, testContainerElemSupplier } = await testDepsSupplier();
    const testContainer = testContainerElemSupplier();
    const syntheticElementName = "auto-badge";

    describe(`custom element '${syntheticElementName}'`, function () {
        const elemConstructors = Array.from(registerBadgenBadgeCE(syntheticElementName));

        it('registration generates custom element constructor', function () {
            assert.equal(1, elemConstructors.length);
        })

        describe('custom element pattern creation', function () {
            it('creates from document.createElement', function () {
                const el = document.createElement(syntheticElementName);
                assert.equal(syntheticElementName.toUpperCase(), el.nodeName);
            })

            it('creates from constructor', function () {
                const [factory] = elemConstructors;
                const el = new factory()
                assert.equal(syntheticElementName.toUpperCase(), el.nodeName);
            })
        })

        describe('after DOM insertion', function () {
            beforeEach(function () {
                testContainer.innerHTML = `<${syntheticElementName}></${syntheticElementName}>`;
            })

            afterEach(function () {
                testContainer.innerHTML = '';
            })

            it('produces', function () {
                const ce = document.querySelector(syntheticElementName);
                assert(ce);
            })
        })
    })
}
